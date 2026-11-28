<?php

namespace App\Http\Resources\Auth;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthUserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'                      => $this->id,
            'name'                    => $this->name,
            'email'                   => $this->email,
            'role'                    => $this->role,
            'phone'                   => $this->phone,
            'is_active'               => $this->is_active,
            'signature_path'          => $this->signature_path,
            'professional_license_no' => $this->professional_license_no,
            'roles'                   => $this->roles,
            'is_solo_nurse'           => method_exists($this->resource, 'isSoloNurse') ? $this->isSoloNurse() : false,
            'is_nursing'              => method_exists($this->resource, 'isNursing') ? $this->isNursing() : false,
            'clinic'                  => $this->clinic,
        ];
    }
}
