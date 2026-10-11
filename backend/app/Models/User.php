<?php

namespace App\Models;

use App\Models\OperatorProfile;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;


#[Fillable([
    'first_name',
    'middle_name',
    'last_name',
    'suffix',
    'date_of_birth',
    'sex',
    'mobile_number',
    'email',
    'password',
    'profile_photo',
    'drivers_license_front',
    'drivers_license_back',
    'is_drivers_license_verified',
    'license_verification_status',
    'license_rejection_reason',
    'license_submitted_at',
    'role',
    'account_status',
    'last_login_at',
])]
#[Hidden([
    'password',
    'remember_token',
])]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    protected $appends = [
        'drivers_license_front_url',
        'drivers_license_back_url',
    ];

    public function getDriversLicenseFrontUrlAttribute(): ?string
    {
        if (empty($this->drivers_license_front)) {
            return null;
        }
        if (str_starts_with($this->drivers_license_front, 'http')) {
            return $this->drivers_license_front;
        }
        return asset('storage/' . $this->drivers_license_front);
    }

    public function getDriversLicenseBackUrlAttribute(): ?string
    {
        if (empty($this->drivers_license_back)) {
            return null;
        }
        if (str_starts_with($this->drivers_license_back, 'http')) {
            return $this->drivers_license_back;
        }
        return asset('storage/' . $this->drivers_license_back);
    }

    public function operatorProfile(): HasOne
    {
        return $this->hasOne(OperatorProfile::class);
    }
}
