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
    'is_frozen',
    'frozen_at',
    'freeze_reason',
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
            'is_frozen' => 'boolean',
            'frozen_at' => 'datetime',
        ];
    }

    protected $appends = [
        'drivers_license_front_url',
        'drivers_license_back_url',
    ];

    public function getDriversLicenseFrontUrlAttribute(): ?string
    {
        return Vehicle::resolveStorageUrl($this->drivers_license_front);
    }

    public function getDriversLicenseBackUrlAttribute(): ?string
    {
        return Vehicle::resolveStorageUrl($this->drivers_license_back);
    }

    public function toArray(): array
    {
        $array = parent::toArray();
        if (!empty($array['profile_photo'])) {
            $array['profile_photo'] = Vehicle::resolveStorageUrl($array['profile_photo']);
        }
        if (!empty($array['drivers_license_front'])) {
            $array['drivers_license_front'] = Vehicle::resolveStorageUrl($array['drivers_license_front']);
        }
        if (!empty($array['drivers_license_back'])) {
            $array['drivers_license_back'] = Vehicle::resolveStorageUrl($array['drivers_license_back']);
        }
        return $array;
    }

    public function operatorProfile(): HasOne
    {
        return $this->hasOne(OperatorProfile::class);
    }

    public function remittances(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(OperatorRemittance::class, 'operator_id');
    }

    public function isFrozen(): bool
    {
        return (bool) $this->is_frozen;
    }

    public function freeze(?string $reason = null): void
    {
        $this->update([
            'is_frozen' => true,
            'frozen_at' => now(),
            'freeze_reason' => $reason,
        ]);
    }

    public function unfreeze(): void
    {
        $this->update([
            'is_frozen' => false,
            'frozen_at' => null,
            'freeze_reason' => null,
        ]);
    }
}
