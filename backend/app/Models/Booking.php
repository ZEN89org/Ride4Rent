<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Booking extends Model
{
    use HasFactory;

    public const ACTIVE_STATUSES = [
        'pending_verification', 'approved', 'awaiting_pickup',
        'pickup_in_progress', 'ready_to_start', 'trip_in_progress',
        'return_pending', 'ongoing',
    ];

    protected $fillable = [
        'renter_id',
        'vehicle_id',
        'operator_id',
        'start_date',
        'end_date',
        'total_days',
        'daily_rate',
        'reservation_fee',
        'total_price',
        'payment_status',
        'payment_method',
        'payment_reference',
        'paymongo_checkout_id',
        'paymongo_payment_intent_id',
        'paymongo_checkout_url',
        'paid_at',
        'status',
        'pickup_location',
        'notes',
        'actual_start_time',
        'current_latitude',
        'current_longitude',
        'current_speed',
        'current_street',
        'current_barangay',
        'current_city',
        'current_location_address',
        'last_location_updated_at',
        'start_mileage',
        'start_fuel_level',
        'start_inspection_notes',
        'start_inspection_photos',
        'actual_end_time',
        'end_mileage',
        'end_fuel_level',
        'distance_traveled',
        'end_inspection_notes',
        'end_inspection_photos',
        'fuel_charge',
        'damage_charge',
        'late_fee',
        'other_charges',
        'final_amount_due',
        'is_multi_vehicle_rental',
        'secondary_driver_name',
        'secondary_driver_phone',
        'secondary_driver_license_front',
        'secondary_driver_license_back',
        'rating',
        'review',
        'expires_at',
        'renter_refund_method',
        'renter_refund_account_name',
        'renter_refund_account_number',
        'refund_amount',
        'refund_status',
        'refund_reference',
        'refund_notes',
        'refunded_at',
        'extension_days',
        'extension_end_date',
        'extension_price',
        'extension_status',
        'extension_payment_method',
        'extension_payment_reference',
        'extension_requested_at',
        'extension_notes',
        'extension_paid_at',
        'extension_paid_total',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'extension_end_date' => 'date:Y-m-d',
            'extension_requested_at' => 'datetime',
            'extension_paid_at' => 'datetime',
            'extension_paid_total' => 'decimal:2',
            'expires_at' => 'datetime',
            'paid_at' => 'datetime',
            'refunded_at' => 'datetime',
            'actual_start_time' => 'datetime',
            'actual_end_time' => 'datetime',
            'last_location_updated_at' => 'datetime',
            'current_latitude' => 'float',
            'current_longitude' => 'float',
            'current_speed' => 'float',
            'total_days' => 'integer',
            'start_mileage' => 'integer',
            'end_mileage' => 'integer',
            'start_fuel_level' => 'integer',
            'end_fuel_level' => 'integer',
            'distance_traveled' => 'integer',
            'start_inspection_photos' => 'array',
            'end_inspection_photos' => 'array',
            'daily_rate' => 'decimal:2',
            'reservation_fee' => 'decimal:2',
            'total_price' => 'decimal:2',
            'refund_amount' => 'decimal:2',
            'fuel_charge' => 'decimal:2',
            'damage_charge' => 'decimal:2',
            'late_fee' => 'decimal:2',
            'other_charges' => 'decimal:2',
            'final_amount_due' => 'decimal:2',
        ];
    }

    protected $appends = [
        'operator_payment_info',
    ];

    public function getOperatorPaymentInfoAttribute(): ?array
    {
        $op = $this->operator ?: ($this->vehicle?->operator);
        $profile = $op?->operatorProfile;
        if (! $profile) {
            return null;
        }

        return [
            'business_name' => $profile->business_name,
            'account_name' => $profile->account_name ?: trim(($op->first_name ?? '').' '.($op->last_name ?? '')) ?: ($op->name ?? 'Host'),
            'account_number' => $profile->account_number ?: ($profile->business_contact_number ?? $op->phone_number ?? ''),
            'accepted_payment_methods' => $profile->accepted_payment_methods ?: ['cash', 'gcash', 'maya'],
            'qr_code_url' => Vehicle::resolveStorageUrl($profile->qr_code),
        ];
    }

    public function renter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'renter_id');
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }
}
