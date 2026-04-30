<?php

namespace App\Console\Commands;

use App\Mail\AppointmentReminderMail;
use App\Models\Appointment;
use App\Models\Company;
use App\Models\Professional;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Comando para processar lembretes de agendamento via cron.
 *
 * No cPanel da HostGator, configurar cron job:
 *   cd /home/USER/api.kallme.com.br && php artisan reminders:process
 *
 * Frequência recomendada: a cada hora (0 * * * *)
 */
class ProcessReminders extends Command
{
    protected $signature = 'reminders:process';
    protected $description = 'Processa e envia lembretes de agendamento pendentes';

    public function handle(): int
    {
        $companies = Company::where('reminder_hours_before', '>', 0)->get();
        $sent = 0;

        foreach ($companies as $company) {
            $hours = $company->reminder_hours_before;
            $windowStart = Carbon::now()->addHours($hours);
            $windowEnd = $windowStart->copy()->addHour();

            $appointments = Appointment::where('company_id', $company->id)
                ->where('status', 'scheduled')
                ->where('reminder_sent', false)
                ->whereBetween('starts_at', [$windowStart, $windowEnd])
                ->get();

            foreach ($appointments as $appt) {
                if (! $appt->client_email) {
                    continue;
                }

                $professionalName = Professional::find($appt->professional_id)?->name ?? '';

                $appt->update(['reminder_sent' => true]);

                Mail::to($appt->client_email)->queue(
                    new AppointmentReminderMail(
                        $appt->client_name,
                        $appt->starts_at->toISOString(),
                        $professionalName,
                        $company->name,
                    )
                );

                $sent++;
            }
        }

        $this->info("Lembretes enviados: {$sent}");
        return self::SUCCESS;
    }
}
