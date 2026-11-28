<?php
namespace App\Support;

final class RegistrationAnimal
{
    public static function rules(): array
    {
        return [
            'animal_type' => 'nullable|in:dog,cat,other',
            'animal_type_others' => 'nullable|string|max:255',
            'animal_status' => 'nullable|in:owned,stray,unknown',
            'animal_available' => 'nullable|in:yes,no,unknown',
            'animal_condition' => 'nullable|in:healthy,sick,died,unknown',
        ];
    }

    public static function values(array $input): array
    {
        $values = array_filter(array_intersect_key($input, self::rules()), fn ($v) => $v !== null && $v !== '');
        if (isset($values['animal_available'])) {
            $values['animal_available_answered'] = true;
            $values['animal_available'] = match ($values['animal_available']) { 'yes' => true, 'no' => false, default => null };
        }
        if (isset($values['animal_condition'])) {
            $values['animal_observation_status'] = $values['animal_condition'];
            unset($values['animal_condition']);
        }
        return $values;
    }
}
