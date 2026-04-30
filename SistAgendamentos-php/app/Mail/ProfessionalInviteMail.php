<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProfessionalInviteMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $professionalName,
        public string $companyName,
        public string $inviteLink,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Você foi convidado — {$this->companyName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.professional-invite',
            with: [
                'professionalName' => $this->professionalName,
                'companyName'      => $this->companyName,
                'inviteLink'       => $this->inviteLink,
            ],
        );
    }
}
