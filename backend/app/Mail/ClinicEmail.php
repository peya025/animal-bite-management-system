<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ClinicEmail extends Mailable
{
    public function __construct(public string $heading, public array $lines, public ?string $actionUrl = null, public string $actionLabel = 'Open account', public ?string $activationCode = null)
    {
        if (preg_match('/[\r\n]/', $heading)) {
            throw new \InvalidArgumentException('Invalid email subject');
        }
        if ($actionUrl !== null && (! filter_var($actionUrl, FILTER_VALIDATE_URL) || ! in_array(parse_url($actionUrl, PHP_URL_SCHEME), ['https', 'http'], true)
            || (app()->isProduction() && parse_url($actionUrl, PHP_URL_SCHEME) !== 'https'))) {
            throw new \InvalidArgumentException('Invalid application URL');
        }
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->heading);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.clinic', text: 'emails.clinic-text');
    }
}
