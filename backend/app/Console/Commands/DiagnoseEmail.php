<?php

namespace App\Console\Commands;

use App\Services\Messaging\SmtpEmailService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class DiagnoseEmail extends Command
{
    protected $signature = 'email:diagnose {--connect : Attempt TLS and authentication without sending an email}';

    protected $description = 'Report safe email configuration categories (never prints secrets)';

    public function handle(SmtpEmailService $service): int
    {
        $error = $service->configurationError();
        $this->line('SMTP configuration: '.($error ?? 'ready'));
        $this->line('Email channel: '.(config('messaging.email_enabled') ? 'enabled' : 'disabled'));
        $this->line('Recipient policy: '.(config('messaging.test_mode') ? 'allowlist only' : 'live'));
        if ($error) {
            return self::FAILURE;
        }
        if ($this->option('connect')) {
            try {
                $transport = Mail::mailer()->getSymfonyTransport();
                $transport->start();
                $transport->stop();
                $this->info('TLS/authentication connection succeeded. No email sent; mailbox receipt not verified.');
            } catch (\Throwable $e) {
                $this->error($service->failure($e)->error);

                return self::FAILURE;
            }
        }

        return self::SUCCESS;
    }
}
