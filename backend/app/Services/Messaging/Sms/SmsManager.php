<?php

namespace App\Services\Messaging\Sms;

use InvalidArgumentException;

class SmsManager
{
    public function provider(?string $name = null): SmsProvider
    {
        $class = config('messaging.providers.'.($name ?? config('messaging.sms_provider')));
        if (! $class || ! is_a($class, SmsProvider::class, true)) {
            throw new InvalidArgumentException('Unsupported SMS provider.');
        }

        return app($class);
    }

    public static function normalize(string $phone): string
    {
        $phone = preg_replace('/[\s().-]/', '', trim($phone));
        if (preg_match('/^09\d{9}$/', $phone)) {
            $phone = '+63'.substr($phone, 1);
        }
        if (preg_match('/^639\d{9}$/', $phone)) {
            $phone = '+'.$phone;
        }
        if (! preg_match('/^\+[1-9]\d{7,14}$/', $phone)) {
            throw new InvalidArgumentException('Invalid mobile number.');
        }

        return $phone;
    }
}
