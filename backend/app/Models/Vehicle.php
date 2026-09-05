<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;
use App\Models\BodyType;
use App\Models\FuelType;
use App\Models\TransmissionType;
use App\Models\VehicleBrand;
use App\Models\VehicleImage;
use App\Models\VehicleType;

#[Fillable([
    'operator_id',
    'name',
    'vehicle_type_id',
    'brand_id',
    'model',
    'year_model',
    'plate_number',
    'body_type_id',
    'transmission_type_id',
    'fuel_type_id',
    'seating_capacity',
    'quantity',
    'available_units',
    'number_of_doors',
    'mileage',
    'interior_color',
    'exterior_color',
    'availability_status',
    'available_from',
    'available_until',
    'daily_rate',
    'reservation_fee',
    'rating',
    'rating_count',
    'description',
    'cover_photo',
    'min_driver_age',
    'min_driving_experience',
    'fuel_policy',
    'late_return_policy',
    'cancellation_policy',
    'smoking_policy',
    'pet_policy',
    'additional_driver_policy',
    'other_policies',
    'pickup_address',
    'pickup_latitude',
    'pickup_longitude',
])]
class Vehicle extends Model
{
    protected function casts(): array
    {
        return [
            'daily_rate' => 'decimal:2',
            'reservation_fee' => 'decimal:2',
            'available_from' => 'date',
            'available_until' => 'date',
            'pickup_latitude' => 'float',
            'pickup_longitude' => 'float',
        ];
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }

    public function vehicleType(): BelongsTo { return $this->belongsTo(VehicleType::class); }
    public function brand(): BelongsTo { return $this->belongsTo(VehicleBrand::class); }
    public function bodyType(): BelongsTo { return $this->belongsTo(BodyType::class); }
    public function transmissionType(): BelongsTo { return $this->belongsTo(TransmissionType::class); }
    public function fuelType(): BelongsTo { return $this->belongsTo(FuelType::class); }

    public function images(): HasMany
    {
        return $this->hasMany(VehicleImage::class)->orderBy('sort_order');
    }
}
