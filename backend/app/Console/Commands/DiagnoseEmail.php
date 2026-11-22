<?php

namespace App\Console\Commands;

use App\Services\Messaging\BrevoEmailService;
use App\Services\Messaging\EmailTransportInterface;
use App\Services\Messaging\SmtpEmailService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class DiagnoseEmail extends Command
{
    protected $signature = 'email:diagnose {--connect : Attempt an SMTP TLS handshake without sending (SMTP transport only)}';

    protected $description = 'Report email transport configuration status (never prints secrets)';

    public function handle(): int
    {
        $transport = app(EmailTransportInterface::class);
        $isBrevo   = $transport instanceof BrevoEmailService;
        $isSmtp    = $transport instanceof SmtpEmailService;

        $this->line('Active transport : '.($isBrevo ? 'Brevo HTTP API' : ($isSmtp ? 'SMTP (Symfony Mailer)' : get_class($transport))));
        $this->line('Email channel    : '.(config('messaging.email_enabled') ? 'enabled' : 'disabled'));
        $this->line('Recipient policy : '.(config('messaging.test_mode') ? 'allowlist only' : 'live'));

        // ── Transport-specific configuration check ──────────────────────────
        $error = $transport->configurationError();

        if ($isBrevo) {
            $this->line('Brevo config     : '.($error ?? 'ready'));
            $this->line('Sender email     : '.(empty(config('services.brevo.sender_email')) ? '(not set)' : '(set)'));
            $this->line('API key          : '.(empty(config('services.brevo.key')) ? '(not set)' : '(set)'));

            if ($error) {
                $this->error('Brevo transport is misconfigured: '.$error);

                return self::FAILURE;
            }

            $this->info('Brevo transport is ready. No network test available from the CLI — verify by sending a test invitation.');

            return self::SUCCESS;
        }

        if ($isSmtp) {
            $this->line('SMTP config      : '.($error ?? 'ready'));

            if ($error) {
                $this->error('SMTP transport is misconfigured: '.$error);

                return self::FAILURE;
            }

            if ($this->option('connect')) {
                try {
                    $symfonyTransport = Mail::mailer()->getSymfonyTransport();
                    $symfonyTransport->start();
                    $symfonyTransport->stop();
                    $this->info('TLS/authentication handshake succeeded. No email was sent; mailbox receipt not verified.');
                } catch (\Throwable $e) {
                    $this->error(app(SmtpEmailService::class)->failure($e)->error);

                    return self::FAILURE;
                }
            }

            $this->info('SMTP transport is ready.');

            return self::SUCCESS;
        }

        // Unknown transport — report the configuration error if any.
        $this->line('Config error     : '.($error ?? 'none'));
        $this->warn('Unknown transport class: '.get_class($transport));

        return $error ? self::FAILURE : self::SUCCESS;
    }
}
