<?php

namespace Tests\Unit;

use App\Rules\ReferralPhoto;
use PHPUnit\Framework\TestCase;

class ReferralPhotoTest extends TestCase
{
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';

    private function errors(mixed $value): array
    {
        $errors = [];
        (new ReferralPhoto)->validate('intake.referral_document_photo', $value, function ($message) use (&$errors) {
            $errors[] = $message;
        });
        return $errors;
    }

    public function test_accepts_real_photo_data(): void
    {
        $this->assertSame([], $this->errors('data:image/png;base64,'.self::PNG));
    }

    public function test_rejects_filename_fake_image_and_mismatched_type(): void
    {
        foreach (['referral.jpg', 'data:image/png;base64,'.base64_encode('not an image'), 'data:image/jpeg;base64,'.self::PNG] as $value) {
            $this->assertNotEmpty($this->errors($value));
        }
    }

    public function test_enforces_decoded_size_boundary(): void
    {
        $bytes = str_pad(base64_decode(self::PNG), ReferralPhoto::MAX_BYTES, "\0");
        $this->assertSame([], $this->errors('data:image/png;base64,'.base64_encode($bytes)));
        $this->assertNotEmpty($this->errors('data:image/png;base64,'.base64_encode($bytes."\0")));
    }
}
