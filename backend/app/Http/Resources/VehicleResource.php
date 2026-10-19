<?php

namespace App\Http\Resources;

use App\Models\Booking;
use App\Models\Vehicle;
use App\Services\DemandPricingService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VehicleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $operator = $this->operator;
        $profile = $operator?->operatorProfile;

        $demand = DemandPricingService::calculateVehicleDemand($this->resource);

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
            'price_per_day' => (float) $demand['effective_price'],
            'base_price_per_day' => (float) ($this->base_price_per_day ?: $this->daily_rate ?: 1500),
            'demand_pricing' => $demand,
            'current_odometer' => (int) ($this->current_odometer ?: 0),
            'last_service_odometer' => (int) ($this->last_service_odometer ?: 0),
            'service_interval_km' => (int) ($this->service_interval_km ?: 5000),
            'reservation_fee' => round((float) $demand['effective_price'] * 0.05, 2),
            'reservation_fee_percentage' => 5,
            'rating' => ((int) ($this->rating_count ?? 0) > 0 && $this->rating !== null) ? (float) $this->rating : null,
            'rating_count' => (int) ($this->rating_count ?? 0),
            'min_driver_age' => (int) ($this->min_driver_age ?? 21),
            'min_driving_experience' => $this->min_driving_experience,
            'fuel_policy' => $this->fuel_policy ?? 'Same-to-Same (Return with same level of fuel)',
            'late_return_policy' => $this->late_return_policy ?? 'Late returns subject to hourly rate penalty after 1 hour grace period',
            'cancellation_policy' => $this->cancellation_policy ?? 'Free cancellation before host confirmation',
            'smoking_policy' => $this->smoking_policy ?? 'No smoking allowed inside the vehicle',
            'pet_policy' => $this->pet_policy ?? 'Pets allowed with prior host approval and carrier',
            'additional_driver_policy' => $this->additional_driver_policy ?? 'Allowed with verified license presentation',
            'other_policies' => $this->other_policies,
            'pickup_address' => $this->pickup_address ?: ($profile ? trim(($profile->street_address ? $profile->street_address.', ' : '').($profile->barangay ? $profile->barangay.', ' : '').($profile->municipality ?? 'Pinamalayan, Oriental Mindoro'), ', ') : 'Pinamalayan, Oriental Mindoro'),
            'pickup_latitude' => ($this->pickup_latitude !== null && is_numeric($this->pickup_latitude))
                ? (float) $this->pickup_latitude
                : ($profile ? $profile->getCoordinates()['latitude'] : 13.0453),
            'pickup_longitude' => ($this->pickup_longitude !== null && is_numeric($this->pickup_longitude))
                ? (float) $this->pickup_longitude
                : ($profile ? $profile->getCoordinates()['longitude'] : 121.4878),
            'distance_km' => isset($this->distance_km) ? round($this->distance_km, 1) : null,
            'features' => $this->features ?? [],
            'description' => $this->description,
            'image_url' => Vehicle::resolveStorageUrl(
                $this->cover_photo ?: ($this->images->first()?->image_path),
                $request->getSchemeAndHttpHost()
            ),
            'images' => $this->images->map(function ($img) use ($request) {
                return [
                    'id' => $img->id,
                    'image_url' => Vehicle::resolveStorageUrl($img->image_path, $request->getSchemeAndHttpHost()),
                    'is_cover' => (bool) $img->is_cover,
                    'sort_order' => (int) $img->sort_order,
                ];
            })->values(),
            'availability_status' => $this->availability_status,
            'is_rented' => Booking::where('vehicle_id', $this->id)
                ->whereIn('status', [
                    'approved',
                    'awaiting_pickup',
                    'pickup_in_progress',
                    'ready_to_start',
                    'trip_in_progress',
                    'ongoing',
                    'return_pending',
                ])
                ->where('end_date', '>=', now()->toDateString())
                ->exists(),
            'is_available' => $this->is_active && $this->availability_status === 'available' && ($this->available_units ?? 1) > 0,
            'operator' => [
                'id' => $operator?->id,
                'name' => trim(($operator?->first_name ?? '').' '.($operator?->last_name ?? '')),
                'email' => $operator?->email,
                'mobile_number' => $operator?->mobile_number,
                'profile_photo' => Vehicle::resolveStorageUrl($operator?->profile_photo, $request->getSchemeAndHttpHost()),
                'business_name' => $profile?->business_name,
                'business_email' => $profile?->business_email,
                'business_contact_number' => $profile?->business_contact_number,
                'street_address' => $profile?->street_address,
                'barangay' => $profile?->barangay,
                'municipality' => $profile?->municipality,
                'latitude' => $profile ? $profile->getCoordinates()['latitude'] : 13.0453,
                'longitude' => $profile ? $profile->getCoordinates()['longitude'] : 121.4878,
                'accepted_payment_methods' => $profile?->accepted_payment_methods,
                'account_name' => $profile?->account_name,
                'account_number' => $profile?->account_number,
                'qr_code' => Vehicle::resolveStorageUrl($profile?->qr_code, $request->getSchemeAndHttpHost()),
            ],
            'reviews' => $this->relationLoaded('bookings')
                ? $this->bookings
                    ->where('is_review_hidden', false)->whereNotNull('rating')
                    ->map(function ($b) use ($request) {
                        $renter = $b->renter;
                        $fullName = trim(($renter?->first_name ?? '').' '.($renter?->last_name ?? ''));

                        return [
                            'id' => $b->id,
                            'renter_name' => $fullName !== '' ? $fullName : 'Verified Renter',
                            'renter_photo' => Vehicle::resolveStorageUrl($renter?->profile_photo, $request->getSchemeAndHttpHost()),
                            'rating' => (int) $b->rating,
                            'review' => $b->review,
                            'created_at' => $b->updated_at ? $b->updated_at->diffForHumans() : 'Recently',
                        ];
                    })
                    ->values()
                : [],
        ];
    }
}
