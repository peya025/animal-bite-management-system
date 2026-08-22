<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\PatientMembership;
use Illuminate\Validation\Rule;

class PatientMembershipService
{
    public const TYPE_PHILHEALTH = 'philhealth';
    public const TYPE_FOURPS = 'fourps';
    public const TYPE_DSWD_NHTS = 'dswd_nhts';
    public const TYPE_SENIOR = 'senior_citizen';
    public const TYPE_PWD = 'pwd';
    public const TYPE_INDIGENOUS = 'indigenous_member';
    public const TYPE_OTHER = 'other';

    public function validationRules(): array
    {
        return [
            'memberships' => ['sometimes', 'array'],
            'memberships.*.membership_type' => [
                'required_with:memberships',
                'string',
                Rule::in([
                    self::TYPE_PHILHEALTH,
                    self::TYPE_FOURPS,
                    self::TYPE_DSWD_NHTS,
                    self::TYPE_SENIOR,
                    self::TYPE_PWD,
                    self::TYPE_INDIGENOUS,
                    self::TYPE_OTHER,
                    'others',
                ]),
            ],
            'memberships.*.is_active' => ['nullable', 'boolean'],
            'memberships.*.status_value' => ['nullable', 'string', 'max:100'],
            'memberships.*.category' => ['nullable', 'string', 'max:100'],
            'memberships.*.relationship_value' => ['nullable', 'string', 'max:100'],
            'memberships.*.registered_beneficiary' => ['nullable', 'string', 'max:100'],
            'memberships.*.membership_id_no' => ['nullable', 'string', 'max:255'],
            'memberships.*.membership_label' => ['nullable', 'string', 'max:255'],
            'memberships.*.extra_value' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function payloadHasMembershipData(array $payload): bool
    {
        foreach ([
            'memberships',
            'philhealth_member',
            'philhealth_status',
            'philhealth_no',
            'philhealth_category',
            'fourps_member',
            'fourps_category',
            'fourps_relationship',
            'registered_fourps_beneficiary',
            'dswd_nhts',
            'has_membership',
            'other_membership',
            'other_membership_name',
            'other_membership_no',
            'senior_citizen_id',
            'pwd_id',
            'indigenous_tribe',
            'other_membership_custom_name',
            'other_membership_custom_id',
        ] as $key) {
            if (array_key_exists($key, $payload)) {
                return true;
            }
        }

        return false;
    }

    public function membershipsFromPayload(array $payload): array
    {
        if (array_key_exists('memberships', $payload) && is_array($payload['memberships'])) {
            return $this->normalizeMemberships($payload['memberships']);
        }

        return $this->legacyDetailsToMemberships($payload);
    }

    public function syncForPatient(Patient $patient, array $memberships): void
    {
        $patient->memberships()->delete();

        foreach ($memberships as $membership) {
            $patient->memberships()->create($membership);
        }
    }

    public function legacyFieldsFromMemberships(array $memberships): array
    {
        $memberships = $this->normalizeMemberships($memberships);

        $fields = [
            'philhealth_member' => 'no',
            'philhealth_status' => null,
            'philhealth_no' => null,
            'philhealth_category' => null,
            'fourps_member' => 'no',
            'fourps_category' => null,
            'fourps_relationship' => null,
            'registered_fourps_beneficiary' => null,
            'dswd_nhts' => 'no',
            'has_membership' => empty($memberships) ? 'no' : 'yes',
            'other_membership' => null,
            'other_membership_name' => null,
            'other_membership_no' => null,
        ];

        $otherMemberships = [];
        $otherNames = [];
        $otherNumbers = [];

        foreach ($memberships as $membership) {
            $type = $membership['membership_type'];

            if ($type === self::TYPE_PHILHEALTH) {
                $fields['philhealth_member'] = 'yes';
                $fields['philhealth_status'] = $membership['status_value'];
                $fields['philhealth_no'] = $membership['membership_id_no'];
                $fields['philhealth_category'] = $membership['category'];
                continue;
            }

            if ($type === self::TYPE_FOURPS) {
                $fields['fourps_member'] = 'yes';
                $fields['fourps_category'] = $membership['category'];
                $fields['fourps_relationship'] = $membership['relationship_value'];
                $fields['registered_fourps_beneficiary'] = $membership['registered_beneficiary'];
                continue;
            }

            if ($type === self::TYPE_DSWD_NHTS) {
                $fields['dswd_nhts'] = 'yes';
                continue;
            }

            if ($type === self::TYPE_SENIOR) {
                $otherMemberships[] = self::TYPE_SENIOR;
                if ($membership['membership_id_no']) {
                    $otherNumbers[self::TYPE_SENIOR] = $membership['membership_id_no'];
                }
                continue;
            }

            if ($type === self::TYPE_PWD) {
                $otherMemberships[] = self::TYPE_PWD;
                if ($membership['membership_id_no']) {
                    $otherNumbers[self::TYPE_PWD] = $membership['membership_id_no'];
                }
                continue;
            }

            if ($type === self::TYPE_INDIGENOUS) {
                $otherMemberships[] = self::TYPE_INDIGENOUS;
                if ($membership['extra_value']) {
                    $otherNames[self::TYPE_INDIGENOUS] = $membership['extra_value'];
                }
                continue;
            }

            if ($type === self::TYPE_OTHER) {
                $otherMemberships[] = 'others';
                if ($membership['membership_label']) {
                    $otherNames['others'] = $membership['membership_label'];
                }
                if ($membership['membership_id_no']) {
                    $otherNumbers['others'] = $membership['membership_id_no'];
                }
            }
        }

        if (!empty($otherMemberships)) {
            $fields['other_membership'] = json_encode(array_values(array_unique($otherMemberships)), JSON_UNESCAPED_UNICODE);
        }

        if (!empty($otherNames)) {
            $fields['other_membership_name'] = json_encode($otherNames, JSON_UNESCAPED_UNICODE);
        }

        if (!empty($otherNumbers)) {
            $fields['other_membership_no'] = json_encode($otherNumbers, JSON_UNESCAPED_UNICODE);
        }

        return $fields;
    }

    public function legacyDetailsToMemberships(array $details): array
    {
        $details = $this->normalizeAssociativeArray($details);
        $memberships = [];

        $hasMembership = $details['has_membership'] ?? null;
        if ($hasMembership === 'no') {
            return [];
        }

        if (
            ($details['philhealth_member'] ?? null) === 'yes'
            || $this->hasAnyValue([
                $details['philhealth_status'] ?? null,
                $details['philhealth_no'] ?? null,
                $details['philhealth_category'] ?? null,
            ])
        ) {
            $memberships[] = $this->cleanMembership([
                'membership_type' => self::TYPE_PHILHEALTH,
                'status_value' => $details['philhealth_status'] ?? null,
                'category' => $details['philhealth_category'] ?? null,
                'membership_id_no' => $details['philhealth_no'] ?? null,
            ]);
        }

        if (
            ($details['fourps_member'] ?? null) === 'yes'
            || $this->hasAnyValue([
                $details['fourps_category'] ?? null,
                $details['fourps_relationship'] ?? null,
                $details['registered_fourps_beneficiary'] ?? null,
            ])
        ) {
            $memberships[] = $this->cleanMembership([
                'membership_type' => self::TYPE_FOURPS,
                'status_value' => $details['fourps_member'] ?? 'yes',
                'category' => $details['fourps_category'] ?? null,
                'relationship_value' => $details['fourps_relationship'] ?? null,
                'registered_beneficiary' => $details['registered_fourps_beneficiary'] ?? null,
            ]);
        }

        if (($details['dswd_nhts'] ?? null) === 'yes') {
            $memberships[] = $this->cleanMembership([
                'membership_type' => self::TYPE_DSWD_NHTS,
                'status_value' => 'yes',
            ]);
        }

        $otherMemberships = $this->parseMembershipList($details['other_membership'] ?? null);
        $otherNames = $this->parseMembershipMap($details['other_membership_name'] ?? null);
        $otherNumbers = $this->parseMembershipMap($details['other_membership_no'] ?? null);

        foreach ($otherMemberships as $otherMembership) {
            $normalizedType = $this->normalizeMembershipType($otherMembership);

            if ($normalizedType === self::TYPE_SENIOR) {
                $memberships[] = $this->cleanMembership([
                    'membership_type' => self::TYPE_SENIOR,
                    'membership_id_no' => $otherNumbers[self::TYPE_SENIOR] ?? ($details['senior_citizen_id'] ?? null),
                ]);
                continue;
            }

            if ($normalizedType === self::TYPE_PWD) {
                $memberships[] = $this->cleanMembership([
                    'membership_type' => self::TYPE_PWD,
                    'membership_id_no' => $otherNumbers[self::TYPE_PWD] ?? ($details['pwd_id'] ?? null),
                ]);
                continue;
            }

            if ($normalizedType === self::TYPE_INDIGENOUS) {
                $memberships[] = $this->cleanMembership([
                    'membership_type' => self::TYPE_INDIGENOUS,
                    'extra_value' => $otherNames[self::TYPE_INDIGENOUS] ?? ($details['indigenous_tribe'] ?? null),
                ]);
                continue;
            }

            if ($normalizedType === self::TYPE_OTHER) {
                $memberships[] = $this->cleanMembership([
                    'membership_type' => self::TYPE_OTHER,
                    'membership_label' => $otherNames['others'] ?? $otherNames[self::TYPE_OTHER] ?? ($details['other_membership_custom_name'] ?? null),
                    'membership_id_no' => $otherNumbers['others'] ?? $otherNumbers[self::TYPE_OTHER] ?? ($details['other_membership_custom_id'] ?? null),
                ]);
                continue;
            }

            if ($otherMembership && !in_array($otherMembership, ['none'], true)) {
                $memberships[] = $this->cleanMembership([
                    'membership_type' => self::TYPE_OTHER,
                    'membership_label' => $otherMembership,
                    'membership_id_no' => $details['other_membership_no'] ?? null,
                ]);
            }
        }

        if (empty($otherMemberships) && $this->hasAnyValue([
            $details['senior_citizen_id'] ?? null,
            $details['pwd_id'] ?? null,
            $details['indigenous_tribe'] ?? null,
            $details['other_membership_custom_name'] ?? null,
            $details['other_membership_custom_id'] ?? null,
        ])) {
            if (!empty($details['senior_citizen_id'])) {
                $memberships[] = $this->cleanMembership([
                    'membership_type' => self::TYPE_SENIOR,
                    'membership_id_no' => $details['senior_citizen_id'],
                ]);
            }
            if (!empty($details['pwd_id'])) {
                $memberships[] = $this->cleanMembership([
                    'membership_type' => self::TYPE_PWD,
                    'membership_id_no' => $details['pwd_id'],
                ]);
            }
            if (!empty($details['indigenous_tribe'])) {
                $memberships[] = $this->cleanMembership([
                    'membership_type' => self::TYPE_INDIGENOUS,
                    'extra_value' => $details['indigenous_tribe'],
                ]);
            }
            if (!empty($details['other_membership_custom_name']) || !empty($details['other_membership_custom_id'])) {
                $memberships[] = $this->cleanMembership([
                    'membership_type' => self::TYPE_OTHER,
                    'membership_label' => $details['other_membership_custom_name'] ?? null,
                    'membership_id_no' => $details['other_membership_custom_id'] ?? null,
                ]);
            }
        }

        return $this->normalizeMemberships($memberships);
    }

    public function normalizeMemberships(array $memberships): array
    {
        $normalized = [];

        foreach ($memberships as $membership) {
            if (!is_array($membership)) {
                continue;
            }

            $type = $this->normalizeMembershipType($membership['membership_type'] ?? $membership['type'] ?? null);
            if (!$type) {
                continue;
            }

            $isActive = $membership['is_active'] ?? true;
            $isActive = filter_var($isActive, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($isActive === false) {
                continue;
            }

            $cleaned = $this->cleanMembership([
                'membership_type' => $type,
                'is_active' => true,
                'status_value' => $membership['status_value'] ?? $membership['status'] ?? null,
                'category' => $membership['category'] ?? null,
                'relationship_value' => $membership['relationship_value'] ?? $membership['relationship'] ?? null,
                'registered_beneficiary' => $membership['registered_beneficiary'] ?? null,
                'membership_id_no' => $membership['membership_id_no'] ?? $membership['membership_id'] ?? null,
                'membership_label' => $membership['membership_label'] ?? $membership['label'] ?? null,
                'extra_value' => $membership['extra_value'] ?? $membership['extra'] ?? null,
            ]);

            $normalized[$type] = $cleaned;
        }

        return array_values($normalized);
    }

    private function cleanMembership(array $membership): array
    {
        return [
            'membership_type' => $membership['membership_type'],
            'is_active' => $membership['is_active'] ?? true,
            'status_value' => $this->cleanString($membership['status_value'] ?? null),
            'category' => $this->cleanString($membership['category'] ?? null),
            'relationship_value' => $this->cleanString($membership['relationship_value'] ?? null),
            'registered_beneficiary' => $this->cleanString($membership['registered_beneficiary'] ?? null),
            'membership_id_no' => $this->cleanString($membership['membership_id_no'] ?? null),
            'membership_label' => $this->cleanString($membership['membership_label'] ?? null),
            'extra_value' => $this->cleanString($membership['extra_value'] ?? null),
        ];
    }

    private function normalizeAssociativeArray(array $payload): array
    {
        $normalized = [];

        foreach ($payload as $key => $value) {
            if (is_string($value)) {
                $trimmed = trim($value);
                $normalized[$key] = $trimmed === '' ? null : $trimmed;
            } else {
                $normalized[$key] = $value;
            }
        }

        return $normalized;
    }

    private function parseMembershipList($value): array
    {
        $text = $this->cleanString($value);
        if (!$text) {
            return [];
        }

        if ($this->looksLikeJson($text)) {
            $decoded = json_decode($text, true);
            if (is_array($decoded)) {
                return array_values(array_filter(array_map(function ($item) {
                    return is_string($item) ? trim($item) : null;
                }, $decoded)));
            }
        }

        return [$text];
    }

    private function parseMembershipMap($value): array
    {
        $text = $this->cleanString($value);
        if (!$text || !$this->looksLikeJson($text)) {
            return [];
        }

        $decoded = json_decode($text, true);
        if (!is_array($decoded)) {
            return [];
        }

        $normalized = [];
        foreach ($decoded as $key => $item) {
            $normalized[$this->normalizeMembershipType($key) ?? $key] = is_string($item) ? trim($item) : $item;
        }

        return $normalized;
    }

    private function normalizeMembershipType($type): ?string
    {
        $type = $this->cleanString($type);
        if (!$type) {
            return null;
        }

        return match ($type) {
            self::TYPE_PHILHEALTH => self::TYPE_PHILHEALTH,
            self::TYPE_FOURPS => self::TYPE_FOURPS,
            self::TYPE_DSWD_NHTS => self::TYPE_DSWD_NHTS,
            self::TYPE_SENIOR => self::TYPE_SENIOR,
            self::TYPE_PWD => self::TYPE_PWD,
            self::TYPE_INDIGENOUS => self::TYPE_INDIGENOUS,
            self::TYPE_OTHER, 'others' => self::TYPE_OTHER,
            default => null,
        };
    }

    private function cleanString($value): ?string
    {
        if ($value === null) {
            return null;
        }

        $text = trim((string) $value);
        return $text === '' ? null : $text;
    }

    private function looksLikeJson(string $value): bool
    {
        return str_starts_with($value, '[') || str_starts_with($value, '{');
    }

    private function hasAnyValue(array $values): bool
    {
        foreach ($values as $value) {
            if ($this->cleanString($value) !== null) {
                return true;
            }
        }

        return false;
    }
}
