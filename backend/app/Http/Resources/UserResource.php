<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,

            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'suffix' => $this->suffix,

            'email' => $this->email,
            'mobile_number' => $this->mobile_number,
            'profile_photo' => $this->profile_photo
                ? $request->getSchemeAndHttpHost().'/storage/'.$this->profile_photo
                : null,
            'drivers_license_front' => $this->drivers_license_front
                ? $request->getSchemeAndHttpHost().'/storage/'.$this->drivers_license_front
                : null,
            'drivers_license_back' => $this->drivers_license_back
                ? $request->getSchemeAndHttpHost().'/storage/'.$this->drivers_license_back
                : null,
            'is_drivers_license_verified' => (bool) $this->is_drivers_license_verified,
            'license_verification_status' => $this->license_verification_status ?? ($this->is_drivers_license_verified ? 'approved' : ($this->drivers_license_front ? 'pending' : 'unverified')),
            'license_rejection_reason' => $this->license_rejection_reason,
            'license_submitted_at' => $this->license_submitted_at,

            'date_of_birth' => $this->date_of_birth,
            'sex' => $this->sex,

            'role' => $this->role,
            'account_status' => $this->account_status,
            'operator_profile' => $this->operatorProfile,

            'email_verified_at' => $this->email_verified_at,

            'registration_date' => $this->created_at,
            'last_login_at' => $this->last_login_at,

            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
