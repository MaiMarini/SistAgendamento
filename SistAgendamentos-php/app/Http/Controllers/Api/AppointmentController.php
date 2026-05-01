<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateAppointmentRequest;
use App\Http\Requests\UpdateAppointmentRequest;
use App\Mail\AppointmentNotificationMail;
use App\Mail\AppointmentReminderMail;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Company;
use App\Models\Professional;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class AppointmentController extends Controller
{
    /**
     * GET /api/appointments?date_from=&date_to=&status=
     *
     * Auto-complete: appointments 'scheduled'/'confirmed' com ends_at < now()
     * são automaticamente migrados para 'completed' (mesma lógica do Python).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $companyId = $user->effectiveCompanyId();
        $professionalId = $user->isProfessional() ? $user->id : null;

        // Auto-complete passados
        $this->autoCompleteExpired($companyId);

        $query = Appointment::where('company_id', $companyId);

        if ($professionalId) {
            $query->where('professional_id', $professionalId);
        }

        if ($dateFrom = $request->query('date_from')) {
            $query->where('starts_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->query('date_to')) {
            $query->where('starts_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $appointments = $query->orderBy('starts_at')->get();

        return response()->json($appointments);
    }

    /**
     * POST /api/appointments
     *
     * Calcula ends_at = starts_at + duration_minutes.
     * Denormaliza dados do cliente. Envia notificação se aplicável.
     */
    public function store(CreateAppointmentRequest $request): JsonResponse
    {
        $user = $request->user();
        $companyId = $user->effectiveCompanyId();
        $durationMinutes = $request->input('duration_minutes', 60);

        $startsAt = Carbon::parse($request->starts_at);
        $endsAt = $startsAt->copy()->addMinutes($durationMinutes);

        // Dados do cliente (denormalizados)
        $clientName = $request->client_name;
        $clientEmail = $request->client_email;
        $clientPhone = $request->client_phone;
        $clientCpf = $request->client_cpf;

        // Se client_id fornecido, puxar dados mais atualizados
        $clientId = $request->client_id;
        $client = null;
        if ($clientId) {
            $client = Client::where('id', $clientId)
                ->where('company_id', $companyId)
                ->first();
            if ($client) {
                $clientName = $client->name;
                $clientEmail = $client->email ?? $clientEmail;
                $clientPhone = $client->phone ?? $clientPhone;
                $clientCpf = $client->cpf ?? $clientCpf;
            }
        }

        $appointment = Appointment::create([
            'company_id'      => $companyId,
            'professional_id' => $request->professional_id,
            'client_id'       => $clientId,
            'service_id'      => $request->service_id,
            'client_name'     => $clientName,
            'client_email'    => $clientEmail,
            'client_phone'    => $clientPhone,
            'client_cpf'      => $clientCpf,
            'starts_at'       => $startsAt,
            'ends_at'         => $endsAt,
            'status'          => 'scheduled',
            'notes'           => $request->notes,
        ]);

        // Enviar notificação por email se aplicável
        $this->sendNotificationIfApplicable($appointment, $client, $companyId);

        return response()->json($appointment, 201);
    }

    /**
     * PATCH /api/appointments/{appointmentId}
     *
     * Se starts_at mudou, recalcula ends_at.
     */
    public function update(string $appointmentId, UpdateAppointmentRequest $request): JsonResponse
    {
        $appointment = $this->findAppointment($appointmentId);
        if (! $appointment) {
            return response()->json(['message' => 'Agendamento não encontrado.'], 404);
        }

        $data = $request->validated();

        // Recalcular ends_at se starts_at ou duration_minutes mudou
        if (isset($data['starts_at'])) {
            $startsAt = Carbon::parse($data['starts_at']);
            $duration = $data['duration_minutes']
                ?? Carbon::parse($appointment->starts_at)->diffInMinutes($appointment->ends_at);
            $data['ends_at'] = $startsAt->copy()->addMinutes($duration);
            unset($data['duration_minutes']);
        } elseif (isset($data['duration_minutes'])) {
            $data['ends_at'] = Carbon::parse($appointment->starts_at)
                ->addMinutes($data['duration_minutes']);
            unset($data['duration_minutes']);
        }

        $appointment->update($data);

        return response()->json($appointment->fresh());
    }

    /**
     * DELETE /api/appointments/{appointmentId}/notes
     *
     * Limpa o campo notes.
     */
    public function clearNotes(string $appointmentId): JsonResponse
    {
        $appointment = $this->findAppointment($appointmentId);
        if (! $appointment) {
            return response()->json(['message' => 'Agendamento não encontrado.'], 404);
        }

        $appointment->update(['notes' => null]);

        return response()->json($appointment->fresh());
    }

    /**
     * POST /api/companies/me/reminders/process
     *
     * Processa lembretes para todas as empresas com reminder_hours_before > 0.
     * Porta fiel do process_appointment_reminders do Python.
     *
     * Chamar via cron job (ex: a cada hora) no cPanel da HostGator.
     */
    public function processReminders(): JsonResponse
    {
        $companies = Company::where('reminder_hours_before', '>', 0)->get();
        $pending = [];

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

                // Marcar como enviado imediatamente (deduplicação)
                $appt->update(['reminder_sent' => true]);

                // Enfileirar email
                Mail::to($appt->client_email)->send(
                    new AppointmentReminderMail(
                        $appt->client_name,
                        $appt->starts_at->toISOString(),
                        $professionalName,
                        $company->name,
                    )
                );

                $pending[] = [
                    'appointment_id'    => $appt->id,
                    'client_name'       => $appt->client_name,
                    'client_email'      => $appt->client_email,
                    'professional_name' => $professionalName,
                ];
            }
        }

        return response()->json(['sent' => count($pending)]);
    }

    // =========================================================================
    // PRIVATE
    // =========================================================================

    private function findAppointment(string $id): ?Appointment
    {
        return Appointment::where('id', $id)
            ->where('company_id', request()->user()->effectiveCompanyId())
            ->first();
    }

    /**
     * Auto-complete: appointments 'scheduled'/'confirmed' com ends_at passado
     * viram 'completed'.
     */
    private function autoCompleteExpired(string $companyId): void
    {
        Appointment::where('company_id', $companyId)
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->where('ends_at', '<', Carbon::now())
            ->update(['status' => 'completed']);
    }

    /**
     * Envia email de notificação ao cliente se aplicável.
     */
    private function sendNotificationIfApplicable(
        Appointment $appointment,
        ?Client $client,
        string $companyId,
    ): void {
        if (! $client || ! $client->notifications_enabled) {
            return;
        }

        $email = $client->notificationEmail();
        if (! $email) {
            return;
        }

        $professionalName = Professional::find($appointment->professional_id)?->name ?? '';
        $companyName = Company::find($companyId)?->name ?? '';

        Mail::to($email)->send(
            new AppointmentNotificationMail(
                $appointment->client_name,
                $appointment->starts_at->toISOString(),
                $professionalName,
                $companyName,
            )
        );
    }
}
