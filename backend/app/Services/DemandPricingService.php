<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Vehicle;

class DemandPricingService
{
    /**
     * Compute dynamic demand metrics and recommended pricing for a vehicle
     */
    public static function calculateVehicleDemand(Vehicle $vehicle): array
    {
        $basePrice = (float) ($vehicle->base_price_per_day ?: $vehicle->daily_rate ?: 1500.00);

        // 1. Check municipality fleet demand & occupancy
        $operator = $vehicle->operator;
        $municipality = $operator?->operatorProfile?->municipality ?: 'Calapan City';

        $totalAreaVehicles = Vehicle::whereHas('operator.operatorProfile', function ($q) use ($municipality) {
            $q->where('municipality', $municipality);
        })->where(function ($q) {
            $q->where('availability_status', 'available')
              ->orWhereNull('availability_status');
        })->count();

        $totalAreaVehicles = max(1, $totalAreaVehicles);

        $activeBookingsCount = Booking::whereHas('vehicle.operator.operatorProfile', function ($q) use ($municipality) {
            $q->where('municipality', $municipality);
        })
        ->whereIn('status', ['pending_verification', 'approved', 'ongoing'])
        ->where('end_date', '>=', now()->toDateString())
        ->count();

        $occupancyRate = min(1.0, $activeBookingsCount / $totalAreaVehicles);

        // 2. Factor in Weekend / Peak Tourism day multiplier (Friday to Sunday in Oriental Mindoro)
        $dayOfWeek = now()->dayOfWeek; // 0 = Sun, 5 = Fri, 6 = Sat
        $isWeekend = in_array($dayOfWeek, [0, 5, 6]);

        // 3. Category & vehicle popularity check
        $vehicleBookingCount = Booking::where('vehicle_id', $vehicle->id)
            ->whereIn('status', ['approved', 'ongoing', 'completed'])
            ->where('created_at', '>=', now()->subDays(30))
            ->count();

        // 4. Calculate multiplier
        $multiplier = 1.00;

        if ($occupancyRate >= 0.70 || $vehicleBookingCount >= 5) {
            $multiplier += 0.20; // High area occupancy
        } elseif ($occupancyRate >= 0.40 || $vehicleBookingCount >= 2) {
            $multiplier += 0.10; // Moderate demand
        } elseif ($occupancyRate < 0.20 && $totalAreaVehicles >= 5) {
            $multiplier -= 0.05; // Low demand promotion
        }

        if ($isWeekend) {
            $multiplier += 0.10; // Weekend tourism boost
        }

        $multiplier = round(max(0.85, min(1.50, $multiplier)), 2);
        $dynamicPrice = round($basePrice * $multiplier, -1); // round to nearest 10

        // Determine badge / demand label
        if ($multiplier >= 1.25) {
            $demandLevel = 'Peak Demand';
            $demandBadge = '🔥 Peak Demand';
            $description = "High booking volume in {$municipality}. Rates adjusted to maximize host revenue.";
        } elseif ($multiplier >= 1.10) {
            $demandLevel = 'High Demand';
            $demandBadge = '⚡ High Demand';
            $description = "Increased rental inquiries in {$municipality}.";
        } elseif ($multiplier <= 0.95) {
            $demandLevel = 'Special Rate';
            $demandBadge = '🏷️ Best Value';
            $description = "Competitive rate to attract fast bookings.";
        } else {
            $demandLevel = 'Normal';
            $demandBadge = 'Standard Rate';
            $description = "Standard seasonal rate.";
        }

        return [
            'base_price' => $basePrice,
            'demand_multiplier' => $multiplier,
            'dynamic_price' => $dynamicPrice,
            'effective_price' => $vehicle->is_dynamic_pricing_enabled ? $dynamicPrice : (float) $vehicle->price_per_day,
            'demand_level' => $demandLevel,
            'demand_badge' => $demandBadge,
            'occupancy_rate' => round($occupancyRate * 100, 1) . '%',
            'is_dynamic_pricing_enabled' => (bool) $vehicle->is_dynamic_pricing_enabled,
            'reason' => $description,
        ];
    }
}
