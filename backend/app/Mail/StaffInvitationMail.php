<?php

namespace App\Mail;

use App\Models\StaffInvitation;

class StaffInvitationMail extends ClinicEmail
{
    public string $invitationLink;

    public function __construct(public StaffInvitation $invitation)
    {
        $this->invitationLink = rtrim(config('app.frontend_url'), '/').'/accept-invitation/'.$invitation->token;
        parent::__construct('Invitation to Join Tagoloan ABTC', [
            'Hello,',
            'You have been invited to join the Tagoloan Animal Bite Treatment Center Management System.',
            'Your assigned role: '.ucwords(str_replace('_', ' ', $invitation->workstation_role ?: $invitation->role)),
            'Activate your account and create your password using the link below.',
            'This invitation will expire on '.$invitation->expires_at->format('F j, Y g:i A T').'.',
            'If you did not expect this invitation, you may ignore this email.',
        ], $this->invitationLink, 'Activate Account');
    }
}
