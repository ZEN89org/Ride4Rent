<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'user_id',
    'business_name',
    'business_email',
    'business_contact_number',
    'street_address',
    'barangay',
    'municipality',
    'latitude',
    'longitude',

    'government_id_front',
    'government_id_back',

    'business_permit_front',
    'business_permit_back',

    'dti_sec_registration',

    'accepted_payment_methods',
    'account_name',
    'account_number',
    'qr_code',

    'rejection_reason',
    'reviewed_at',
])]
class OperatorProfile extends Model
{
    public const MUNICIPALITY_COORDINATES = [
        'Baco' => ['latitude' => 13.3592, 'longitude' => 121.0975],
        'Bansud' => ['latitude' => 12.8647, 'longitude' => 121.4589],
        'Bongabong' => ['latitude' => 12.7500, 'longitude' => 121.4833],
        'Bulalacao' => ['latitude' => 12.3278, 'longitude' => 121.3444],
        'Calapan City' => ['latitude' => 13.4115, 'longitude' => 121.1803],
        'Calapan' => ['latitude' => 13.4115, 'longitude' => 121.1803],
        'Gloria' => ['latitude' => 12.9833, 'longitude' => 121.4667],
        'Mansalay' => ['latitude' => 12.5167, 'longitude' => 121.4167],
        'Naujan' => ['latitude' => 13.3236, 'longitude' => 121.3033],
        'Pinamalayan' => ['latitude' => 13.0453, 'longitude' => 121.4878],
        'Pola' => ['latitude' => 13.1467, 'longitude' => 121.4339],
        'Puerto Galera' => ['latitude' => 13.5000, 'longitude' => 120.9542],
        'Roxas' => ['latitude' => 12.5858, 'longitude' => 121.5194],
        'San Teodoro' => ['latitude' => 13.4333, 'longitude' => 120.9833],
        'Socorro' => ['latitude' => 13.0667, 'longitude' => 121.4000],
        'Victoria' => ['latitude' => 13.1772, 'longitude' => 121.2825],
    ];

    public function getCoordinates(): array
    {
        if ($this->latitude && $this->longitude) {
            return [
                'latitude' => (float) $this->latitude,
                'longitude' => (float) $this->longitude,
            ];
        }

        $mun = $this->municipality;
        if ($mun && isset(self::MUNICIPALITY_COORDINATES[$mun])) {
            return self::MUNICIPALITY_COORDINATES[$mun];
        }

        // Center default of Oriental Mindoro (Pinamalayan)
        return ['latitude' => 13.0453, 'longitude' => 121.4878];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected function casts(): array
    {
        return [
            'accepted_payment_methods' => 'array',
            'reviewed_at' => 'datetime',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }
}

