<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAssignedModuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function failedAuthorization(): void
    {
        abort(response()->json(['message' => 'Unauthorized. Admin access required.'], 403));
    }

    public function rules(): array
    {
        return [
            'assigned_module' => ['required', 'in:all,registration,triage,treatment,inventory'],
        ];
    }
}
