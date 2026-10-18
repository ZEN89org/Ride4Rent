<?php

namespace App\Models;

use App\Services\PrivateDocumentService;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
    'features',
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
    'base_price_per_day',
    'demand_multiplier',
    'is_dynamic_pricing_enabled',
    'current_odometer',
    'last_service_odometer',
    'service_interval_km',
])]
class Vehicle extends Model
{
    protected function casts(): array
    {
        return [
            'daily_rate' => 'decimal:2',
            'base_price_per_day' => 'decimal:2',
            'demand_multiplier' => 'decimal:2',
            'is_dynamic_pricing_enabled' => 'boolean',
            'current_odometer' => 'integer',
            'last_service_odometer' => 'integer',
            'service_interval_km' => 'integer',
            'reservation_fee' => 'decimal:2',
            'available_from' => 'date',
            'available_until' => 'date',
            'pickup_latitude' => 'float',
            'pickup_longitude' => 'float',
            'features' => 'array',
        ];
    }

    protected $appends = ['image_url'];

    public static function resolveStorageUrl(?string $path, ?string $hostOverride = null): ?string
    {
        if (empty($path) || ! is_string($path)) {
            return null;
        }

        $trimmed = trim($path);
        $documentPath = preg_replace('#^.*?/storage/#', '', ltrim($trimmed, '/'));
        if (PrivateDocumentService::isPrivate($documentPath)) {
            return PrivateDocumentService::url($documentPath);
        }
        if ($trimmed === '') {
            return null;
        }

        if (str_starts_with($trimmed, 'data:')) {
            return $trimmed;
        }

        $host = $hostOverride ?: (request()?->getSchemeAndHttpHost() ?: rtrim((string) config('app.url'), '/'));
        if (
            str_starts_with($host, 'http://') &&
            (str_contains($host, '.railway.app') || str_contains($host, '.ngrok'))
        ) {
            $host = 'https://'.substr($host, 7);
        }

        // Fix accidental double-prefixed URLs like https://host/storage/https://...
        if (preg_match('#/storage/(https?://.+)$#i', $trimmed, $m)) {
            $trimmed = $m[1];
        }

        if (str_starts_with($trimmed, 'http://') || str_starts_with($trimmed, 'https://')) {
            // If URL points to a /storage/ path on localhost or a private LAN IP, rewrite to current host
            if ($host && preg_match('#^https?://(?:localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+)(?::\d+)?/storage/(.+)$#i', $trimmed, $matches)) {
                return rtrim($host, '/').'/storage/'.ltrim($matches[1], '/');
            }
            if (
                str_starts_with($trimmed, 'http://') &&
                (str_contains($trimmed, '.railway.app') || str_contains($trimmed, '.ngrok'))
            ) {
                return 'https://'.substr($trimmed, 7);
            }

            return $trimmed;
        }

        $cleanRelative = ltrim(preg_replace('#^/?storage/#', '', $trimmed), '/');

        return rtrim($host, '/').'/storage/'.$cleanRelative;
    }

    public function getImageUrlAttribute(): ?string
    {
        $rawPath = $this->cover_photo;
        if (empty($rawPath)) {
            $rawPath = $this->relationLoaded('images')
                ? $this->images->first()?->image_path
                : $this->images()->orderBy('sort_order')->value('image_path');
        }

        return self::resolveStorageUrl($rawPath);
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }

    public function vehicleType(): BelongsTo
    {
        return $this->belongsTo(VehicleType::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(VehicleBrand::class);
    }

    public function bodyType(): BelongsTo
    {
        return $this->belongsTo(BodyType::class);
    }

    public function transmissionType(): BelongsTo
    {
        return $this->belongsTo(TransmissionType::class);
    }

    public function fuelType(): BelongsTo
    {
        return $this->belongsTo(FuelType::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(VehicleImage::class)->orderBy('sort_order');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'vehicle_id');
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(VehicleMaintenance::class, 'vehicle_id');
    }
}
