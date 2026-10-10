<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\VehicleResource;
use App\Models\Vehicle;
use App\Models\VehicleImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

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
        $query = Vehicle::with([
                'operator.operatorProfile',
                'vehicleType',
                'brand',
                'bodyType',
                'transmissionType',
                'fuelType',
                'images',
            ])
            ->where('is_active', true)
            ->where('availability_status', 'available')
            ->where(function ($q) {
                $q->whereRaw('(SELECT COUNT(*) FROM bookings WHERE bookings.vehicle_id = vehicles.id AND bookings.status IN (\'approved\', \'awaiting_pickup\', \'pickup_in_progress\', \'ready_to_start\', \'trip_in_progress\', \'ongoing\', \'return_pending\') AND bookings.end_date >= CURRENT_DATE) < COALESCE(vehicles.quantity, 1)');
            })
            ->whereHas('operator', fn ($q) => $q
                ->where('role', 'operator')
                ->where('account_status', 'active'));

        $searchTerm = trim($request->input('search') ?? $request->input('query') ?? $request->input('q') ?? '');
        if ($searchTerm !== '') {
            $terms = array_filter(explode(' ', $searchTerm));
            foreach ($terms as $term) {
                $likeTerm = "%{$term}%";
                $query->where(function ($q) use ($likeTerm) {
                    $q->where('name', 'LIKE', $likeTerm)
                      ->orWhere('model', 'LIKE', $likeTerm)
                      ->orWhere('year_model', 'LIKE', $likeTerm)
                      ->orWhere('description', 'LIKE', $likeTerm)
                      ->orWhere('pickup_address', 'LIKE', $likeTerm)
                      ->orWhereHas('brand', fn ($b) => $b->where('name', 'LIKE', $likeTerm))
                      ->orWhereHas('vehicleType', fn ($vt) => $vt->where('name', 'LIKE', $likeTerm))
                      ->orWhereHas('bodyType', fn ($bt) => $bt->where('name', 'LIKE', $likeTerm))
                      ->orWhereHas('transmissionType', fn ($tt) => $tt->where('name', 'LIKE', $likeTerm))
                      ->orWhereHas('fuelType', fn ($ft) => $ft->where('name', 'LIKE', $likeTerm))
                      ->orWhereHas('operator', function ($op) use ($likeTerm) {
                          $op->where('first_name', 'LIKE', $likeTerm)
                             ->orWhere('last_name', 'LIKE', $likeTerm)
                             ->orWhere(DB::raw("CONCAT(first_name, ' ', last_name)"), 'LIKE', $likeTerm)
                             ->orWhereHas('operatorProfile', function ($opp) use ($likeTerm) {
                                 $opp->where('business_name', 'LIKE', $likeTerm)
                                     ->orWhere('street_address', 'LIKE', $likeTerm)
                                     ->orWhere('barangay', 'LIKE', $likeTerm)
                                     ->orWhere('municipality', 'LIKE', $likeTerm);
                             });
                      });
                });
            }
        }

        if ($request->query('sort') === 'top_rated') {
            $query->orderBy('rating', 'desc')->orderBy('rating_count', 'desc');
        } elseif ($request->boolean('random', true) && $searchTerm === '') {
            $query->inRandomOrder();
        } else {
            $query->latest();
        }

        $vehicles = $query->get();

        $latitude = $request->float('latitude');
        $longitude = $request->float('longitude');
        $radius = min(max($request->float('radius', 10), 1), 100);

        if ($request->has(['latitude', 'longitude'])) {
            $vehicles = $vehicles
                ->filter(fn (Vehicle $vehicle) => $vehicle->pickup_latitude !== null && $vehicle->pickup_longitude !== null)
                ->map(function (Vehicle $vehicle) use ($latitude, $longitude) {
                    $earthRadius = 6371;
                    $latFrom = deg2rad($latitude);
                    $lonFrom = deg2rad($longitude);
                    $latTo = deg2rad((float) $vehicle->pickup_latitude);
                    $lonTo = deg2rad((float) $vehicle->pickup_longitude);

                    $latDelta = $latTo - $latFrom;
                    $lonDelta = $lonTo - $lonFrom;

                    $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) +
                        cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));

                    $vehicle->distance_km = $angle * $earthRadius;
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

    public function show(int $id): JsonResponse
    {
        $vehicle = Vehicle::with([
            'operator.operatorProfile',
            'vehicleType',
            'brand',
            'bodyType',
            'transmissionType',
            'fuelType',
            'images',
            'bookings' => function ($query) {
                $query->whereNotNull('rating')
                    ->with('renter')
                    ->latest('updated_at')
                    ->take(20);
            },
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => new VehicleResource($vehicle),
        ]);
    }

    public function byOperator($id): JsonResponse
    {
        if (!is_numeric($id)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid operator identifier.',
            ], 404);
        }

        $id = (int) $id;

        $operatorUser = \App\Models\User::with('operatorProfile')->find($id);

        if (!$operatorUser) {
            return response()->json([
                'success' => false,
                'message' => 'Operator not found.',
            ], 404);
        }

        $vehicles = Vehicle::with([
                'operator.operatorProfile',
                'vehicleType',
                'brand',
                'bodyType',
                'transmissionType',
                'fuelType',
                'images',
            ])
            ->where('operator_id', $id)
            ->where('is_active', true)
            ->latest()
            ->get();

        $profile = $operatorUser->operatorProfile;
        $displayName = trim(($operatorUser->first_name ?? '').' '.($operatorUser->last_name ?? ''));
        $coords = $profile ? $profile->getCoordinates() : ['latitude' => 13.0453, 'longitude' => 121.4878];

        return response()->json([
            'success' => true,
            'operator' => [
                'id' => $operatorUser->id,
                'name' => $displayName ?: 'Verified Operator',
                'email' => $operatorUser->email,
                'mobile_number' => $operatorUser->mobile_number,
                'profile_photo' => $operatorUser->profile_photo
                    ? (str_starts_with($operatorUser->profile_photo, 'http')
                        ? $operatorUser->profile_photo
                        : request()->getSchemeAndHttpHost().'/storage/'.$operatorUser->profile_photo)
                    : null,
                'business_name' => $profile?->business_name ?? ($displayName ?: 'Verified Operator'),
                'business_email' => $profile?->business_email ?? $operatorUser->email,
                'business_contact_number' => $profile?->business_contact_number ?? $operatorUser->mobile_number,
                'street_address' => $profile?->street_address,
                'barangay' => $profile?->barangay,
                'municipality' => $profile?->municipality,
                'latitude' => $coords['latitude'],
                'longitude' => $coords['longitude'],
            ],
            'data' => VehicleResource::collection($vehicles),
        ]);
    }

    public function mine(Request $request): JsonResponse
    {
        return $this->myVehicles($request);
    }

    public function myVehicles(Request $request): JsonResponse
    {
        $vehicles = Vehicle::with([
                'vehicleType',
                'brand',
                'bodyType',
                'transmissionType',
                'fuelType',
                'images',
            ])
            ->where('operator_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => VehicleResource::collection($vehicles),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $operator = $request->user();

        if ($operator->account_status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Your operator account is currently under review by administrators. You will be able to list vehicles once approved.',
            ], 403);
        }

        $profile = $operator->operatorProfile;

        // Validation: Operator must have setup payment accounts before uploading vehicle
        if (!$profile || empty(trim($profile->account_number ?? ''))) {
            return response()->json([
                'success' => false,
                'message' => 'Please set up your payment account details in your business profile before listing a vehicle.',
            ], 422);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'vehicle_type_id' => ['required', 'exists:vehicle_types,id'],
            'brand_id' => ['nullable', 'exists:vehicle_brands,id'],
            'custom_brand' => ['nullable', 'string', 'max:100'],
            'model' => ['required', 'string', 'max:255'],
            'year_model' => ['required', 'integer', 'min:1990', 'max:'.(date('Y') + 1)],
            'plate_number' => ['required', 'string', 'max:20', 'unique:vehicles,plate_number'],
            'body_type_id' => ['nullable', 'exists:body_types,id'],
            'transmission_type_id' => ['required', 'exists:transmission_types,id'],
            'fuel_type_id' => ['required', 'exists:fuel_types,id'],
            'seating_capacity' => ['required', 'integer', 'min:1', 'max:50'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:50'],
            'number_of_doors' => ['nullable', 'integer', 'min:0', 'max:10'],
            'mileage' => ['nullable', 'integer', 'min:0'],
            'interior_color' => ['nullable', 'string', 'max:50'],
            'exterior_color' => ['nullable', 'string', 'max:50'],
            'daily_rate' => ['required', 'numeric', 'min:1'],
            'reservation_fee' => ['nullable', 'numeric', 'min:0'],
            'features' => ['nullable'],
            'description' => ['nullable', 'string'],
            'pickup_address' => ['nullable', 'string'],
            'pickup_latitude' => ['nullable', 'numeric'],
            'pickup_longitude' => ['nullable', 'numeric'],
            'cover_photo' => ['nullable', 'image', 'max:10240'],
            'images' => ['nullable', 'array'],
            'images.*' => ['image', 'max:10240'],
        ]);

        // Handle custom brand if provided
        $brandId = $validated['brand_id'] ?? null;
        if (!empty($validated['custom_brand'])) {
            $brandName = trim($validated['custom_brand']);
            $brandSlug = str($brandName)->slug()->value();
            
            $brand = DB::table('vehicle_brands')->where('slug', $brandSlug)->first();
            if ($brand) {
                $brandId = $brand->id;
            } else {
                $brandId = DB::table('vehicle_brands')->insertGetId([
                    'name' => $brandName,
                    'slug' => $brandSlug,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        if (!$brandId) {
            return response()->json([
                'success' => false,
                'message' => 'Please select a brand or enter a custom brand name.',
            ], 422);
        }

        $coverPhotoPath = null;
        if ($request->hasFile('cover_photo')) {
            $coverPhotoPath = $request->file('cover_photo')->store('vehicles', 'public');
        } elseif ($request->hasFile('images')) {
            $files = $request->file('images');
            if (count($files) > 0) {
                $coverPhotoPath = $files[0]->store('vehicles', 'public');
            }
        }

        $qty = $validated['quantity'] ?? 1;

        // Parse features if passed as JSON string from multipart/form-data
        $features = $validated['features'] ?? null;
        if (is_string($features)) {
            $decoded = json_decode($features, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $features = $decoded;
            }
        }

        $coords = $profile ? $profile->getCoordinates() : ['latitude' => 13.0453, 'longitude' => 121.4878];
        $pickupLat = isset($validated['pickup_latitude']) && is_numeric($validated['pickup_latitude'])
            ? (float) $validated['pickup_latitude']
            : $coords['latitude'];
        $pickupLng = isset($validated['pickup_longitude']) && is_numeric($validated['pickup_longitude'])
            ? (float) $validated['pickup_longitude']
            : $coords['longitude'];

        $defaultAddress = $profile
            ? trim(($profile->street_address ? $profile->street_address.', ' : '').($profile->barangay ? $profile->barangay.', ' : '').($profile->municipality ?? 'Pinamalayan, Oriental Mindoro'), ', ')
            : 'Pinamalayan, Oriental Mindoro';
        $pickupAddress = !empty($validated['pickup_address']) ? $validated['pickup_address'] : $defaultAddress;

        $vehicle = Vehicle::create([
            'operator_id' => $operator->id,
            'name' => $validated['name'],
            'vehicle_type_id' => $validated['vehicle_type_id'],
            'brand_id' => $brandId,
            'model' => $validated['model'],
            'year_model' => $validated['year_model'],
            'plate_number' => $validated['plate_number'],
            'body_type_id' => $validated['body_type_id'] ?? null,
            'transmission_type_id' => $validated['transmission_type_id'],
            'fuel_type_id' => $validated['fuel_type_id'],
            'seating_capacity' => $validated['seating_capacity'],
            'quantity' => $qty,
            'available_units' => $qty,
            'number_of_doors' => $validated['number_of_doors'] ?? 4,
            'mileage' => $validated['mileage'] ?? 0,
            'interior_color' => $validated['interior_color'] ?? null,
            'exterior_color' => $validated['exterior_color'] ?? null,
            'daily_rate' => $validated['daily_rate'],
            'reservation_fee' => $validated['reservation_fee'] ?? 500,
            'features' => $features,
            'description' => $validated['description'] ?? null,
            'pickup_address' => $pickupAddress,
            'pickup_latitude' => $pickupLat,
            'pickup_longitude' => $pickupLng,
            'cover_photo' => $coverPhotoPath,
            'availability_status' => 'available',
            'is_active' => true,
        ]);

        // Save uploaded multiple images to vehicle_images table
        if ($request->hasFile('images')) {
            $files = $request->file('images');
            foreach ($files as $index => $file) {
                // If coverPhoto was taken from first image, save it or store all
                $path = ($index === 0 && $coverPhotoPath) ? $coverPhotoPath : $file->store('vehicles', 'public');
                VehicleImage::create([
                    'vehicle_id' => $vehicle->id,
                    'image_path' => $path,
                    'is_cover' => $index === 0,
                    'sort_order' => $index,
                ]);
            }
        } elseif ($coverPhotoPath) {
            VehicleImage::create([
                'vehicle_id' => $vehicle->id,
                'image_path' => $coverPhotoPath,
                'is_cover' => true,
                'sort_order' => 0,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Vehicle uploaded successfully.',
            'data' => new VehicleResource($vehicle->load([
                'operator.operatorProfile',
                'vehicleType',
                'brand',
                'bodyType',
                'transmissionType',
                'fuelType',
                'images',
            ])),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $vehicle = Vehicle::where('operator_id', $request->user()->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'vehicle_type_id' => ['sometimes', 'required', 'exists:vehicle_types,id'],
            'brand_id' => ['sometimes', 'required', 'exists:vehicle_brands,id'],
            'model' => ['sometimes', 'required', 'string', 'max:255'],
            'year_model' => ['sometimes', 'required', 'integer'],
            'plate_number' => ['sometimes', 'required', 'string', 'max:20', 'unique:vehicles,plate_number,'.$vehicle->id],
            'body_type_id' => ['nullable', 'exists:body_types,id'],
            'transmission_type_id' => ['sometimes', 'required', 'exists:transmission_types,id'],
            'fuel_type_id' => ['sometimes', 'required', 'exists:fuel_types,id'],
            'seating_capacity' => ['sometimes', 'required', 'integer'],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'daily_rate' => ['sometimes', 'required', 'numeric', 'min:1'],
            'reservation_fee' => ['nullable', 'numeric', 'min:0'],
            'features' => ['nullable'],
            'description' => ['nullable', 'string'],
            'pickup_address' => ['nullable', 'string'],
            'pickup_latitude' => ['nullable', 'numeric'],
            'pickup_longitude' => ['nullable', 'numeric'],
            'availability_status' => ['sometimes', 'in:available,unavailable,maintenance'],
            'cover_photo' => ['nullable', 'image', 'max:10240'],
            'images' => ['nullable', 'array'],
            'images.*' => ['image', 'max:10240'],
        ]);

        if (isset($validated['features']) && is_string($validated['features'])) {
            $decoded = json_decode($validated['features'], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $validated['features'] = $decoded;
            }
        }

        if ($request->hasFile('cover_photo')) {
            if ($vehicle->cover_photo && Storage::disk('public')->exists($vehicle->cover_photo)) {
                Storage::disk('public')->delete($vehicle->cover_photo);
            }
            $validated['cover_photo'] = $request->file('cover_photo')->store('vehicles', 'public');
        }

        if (isset($validated['availability_status']) && $validated['availability_status'] === 'available') {
            $activeCount = \App\Models\Booking::where('vehicle_id', $vehicle->id)
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
                ->count();

            $totalUnits = max(1, (int) ($vehicle->quantity ?? 1));
            if ($activeCount >= $totalUnits) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot set to Available: this vehicle is currently rented out on an active trip. It will automatically become available once the trip is completed.',
                ], 422);
            }
        }

        if (isset($validated['quantity'])) {
            $diff = $validated['quantity'] - ($vehicle->quantity ?? 1);
            $validated['available_units'] = max(0, ($vehicle->available_units ?? 1) + $diff);
        }

        $vehicle->update($validated);

        if ($request->hasFile('images')) {
            $files = $request->file('images');
            $currentCount = $vehicle->images()->count();
            foreach ($files as $index => $file) {
                $path = $file->store('vehicles', 'public');
                VehicleImage::create([
                    'vehicle_id' => $vehicle->id,
                    'image_path' => $path,
                    'is_cover' => $currentCount === 0 && $index === 0,
                    'sort_order' => $currentCount + $index,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Vehicle details updated successfully.',
            'data' => new VehicleResource($vehicle->fresh(['vehicleType', 'brand', 'bodyType', 'transmissionType', 'fuelType', 'operator', 'images'])),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $vehicle = Vehicle::where('operator_id', $request->user()->id)->findOrFail($id);

        if ($vehicle->cover_photo && Storage::disk('public')->exists($vehicle->cover_photo)) {
            Storage::disk('public')->delete($vehicle->cover_photo);
        }

        $vehicle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Vehicle listing deleted successfully.',
        ]);
    }
}
