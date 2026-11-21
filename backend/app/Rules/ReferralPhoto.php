<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ReferralPhoto implements ValidationRule
{
    public const MAX_BYTES = 2 * 1024 * 1024;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!is_string($value) || strlen($value) > 4 * ceil(self::MAX_BYTES / 3) + 32) {
            $fail('The referral photo must be a JPG or PNG image of 2 MB or smaller.');
            return;
        }

        if (!preg_match('/\Adata:image\/(jpeg|png);base64,([A-Za-z0-9+\/=]+)\z/D', $value, $matches)) {
            $fail('Please attach a valid JPG or PNG referral photo.');
            return;
        }

        $bytes = base64_decode($matches[2], true);
        if ($bytes === false || strlen($bytes) > self::MAX_BYTES) {
            $fail('The referral photo must be 2 MB or smaller.');
            return;
        }

        $image = @getimagesizefromstring($bytes);
        if ($image === false || ($image['mime'] ?? '') !== 'image/'.$matches[1]) {
            $fail('Please attach a valid JPG or PNG referral photo.');
        }
    }
}
