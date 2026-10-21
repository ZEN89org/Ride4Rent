<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleMaintenance;
use App\Services\MaintenanceRecommendations;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaintenanceController extends Controller
{
    /**
     * Get maintenance overview and health status of all vehicles in operator fleet
     */
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === "operator", 403);
        $operatorId = $request->user()->id;

        $vehicles = Vehicle::with(['brand', 'vehicleType', 'images', 'maintenances' => function ($q) {
            $q->latest('service_date');
        }])
        ->where('operator_id', $operatorId)
        ->get()
        ->map(function ($vehicle) {
            $currentOdo = (int) ($vehicle->current_odometer ?: 0);
            $lastServiceOdo = (int) ($vehicle->last_service_odometer ?: 0);
            $interval = (int) ($vehicle->service_interval_km ?: 5000);

            return [
                'id' => $vehicle->id,
                'name' => $vehicle->name,
                'plate_number' => $vehicle->plate_number,
                'brand' => $vehicle->brand?->name,
                'model' => $vehicle->model,
                'image_url' => $vehicle->image_url,
                'current_odometer' => $currentOdo,
                'last_service_odometer' => $lastServiceOdo,
                'service_interval_km' => $interval,
                'recent_logs' => $vehicle->maintenances->take(5)->map(function ($log) {
                    return [
                        'id' => $log->id,
                        'service_type' => $log->service_type,
                        'mileage_at_service' => $log->mileage_at_service,
                        'cost' => (float) $log->cost,
                        'service_date' => $log->service_date->format('Y-m-d'),
                        'performed_by' => $log->performed_by,
                        'notes' => $log->notes,
                    ];
                }),
                ...(new MaintenanceRecommendations())->forVehicle($vehicle),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $vehicles,
        ]);
    }

    /**
     * Log a new maintenance record for a vehicle
     */
    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === "operator", 403);
        $validated = $request->validate([
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'service_type' => ['required', 'in:Oil & Filter Change,Routine Preventive Maintenance,Full Preventive Maintenance,Brake Inspection,Tire Replacement,Battery Replacement,General Repair,Other,Brake Pad Check,Tire Rotation,Engine Tune-up,Battery Change'],
            'mileage_at_service' => ['required', 'integer', 'min:0'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'service_date' => ['required', 'date', 'before_or_equal:today'],
            'performed_by' => ['nullable', 'string', 'max:150'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $maintenance = DB::transaction(function () use ($request, $validated) {
            $vehicle = Vehicle::where('operator_id', $request->user()->id)->lockForUpdate()->findOrFail($validated['vehicle_id']);

            $nextOdo = $validated['mileage_at_service'] + ($vehicle->service_interval_km ?: 5000);

            $maintenance = VehicleMaintenance::create([
                'vehicle_id' => $vehicle->id,
                'operator_id' => $request->user()->id,
                'service_type' => $validated['service_type'],
                'mileage_at_service' => $validated['mileage_at_service'],
                'cost' => $validated['cost'] ?? 0.00,
                'service_date' => $validated['service_date'],
                'next_service_mileage' => $nextOdo,
                'status' => 'completed',
                'performed_by' => $validated['performed_by'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Update vehicle odometer standing
            $vehicle->update([
                'last_service_odometer' => MaintenanceRecommendations::resetsRoutineInterval($validated['service_type'])
                    ? max((int) $vehicle->last_service_odometer, $validated['mileage_at_service']) : $vehicle->last_service_odometer,
                'current_odometer' => max((int) $vehicle->current_odometer, $validated['mileage_at_service']),
            ]);

            return $maintenance;
        });

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record logged successfully.',
            'data' => $maintenance,
        ], 201);
    }
    public function updateSchedule(Request $request, int $vehicle): JsonResponse
    {
        abort_unless($request->user()->role === 'operator', 403);
        $data = $request->validate([
            'current_odometer' => ['required', 'integer', 'min:0', 'max:999999999'],
            'last_service_odometer' => ['required', 'integer', 'min:0', 'lte:current_odometer'],
            'service_interval_km' => ['required', 'integer', 'min:100', 'max:100000'],
        ]);
        DB::transaction(function () use ($request, $vehicle, $data) {
            $record = Vehicle::where('operator_id', $request->user()->id)->lockForUpdate()->findOrFail($vehicle);
            abort_if($data['current_odometer'] < (int) $record->current_odometer, 422, 'Current odometer cannot be lower than its recorded reading.');
            $record->update($data);
        });
        return response()->json(['success' => true, 'message' => 'Maintenance schedule updated.']);
    }

}
