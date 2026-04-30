<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RegistrationConfirmationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $companyName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Cadastro confirmado — Sistema de Agendamentos',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.registration-confirmation',
            with: [
                'companyName' => $this->companyName,
                'frontendUrl' => env('FRONTEND_URL', 'http://localhost:8081'),
            ],
        );
    }
}
