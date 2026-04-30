<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Availability;
use App\Models\TimeBlock;
use Carbon\Carbon;

/**
 * Porta fiel dos algoritmos get_available_slots e get_month_availability
 * do controllers.py Python original.
 */
class AvailabilityService
{
    /**
     * Retorna lista de horários livres (["09:00", "09:30", ...]) para um
     * profissional numa data específica.
     *
     * Algoritmo (idêntico ao Python):
     *   1. Buscar availability windows para o dia da semana
     *   2. Buscar appointments existentes (não cancelados) na data
     *   3. Buscar time_blocks (recorrentes + one-time sobrepostos)
     *   4. Mesclar busy periods (appointments + blocks)
     *   5. Iterar cada window gerando slots a cada `duration` minutos
     *   6. Pular slots que colidem com busy periods ou que já passaram (se hoje)
     */
    public function getAvailableSlots(
        string $professionalId,
        string $companyId,
        string $dateStr,
        int $durationMinutes = 60,
    ): array {
        $targetDate = Carbon::parse($dateStr)->startOfDay();
        $dayOfWeek = ($targetDate->dayOfWeekIso % 7); // Carbon: 1=Mon..7=Sun → 0=Mon..6=Sun
        $dayOfWeek = $targetDate->dayOfWeekIso === 7 ? 6 : $targetDate->dayOfWeekIso - 1;

        // 1. Availability windows for this weekday
        $windows = Availability::where('professional_id', $professionalId)
            ->where('day_of_week', $dayOfWeek)
            ->where('active', true)
            ->get();

        if ($windows->isEmpty()) {
            return [];
        }

        // 2. Existing appointments on this date (non-cancelled)
        $appointments = Appointment::where('professional_id', $professionalId)
            ->where('status', '!=', 'cancelled')
            ->whereDate('starts_at', $targetDate)
            ->get();

        // 3. Time blocks
        $blocks = TimeBlock::where('professional_id', $professionalId)->get();

        // Build busy periods
        $busy = $this->buildBusyPeriods($appointments, $blocks, $targetDate);

        // 4. Generate slots
        $now = Carbon::now();
        $isToday = $targetDate->isSameDay($now);
        $slots = [];

        foreach ($windows as $window) {
            $windowStart = $this->timeToMinutes($window->start_time);
            $windowEnd = $this->timeToMinutes($window->end_time);
            $current = $windowStart;

            while ($current + $durationMinutes <= $windowEnd) {
                $slotEnd = $current + $durationMinutes;

                // Skip past slots if today
                if ($isToday && $current <= $this->timeToMinutes($now->format('H:i'))) {
                    $current += $durationMinutes;
                    continue;
                }

                // Check overlap with busy periods
                $overlap = false;
                $earliestEnd = $slotEnd;
                foreach ($busy as [$busyStart, $busyEnd]) {
                    if ($current < $busyEnd && $slotEnd > $busyStart) {
                        $overlap = true;
                        $earliestEnd = max($earliestEnd, $busyEnd);
                    }
                }

                if (! $overlap) {
                    $slots[] = $this->minutesToTime($current);
                    $current += $durationMinutes;
                } else {
                    // Jump past the blocking period
                    $current = $earliestEnd;
                }
            }
        }

        sort($slots);
        return array_values(array_unique($slots));
    }

    /**
     * Retorna status por dia do mês: {"2024-03-01": "past", "2024-03-02": "available", ...}
     *
     * Status possíveis: past, day_off, available, fully_booked
     *
     * Usa 4 queries bulk (não 30+).
     */
    public function getMonthAvailability(
        string $professionalId,
        string $companyId,
        int $year,
        int $month,
        int $durationMinutes = 60,
    ): array {
        $startOfMonth = Carbon::create($year, $month, 1)->startOfDay();
        $endOfMonth = $startOfMonth->copy()->endOfMonth()->endOfDay();
        $today = Carbon::today();

        // Bulk queries
        $allAvailabilities = Availability::where('professional_id', $professionalId)
            ->where('active', true)
            ->get()
            ->groupBy('day_of_week');

        $allAppointments = Appointment::where('professional_id', $professionalId)
            ->where('status', '!=', 'cancelled')
            ->where('status', '!=', 'no_show')
            ->whereBetween('starts_at', [$startOfMonth, $endOfMonth])
            ->get()
            ->groupBy(fn ($a) => $a->starts_at->format('Y-m-d'));

        $allBlocks = TimeBlock::where('professional_id', $professionalId)->get();

        $result = [];
        $current = $startOfMonth->copy();

        while ($current->month === $month) {
            $dateKey = $current->format('Y-m-d');

            if ($current->lt($today)) {
                $result[$dateKey] = 'past';
                $current->addDay();
                continue;
            }

            $dayOfWeek = $current->dayOfWeekIso === 7 ? 6 : $current->dayOfWeekIso - 1;
            $windows = $allAvailabilities->get($dayOfWeek, collect());

            if ($windows->isEmpty()) {
                $result[$dateKey] = 'day_off';
                $current->addDay();
                continue;
            }

            // Build busy periods for this day
            $dayAppointments = $allAppointments->get($dateKey, collect());
            $busy = $this->buildBusyPeriods($dayAppointments, $allBlocks, $current);

            // Check if at least 1 slot is free
            $hasSlot = false;
            $now = Carbon::now();
            $isToday = $current->isSameDay($now);

            foreach ($windows as $window) {
                $windowStart = $this->timeToMinutes($window->start_time);
                $windowEnd = $this->timeToMinutes($window->end_time);
                $cur = $windowStart;

                while ($cur + $durationMinutes <= $windowEnd) {
                    $slotEnd = $cur + $durationMinutes;

                    if ($isToday && $cur <= $this->timeToMinutes($now->format('H:i'))) {
                        $cur += $durationMinutes;
                        continue;
                    }

                    $overlap = false;
                    $earliestEnd = $slotEnd;
                    foreach ($busy as [$bs, $be]) {
                        if ($cur < $be && $slotEnd > $bs) {
                            $overlap = true;
                            $earliestEnd = max($earliestEnd, $be);
                        }
                    }

                    if (! $overlap) {
                        $hasSlot = true;
                        break 2;
                    }
                    $cur = $earliestEnd;
                }
            }

            $result[$dateKey] = $hasSlot ? 'available' : 'fully_booked';
            $current->addDay();
        }

        return $result;
    }

    /**
     * Constrói lista de períodos ocupados a partir de appointments + time_blocks.
     * Retorna array de [startMinutes, endMinutes].
     */
    private function buildBusyPeriods($appointments, $blocks, Carbon $targetDate): array
    {
        $busy = [];

        // Appointments
        foreach ($appointments as $a) {
            $start = Carbon::parse($a->starts_at);
            $end = Carbon::parse($a->ends_at);
            $busy[] = [
                $this->timeToMinutes($start->format('H:i')),
                $this->timeToMinutes($end->format('H:i')),
            ];
        }

        // Time blocks
        foreach ($blocks as $b) {
            if ($b->is_recurring) {
                if ($b->recurring_start_time && $b->recurring_end_time) {
                    $busy[] = [
                        $this->timeToMinutes($b->recurring_start_time),
                        $this->timeToMinutes($b->recurring_end_time),
                    ];
                }
            } else {
                if (! $b->starts_at || ! $b->ends_at) {
                    continue;
                }
                $bs = Carbon::parse($b->starts_at);
                $be = Carbon::parse($b->ends_at);
                if ($bs->startOfDay()->lte($targetDate) && $be->startOfDay()->gte($targetDate)) {
                    $st = $bs->isSameDay($targetDate) ? $this->timeToMinutes($bs->format('H:i')) : 0;
                    $et = $be->isSameDay($targetDate) ? $this->timeToMinutes($be->format('H:i')) : 24 * 60 - 1;
                    $busy[] = [$st, $et];
                }
            }
        }

        return $busy;
    }

    /**
     * "09:30" → 570
     */
    private function timeToMinutes(string $time): int
    {
        $parts = explode(':', substr($time, 0, 5));
        return (int) $parts[0] * 60 + (int) $parts[1];
    }

    /**
     * 570 → "09:30"
     */
    private function minutesToTime(int $minutes): string
    {
        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }
}
