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
            'phone_number' => $this->phone_number,

            'date_of_birth' => $this->date_of_birth,
            'sex' => $this->sex,

            'profile_photo' => $this->profile_photo,

            'role' => $this->role,
            'account_status' => $this->account_status,

            'email_verified_at' => $this->email_verified_at,

            'registration_date' => $this->created_at,
            'last_login' => $this->last_login,

            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
