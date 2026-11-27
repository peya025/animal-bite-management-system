<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommunityAdvisory extends Model
{
    public const TYPES = [
        'routine_education',
        'community_awareness',
        'official_health_advisory',
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'approved_at' => 'datetime',
            'source_verified_at' => 'datetime',
            'scheduled_for' => 'datetime',
            'published_at' => 'datetime',
            'withdrawn_at' => 'datetime',
        ];
    }

    public function isOfficial(): bool
    {
        return ($this->advisory_type ?? 'community_awareness') === 'official_health_advisory';
    }

    public function contentHash(): string
    {
        // Clinic-wide, in-app only; binds type, wording, validity and official-source attribution.
        return hash('sha256', json_encode([
            $this->clinic_id,
            $this->advisory_type ?? 'community_awareness',
            $this->title,
            $this->body,
            $this->expires_on,
            $this->source_authority,
            $this->source_reference,
            $this->source_issued_on,
            $this->source_geography_note,
            'clinic-wide',
            'in-app',
        ], JSON_THROW_ON_ERROR));
    }
}
