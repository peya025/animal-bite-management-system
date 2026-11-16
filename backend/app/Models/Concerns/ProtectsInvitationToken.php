<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Crypt;

trait ProtectsInvitationToken
{
    protected function token(): Attribute
    {
        return Attribute::make(
            get: fn ($value, $attributes) => ! empty($attributes['encrypted_token']) ? Crypt::decryptString($attributes['encrypted_token']) : $value,
            set: fn ($value) => ['token' => hash('sha256', $value), 'encrypted_token' => Crypt::encryptString($value)]
        );
    }

    public function scopeForToken($query, string $token)
    {
        return $query->where('token', hash('sha256', $token));
    }
}
