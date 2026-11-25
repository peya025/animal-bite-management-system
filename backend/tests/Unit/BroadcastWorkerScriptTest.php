<?php

namespace Tests\Unit;

use Tests\TestCase;

class BroadcastWorkerScriptTest extends TestCase
{
    public function test_broadcast_worker_script_is_restricted_to_broadcasts_queue_and_guards_pcntl(): void
    {
        $scriptPath = base_path('railway/run-broadcast-worker.sh');
        $this->assertFileExists($scriptPath);

        $content = file_get_contents($scriptPath);
        $this->assertNotFalse($content);

        // Must remain strictly restricted to the broadcasts queue and expected worker flags
        $this->assertStringContainsString(
            'exec php artisan queue:work "${CONNECTION}" --queue=broadcasts --sleep=3 --tries=3 --timeout=60 --max-time=3600',
            $content
        );

        // Must never execute against notifications or default queues
        $execLines = array_values(array_filter(
            preg_split('/\R/', $content) ?: [],
            fn (string $line): bool => str_starts_with(trim($line), 'exec ')
        ));
        $this->assertCount(1, $execLines);
        $this->assertStringNotContainsString('notifications', $execLines[0]);
        $this->assertStringNotContainsString('default', $execLines[0]);

        // Must fail fast if persistent queue connection is not configured
        $this->assertStringContainsString('sync|null', $content);

        // Must fail fast if PHP PCNTL timeout enforcement primitives are missing
        $this->assertStringContainsString('extension_loaded("pcntl")', $content);
        $this->assertStringContainsString('function_exists("pcntl_alarm")', $content);
        $this->assertStringContainsString('function_exists("pcntl_signal")', $content);
        $this->assertStringContainsString('function_exists("pcntl_async_signals")', $content);
        $this->assertStringContainsString('RAILPACK_PHP_EXTENSIONS=pcntl', $content);
    }
}
