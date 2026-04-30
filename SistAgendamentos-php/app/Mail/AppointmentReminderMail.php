<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentReminderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public string $dateStr;
    public string $timeStr;

    public function __construct(
        public string $clientName,
        public string $startsAtIso,
        public string $professionalName,
        public string $companyName,
    ) {
        [$this->dateStr, $this->timeStr] = AppointmentNotificationMail::formatDateTimePt($startsAtIso);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Lembrete de agendamento — {$this->companyName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.appointment-reminder',
        );
    }
}
