<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StaffSignatureService
{
    public const PLACEHOLDERS = ['signatures/default_nurse_signature.png', 'signatures/default_placeholder.png'];

    public static function rules(): array
    {
        return [
            'signature_path' => 'prohibited',
            'signature_data' => 'nullable|string|max:2800000',
            'signature' => 'nullable|file|max:2048',
            'remove_signature' => 'sometimes|boolean',
        ];
    }

    public function prepare(Request $request): ?string
    {
        $upload = $request->hasFile('signature');
        $encoded = $request->filled('signature_data');
        if (($upload && $encoded) || (($upload || $encoded) && $request->boolean('remove_signature'))) {
            $this->invalid('Choose one signature action: upload or remove.');
        }
        if ($upload) {
            return $this->normalize($request->file('signature')->get());
        }
        if (! $encoded) {
            return null;
        }
        $data = $request->string('signature_data')->toString();
        if (! preg_match('/\Adata:image\/(png|jpeg);base64,([A-Za-z0-9+\/=]+)\z/D', $data, $matches)) {
            $this->invalid('Choose a valid PNG or JPG signature image.');
        }
        $bytes = base64_decode($matches[2], true);
        if ($bytes === false) {
            $this->invalid('The signature image could not be decoded.');
        }

        return $this->normalize($bytes);
    }

    public function normalize(string $bytes): string
    {
        if (strlen($bytes) > 2 * 1024 * 1024) {
            $this->invalid('Signature images must be 2 MB or smaller.');
        }
        $info = @getimagesizefromstring($bytes);
        if (! $info || ! in_array($info[2], [IMAGETYPE_PNG, IMAGETYPE_JPEG], true)
            || $info[0] > 4096 || $info[1] > 4096 || $info[0] * $info[1] > 4000000) {
            $this->invalid('Use a PNG or JPG up to 4096 pixels per side and 4 million pixels total.');
        }
        $image = @imagecreatefromstring($bytes);
        if (! $image) {
            $this->invalid('The signature image is damaged.');
        }
        imagesavealpha($image, true);
        ob_start();
        imagepng($image);
        $png = ob_get_clean();
        imagedestroy($image);

        return $png;
    }

    // Called inside the user transaction. Files are immutable and retained for history.
    public function apply(User $user, Request $request, ?string $png): void
    {
        if ($png === null && ! $request->boolean('remove_signature')) {
            return;
        }
        $old = $user->signature_path;
        $path = $png === null ? null : $this->write($png);
        try {
            $user->update(['signature_path' => $path]);
            AuditLog::log($path ? 'signature.uploaded' : 'signature.removed', 'User', $user->id, [
                'old_values' => ['signature_path' => $old],
                'new_values' => ['signature_path' => $path],
                'description' => $path ? 'Staff signature uploaded; staff consent is required when signing.' : 'Staff signature removed from future use; historical records retained.',
            ]);
        } catch (\Throwable $e) {
            if ($path) {
                Storage::disk('signatures')->delete($path);
            }
            throw $e;
        }
    }

    public function write(string $png): string
    {
        $path = 'signatures/'.Str::uuid().'.png';
        Storage::disk('signatures')->put($path, $png);

        return $path;
    }

    public function available(?string $path): bool
    {
        return $path && preg_match('/\Asignatures\/[a-f0-9-]{36}\.png\z/D', $path)
            && Storage::disk('signatures')->exists($path);
    }

    public function response(?string $path)
    {
        abort_unless($this->available($path), 404, 'No signature image is available.');

        return response(Storage::disk('signatures')->get($path), 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition' => 'inline; filename="signature.png"',
        ]);
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['signature_data' => $message]);
    }
}
