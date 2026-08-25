<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\VehicleResource;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VehicleController extends Controller
{
    public function options(): JsonResponse
    {
        $tables = [
            'vehicle_types',
            'vehicle_brands',
            'body_types',
            'transmission_types',
            'fuel_types',
        ];

        $options = [];
        foreach ($tables as $table) {
            $options[$table] = DB::table($table)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']);
        }

        return response()->json(['success' => true, 'data' => $options]);
    }

    public function index(Request $request): JsonResponse
    {
        $vehicles = Vehicle::with([
                'operator.operatorProfile',
                'vehicleType',
                'brand',
                'bodyType',
                'transmissionType',
                'fuelType',
            ])
            ->where('is_active', true)
            ->where('availability_status', 'available')
            ->whereHas('operator', fn ($query) => $query
                ->where('role', 'operator')
                ->where('account_status', 'active'))
            ->latest()
            ->get();

        $latitude = $request->float('latitude');
        $longitude = $request->float('longitude');
        $radius = min(max($request->float('radius', 10), 1), 100);

        if ($request->has(['latitude', 'longitude'])) {
            $vehicles = $vehicles
                ->filter(fn (Vehicle $vehicle) => $vehicle->pickup_latitude !== null && $vehicle->pickup_longitude !== null)
                ->map(function (Vehicle $vehicle) use ($latitude, $longitude) {
                    $vehicle->distance_km = $this->distanceInKilometers(
                        $latitude,
                        $longitude,
                        (float) $vehicle->pickup_latitude,
                        (float) $vehicle->pickup_longitude,
                    );

                    return $vehicle;
                })
                ->filter(fn (Vehicle $vehicle) => $vehicle->distance_km <= $radius)
                ->sortBy('distance_km')
                ->values();
        }

        return response()->json([
            'success' => true,
            'data' => VehicleResource::collection($vehicles),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'model' => ['required', 'string', 'max:100'],
            'year_model' => ['required', 'integer', 'min:1950', 'max:'.(date('Y') + 1)],
            'plate_number' => ['required', 'string', 'max:30'],
            'vehicle_type_id' => ['required', 'exists:vehicle_types,id'],
            'brand_id' => ['required', 'exists:vehicle_brands,id'],
            'body_type_id' => ['nullable', 'exists:body_types,id'],
            'transmission_type_id' => ['required', 'exists:transmission_types,id'],
            'fuel_type_id' => ['required', 'exists:fuel_types,id'],
            'seating_capacity' => ['required', 'integer', 'min:1', 'max:20'],
            'number_of_doors' => ['required', 'integer', 'min:1', 'max:10'],
            'mileage' => ['required', 'integer', 'min:0'],
            'interior_color' => ['nullable', 'string', 'max:50'],
            'exterior_color' => ['nullable', 'string', 'max:50'],
            'daily_rate' => ['required', 'numeric', 'min:1', 'max:999999.99'],
            'reservation_fee' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'available_from' => ['nullable', 'date'],
            'available_until' => ['nullable', 'date', 'after_or_equal:available_from'],
            'min_driver_age' => ['required', 'integer', 'min:18', 'max:100'],
            'min_driving_experience' => ['required', 'integer', 'min:0', 'max:50'],
            'description' => ['nullable', 'string', 'max:2000'],
            'fuel_policy' => ['nullable', 'string', 'max:2000'],
            'late_return_policy' => ['nullable', 'string', 'max:2000'],
            'cancellation_policy' => ['nullable', 'string', 'max:2000'],
            'smoking_policy' => ['nullable', 'string', 'max:2000'],
            'pet_policy' => ['nullable', 'string', 'max:2000'],
            'additional_driver_policy' => ['nullable', 'string', 'max:2000'],
            'other_policies' => ['nullable', 'string', 'max:2000'],
            'pickup_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'pickup_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        if ($request->hasFile('image')) {
            $validated['cover_photo'] = $request->file('image')->store('vehicle-images', 'public');
        }

        unset($validated['image']);
        $profile = $request->user()->operatorProfile;
        $validated['operator_id'] = $request->user()->id;
        $validated['pickup_address'] = implode(', ', array_filter([
            $profile?->street_address,
            $profile?->barangay,
            $profile?->municipality,
        ]));

        $vehicle = Vehicle::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Vehicle listed successfully.',
            'data' => new VehicleResource($vehicle->load([
                'operator.operatorProfile',
                'vehicleType',
                'brand',
                'bodyType',
                'transmissionType',
                'fuelType',
            ])),
        ], 201);
    }

    public function mine(Request $request): JsonResponse
    {
        $vehicles = Vehicle::with([
                'operator.operatorProfile',
                'vehicleType',
                'brand',
                'bodyType',
                'transmissionType',
                'fuelType',
            ])
            ->where('operator_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => VehicleResource::collection($vehicles),
        ]);
    }

    private function distanceInKilometers(float $latitude, float $longitude, float $targetLatitude, float $targetLongitude): float
    {
        $earthRadius = 6371;
        $latitudeDelta = deg2rad($targetLatitude - $latitude);
        $longitudeDelta = deg2rad($targetLongitude - $longitude);
        $a = sin($latitudeDelta / 2) ** 2
            + cos(deg2rad($latitude)) * cos(deg2rad($targetLatitude))
            * sin($longitudeDelta / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
