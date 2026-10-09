<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleMaintenance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaintenanceController extends Controller
{
    /**
     * Get maintenance overview and health status of all vehicles in operator fleet
     */
    public function index(Request $request): JsonResponse
    {
        $operatorId = $request->user()->id;

        $vehicles = Vehicle::with(['brand', 'vehicleType', 'maintenances' => function ($q) {
            $q->latest('service_date');
        }])
        ->where('operator_id', $operatorId)
        ->get()
        ->map(function ($vehicle) {
            $currentOdo = (int) ($vehicle->current_odometer ?: 0);
            $lastServiceOdo = (int) ($vehicle->last_service_odometer ?: 0);
            $interval = (int) ($vehicle->service_interval_km ?: 5000);

            $kmSinceService = max(0, $currentOdo - $lastServiceOdo);
            $kmRemaining = $interval - $kmSinceService;

            if ($kmRemaining <= 0) {
                $healthStatus = 'overdue';
                $healthLabel = 'Service Overdue (' . abs($kmRemaining) . ' km past)';
                $healthBadge = '🔴 Service Required';
            } elseif ($kmRemaining <= 500) {
                $healthStatus = 'due_soon';
                $healthLabel = 'Service Due Soon (' . $kmRemaining . ' km remaining)';
                $healthBadge = '🟡 Due Soon';
            } else {
                $healthStatus = 'good';
                $healthLabel = 'Optimal (' . $kmRemaining . ' km until service)';
                $healthBadge = '🟢 Good Condition';
            }

            // Generate specific maintenance recommendations
            $recommendations = [];
            if ($kmRemaining <= 0) {
                $recommendations[] = [
                    'type' => 'Oil & Filter Change',
                    'urgency' => 'critical',
                    'message' => 'Vehicle has exceeded regular 5,000 km oil change milestone. Schedule engine oil & filter replacement.',
                ];
                $recommendations[] = [
                    'type' => 'Brake & Tire Inspection',
                    'urgency' => 'high',
                    'message' => 'Inspect brake pads and tire tread wear before releasing for long-distance rental trips.',
                ];
            } elseif ($kmRemaining <= 500) {
                $recommendations[] = [
                    'type' => 'Routine Preventive Maintenance',
                    'urgency' => 'medium',
                    'message' => "Approaching {$interval} km service threshold in {$kmRemaining} km. Prepare maintenance schedule.",
                ];
            }

            return [
                'id' => $vehicle->id,
                'name' => $vehicle->name,
                'plate_number' => $vehicle->plate_number,
                'brand' => $vehicle->brand?->name,
                'model' => $vehicle->model,
                'image_url' => $vehicle->primary_image_url,
                'current_odometer' => $currentOdo,
                'last_service_odometer' => $lastServiceOdo,
                'service_interval_km' => $interval,
                'km_since_last_service' => $kmSinceService,
                'km_remaining_until_service' => $kmRemaining,
                'health_status' => $healthStatus,
                'health_label' => $healthLabel,
                'health_badge' => $healthBadge,
                'recommendations' => $recommendations,
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
        $validated = $request->validate([
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'service_type' => ['required', 'string', 'max:150'],
            'mileage_at_service' => ['required', 'integer', 'min:0'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'service_date' => ['required', 'date'],
            'performed_by' => ['nullable', 'string', 'max:150'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $vehicle = Vehicle::where('operator_id', $request->user()->id)->findOrFail($validated['vehicle_id']);

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
            'last_service_odometer' => $validated['mileage_at_service'],
            'current_odometer' => max((int) $vehicle->current_odometer, $validated['mileage_at_service']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Maintenance record logged successfully.',
            'data' => $maintenance,
        ], 201);
    }
}
