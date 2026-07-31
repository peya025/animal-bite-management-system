<?php

namespace App\Mail;

use App\Models\StaffInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StaffInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public StaffInvitation $invitation;
    public string $invitationLink;

    public function __construct(StaffInvitation $invitation)
    {
        $this->invitation = $invitation;
        $this->invitationLink = config('app.frontend_url') . '/accept-invitation/' . $invitation->token;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Staff Invitation - ' . $this->invitation->clinic->name,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.staff-invitation',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
