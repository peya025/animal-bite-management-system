<?php

namespace App\Services\Messaging\Sms;

class SmsLength
{
    /** Estimate GSM-7 septets or UTF-16 code units, including multipart overhead. */
    public static function estimate(string $text): array
    {
        $basic = "@£\$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
        $extension = "^{}\\[~]|€\f";
        $units = 0;
        foreach (mb_str_split($text) as $char) {
            if (str_contains($basic, $char)) {
                $units++;
            } elseif (str_contains($extension, $char)) {
                $units += 2;
            } else {
                $units = strlen(mb_convert_encoding($text, 'UTF-16BE', 'UTF-8')) / 2;

                return ['encoding' => 'Unicode', 'segments' => (int) ceil($units / ($units <= 70 ? 70 : 67))];
            }
        }

        return ['encoding' => 'GSM-7', 'segments' => (int) ceil($units / ($units <= 160 ? 160 : 153))];
    }
}
