<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VehicleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $operator = $this->operator;
        $profile = $operator?->operatorProfile;

        return [
            'id' => $this->id,
            'operator_id' => $this->operator_id,
            'name' => $this->name,
            'model' => $this->model,
            'year_model' => $this->year_model,
            'plate_number' => $this->plate_number,
            'vehicle_type' => $this->vehicleType?->name,
            'vehicle_type_id' => $this->vehicle_type_id,
            'brand' => $this->brand?->name,
            'brand_id' => $this->brand_id,
            'body_type' => $this->bodyType?->name,
            'body_type_id' => $this->body_type_id,
            'transmission' => $this->transmissionType?->name,
            'transmission_type_id' => $this->transmission_type_id,
            'fuel_type' => $this->fuelType?->name,
            'fuel_type_id' => $this->fuel_type_id,
            'seats' => $this->seating_capacity,
            'quantity' => (int) ($this->quantity ?? 1),
            'available_units' => (int) ($this->available_units ?? 1),
            'number_of_doors' => $this->number_of_doors,
            'mileage' => $this->mileage,
            'interior_color' => $this->interior_color,
            'exterior_color' => $this->exterior_color,
            'price_per_day' => (float) $this->daily_rate,
            'reservation_fee' => (float) ($this->reservation_fee ?? 500),
            'rating' => (float) ($this->rating ?? 5.0),
            'rating_count' => (int) ($this->rating_count ?? 0),
            'pickup_address' => $this->pickup_address,
            'pickup_latitude' => $this->pickup_latitude,
            'pickup_longitude' => $this->pickup_longitude,
            'distance_km' => isset($this->distance_km) ? round($this->distance_km, 1) : null,
            'description' => $this->description,
            'image_url' => $this->cover_photo
                ? $request->getSchemeAndHttpHost().'/storage/'.$this->cover_photo
                : ($this->images->first() ? $request->getSchemeAndHttpHost().'/storage/'.$this->images->first()->image_path : null),
            'images' => $this->images->map(function ($img) use ($request) {
                return [
                    'id' => $img->id,
                    'image_url' => $request->getSchemeAndHttpHost().'/storage/'.$img->image_path,
                    'is_cover' => (bool) $img->is_cover,
                    'sort_order' => (int) $img->sort_order,
                ];
            })->values(),
            'availability_status' => $this->availability_status,
            'is_available' => $this->is_active && $this->availability_status === 'available' && ($this->available_units ?? 1) > 0,
            'operator' => [
                'id' => $operator?->id,
                'name' => trim(($operator?->first_name ?? '').' '.($operator?->last_name ?? '')),
                'email' => $operator?->email,
                'mobile_number' => $operator?->mobile_number,
                'profile_photo' => $operator?->profile_photo
                    ? $request->getSchemeAndHttpHost().'/storage/'.$operator->profile_photo
                    : null,
                'business_name' => $profile?->business_name,
                'business_email' => $profile?->business_email,
                'business_contact_number' => $profile?->business_contact_number,
                'street_address' => $profile?->street_address,
                'barangay' => $profile?->barangay,
                'municipality' => $profile?->municipality,
                'accepted_payment_methods' => $profile?->accepted_payment_methods,
                'account_name' => $profile?->account_name,
                'account_number' => $profile?->account_number,
                'qr_code' => $profile?->qr_code
                    ? $request->getSchemeAndHttpHost().'/storage/'.$profile->qr_code
                    : null,
            ],
        ];
    }
}
