<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrateStorageToCloud extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'storage:migrate-to-cloud {--force : Overwrite existing files on cloud storage}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Safely copy all local logos, media, and staff signatures to cloud object storage (Cloudflare R2 / S3)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting Cloud File Storage Migration...');

        $destinationDisk = 's3';

        // 1. Verify cloud storage connection
        $this->comment('Verifying cloud storage connection...');
        try {
            $testKey = '_migration_probe_' . time() . '.txt';
            Storage::disk($destinationDisk)->put($testKey, 'probe');
            Storage::disk($destinationDisk)->delete($testKey);
            $this->info('✓ Cloud storage connection successful!');
        } catch (\Throwable $e) {
            $this->error('Failed to connect to cloud storage (' . $destinationDisk . '): ' . $e->getMessage());
            $this->warn('Please check your AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT, and AWS_BUCKET settings.');
            return self::FAILURE;
        }

        $force = (bool) $this->option('force');

        // 2. Migrate Public Disk Assets (Logos, Announcements, Resources)
        $this->newLine();
        $this->comment('Migrating public files (Logos, Announcements, Clinic Resources)...');
        $localPublicDisk = Storage::build([
            'driver' => 'local',
            'root'   => storage_path('app/public'),
        ]);

        $publicDirs = ['clinic-logos', 'clinic-resources', 'announcements'];
        $publicSuccess = 0;
        $publicSkipped = 0;
        $publicFailed = 0;

        foreach ($publicDirs as $dir) {
            $files = $localPublicDisk->allFiles($dir);
            if (empty($files)) {
                $this->line(" - No files found in public directory: {$dir}");
                continue;
            }

            $this->line(" - Found " . count($files) . " file(s) in: {$dir}");
            foreach ($files as $file) {
                try {
                    $exists = Storage::disk($destinationDisk)->exists($file);
                    if ($exists && ! $force) {
                        $publicSkipped++;
                        continue;
                    }

                    $stream = $localPublicDisk->readStream($file);
                    $mime = $localPublicDisk->mimeType($file) ?: 'application/octet-stream';
                    Storage::disk($destinationDisk)->put($file, $stream, [
                        'visibility'  => 'public',
                        'ContentType' => $mime,
                    ]);
                    if (is_resource($stream)) {
                        fclose($stream);
                    }
                    $publicSuccess++;
                } catch (\Throwable $e) {
                    $this->error("Failed to copy {$file}: " . $e->getMessage());
                    $publicFailed++;
                }
            }
        }

        $this->info("✓ Public files migrated: {$publicSuccess} copied, {$publicSkipped} skipped (already on cloud), {$publicFailed} failed.");

        // 3. Migrate Private Staff Signatures
        $this->newLine();
        $this->comment('Migrating private staff signatures...');
        $localSignaturesDisk = Storage::build([
            'driver' => 'local',
            'root'   => storage_path('app/private/staff-signatures'),
        ]);

        $signatureFiles = $localSignaturesDisk->allFiles('signatures');
        $sigSuccess = 0;
        $sigSkipped = 0;
        $sigFailed = 0;

        if (empty($signatureFiles)) {
            $this->line(' - No local signatures found.');
        } else {
            $this->line(' - Found ' . count($signatureFiles) . ' signature file(s).');
            foreach ($signatureFiles as $file) {
                // Destination prefix: private-staff-signatures/signatures/uuid.png
                $destPath = 'private-staff-signatures/' . ltrim($file, '/');
                try {
                    $exists = Storage::disk($destinationDisk)->exists($destPath);
                    if ($exists && ! $force) {
                        $sigSkipped++;
                        continue;
                    }

                    $stream = $localSignaturesDisk->readStream($file);
                    Storage::disk($destinationDisk)->put($destPath, $stream, [
                        'visibility'  => 'private',
                        'ContentType' => 'image/png',
                    ]);
                    if (is_resource($stream)) {
                        fclose($stream);
                    }
                    $sigSuccess++;
                } catch (\Throwable $e) {
                    $this->error("Failed to copy {$file}: " . $e->getMessage());
                    $sigFailed++;
                }
            }
        }

        $this->info("✓ Signatures migrated: {$sigSuccess} copied, {$sigSkipped} skipped, {$sigFailed} failed.");

        $this->newLine();
        $this->info('🎉 Migration completed successfully!');
        return self::SUCCESS;
    }
}
