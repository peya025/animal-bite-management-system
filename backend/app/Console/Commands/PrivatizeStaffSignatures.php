<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Services\StaffSignatureService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PrivatizeStaffSignatures extends Command
{
    protected $signature = 'signatures:privatize {--apply : Move validated legacy images and update their references}';

    protected $description = 'Preview or migrate legacy public signatures into private storage without inventing signing consent';

    public function handle(StaffSignatureService $signatures): int
    {
        $paths = DB::table('users')->whereNotNull('signature_path')->pluck('signature_path')
            ->merge(DB::table('treatment_records')->whereNotNull('signature')->pluck('signature'))->unique();
        $failed = false;
        foreach ($paths as $path) {
            if ($signatures->available($path)) {
                continue;
            }
            if (in_array($path, StaffSignatureService::PLACEHOLDERS, true)) {
                $this->warn('Run database migrations first to clear placeholder references.');
                $failed = true;

                continue;
            }
            $source = realpath(public_path($path));
            $root = realpath(public_path('signatures'));
            if (! preg_match('/\Asignatures\/[A-Za-z0-9_-]+\.(png|jpe?g)\z/iD', $path)
                || ! $source || ! $root || dirname($source) !== $root || ! is_file($source)) {
                $this->error('Missing or unsupported signature reference: '.$path);
                $failed = true;

                continue;
            }
            $newPath = null;
            try {
                if (filesize($source) > 2 * 1024 * 1024) {
                    throw new \RuntimeException('Legacy image exceeds the 2 MB limit.');
                }
                $png = $signatures->normalize(file_get_contents($source));
                if (! $this->option('apply')) {
                    $this->line('Would migrate: '.$path);

                    continue;
                }
                $newPath = $signatures->write($png);
                DB::transaction(function () use ($path, $newPath) {
                    DB::table('users')->where('signature_path', $path)->update(['signature_path' => $newPath]);
                    // Preserve image associations only; legacy consent/signing time is unknown.
                    DB::table('treatment_records')->where('signature', $path)->update(['signature' => $newPath]);
                    AuditLog::create([
                        'action' => 'signature.migrated',
                        'model' => 'StaffSignature',
                        'old_values' => ['signature_path' => $path],
                        'new_values' => ['signature_path' => $newPath],
                        'description' => 'Legacy image moved to private storage; signing consent was not inferred.',
                    ]);
                });
            } catch (\Throwable $e) {
                if ($newPath) {
                    Storage::disk('signatures')->delete($newPath);
                }
                $this->error('Could not migrate '.$path.': '.$e->getMessage());
                $failed = true;

                continue;
            }
            // The resolved source is a single file inside the verified signatures directory.
            if (! unlink($source)) {
                $this->error('References migrated, but the old public file needs removal: '.$path);
                $failed = true;
            } else {
                $this->info('Migrated: '.$path);
            }
        }
        if (! $this->option('apply')) {
            $this->info('Preview only. Use --apply after reviewing and backing up the database and images.');
        }

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
