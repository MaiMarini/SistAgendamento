<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentNotificationMail extends Mailable implements ShouldQueue
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
        [$this->dateStr, $this->timeStr] = self::formatDateTimePt($startsAtIso);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Agendamento confirmado — {$this->companyName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.appointment-notification',
        );
    }

    public static function formatDateTimePt(string $iso): array
    {
        $days = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];
        $months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                   'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

        $dt = new \DateTime($iso);
        $dayOfWeek = (int) $dt->format('N') - 1; // 0=Mon..6=Sun
        $dateStr = $days[$dayOfWeek] . ', ' . $dt->format('j') . ' de ' . $months[(int) $dt->format('n') - 1] . ' de ' . $dt->format('Y');
        $timeStr = $dt->format('H:i');

        return [$dateStr, $timeStr];
    }
}
