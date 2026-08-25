<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VehicleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'model' => $this->model,
            'year_model' => $this->year_model,
            'plate_number' => $this->plate_number,
            'vehicle_type' => $this->vehicleType?->name,
            'brand' => $this->brand?->name,
            'body_type' => $this->bodyType?->name,
            'transmission' => $this->transmissionType?->name,
            'fuel_type' => $this->fuelType?->name,
            'seats' => $this->seating_capacity,
            'number_of_doors' => $this->number_of_doors,
            'mileage' => $this->mileage,
            'interior_color' => $this->interior_color,
            'exterior_color' => $this->exterior_color,
            'price_per_day' => (float) $this->daily_rate,
            'reservation_fee' => (float) $this->reservation_fee,
            'pickup_address' => $this->pickup_address,
            'pickup_latitude' => $this->pickup_latitude,
            'pickup_longitude' => $this->pickup_longitude,
            'distance_km' => isset($this->distance_km) ? round($this->distance_km, 1) : null,
            'description' => $this->description,
            'image_url' => $this->cover_photo
                ? $request->getSchemeAndHttpHost().'/storage/'.$this->cover_photo
                : null,
            'availability_status' => $this->availability_status,
            'is_available' => $this->is_active && $this->availability_status === 'available',
            'operator' => [
                'id' => $this->operator?->id,
                'name' => trim(($this->operator?->first_name ?? '').' '.($this->operator?->last_name ?? '')),
                'business_name' => $this->operator?->operatorProfile?->business_name,
            ],
        ];
    }
}
