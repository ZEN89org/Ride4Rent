<?php

namespace App\Services;

use App\Models\Vehicle;

class MaintenanceRecommendations
{
    public static function resetsRoutineInterval(string $type): bool
    {
        return in_array($type, ['Oil & Filter Change', 'Routine Preventive Maintenance', 'Full Preventive Maintenance'], true);
    }

    public function forVehicle(Vehicle $vehicle): array
    {
        $current = max(0, (int) $vehicle->current_odometer);
        $baseline = max(0, (int) $vehicle->last_service_odometer);
        $interval = max(100, (int) ($vehicle->service_interval_km ?: 5000));
        $since = max(0, $current - $baseline);
        $remaining = $interval - $since;
        $known = $vehicle->current_odometer !== null && ($baseline > 0 || $vehicle->maintenances->contains(fn ($log) => self::resetsRoutineInterval($log->service_type)));
        $status = !$known ? 'unknown' : ($remaining <= 0 ? 'overdue' : ($remaining <= min(500, $interval * 0.1) ? 'due_soon' : 'good'));
        $recommendations = match ($status) {
            'unknown' => [['type' => 'Set service baseline', 'urgency' => 'medium', 'message' => 'Add the current odometer and the mileage of the last routine service. If the service history is unknown, arrange an inspection before relying on the service countdown.']],
            'overdue' => [
                ['type' => 'Routine service due', 'urgency' => 'high', 'message' => 'The configured '.number_format($interval).' km interval has been reached. Arrange routine service and record the completed work.'],
                ['type' => 'Pre-rental inspection', 'urgency' => 'high', 'message' => 'Check tires, brakes, lights and fluid levels before the next handover. Set the vehicle to Maintenance if it should not be rented.'],
            ],
            'due_soon' => [['type' => 'Plan routine service', 'urgency' => 'medium', 'message' => number_format(max(0, $remaining)).' km remain before the configured service milestone. Plan service around upcoming rentals.']],
            default => [['type' => 'Before each handover', 'urgency' => 'low', 'message' => 'Check tire condition and pressure, lights, brakes and fluid levels. Keep recording completed maintenance.']],
        };
        return [
            'km_since_last_service' => $since, 'km_remaining_until_service' => $remaining,
            'health_status' => $status,
            'health_label' => match ($status) {
                'unknown' => 'Service history needed', 'overdue' => 'Service due · '.number_format(abs($remaining)).' km past milestone',
                default => number_format(max(0, $remaining)).' km until routine service',
            },
            'health_badge' => match ($status) { 'unknown' => 'Set up', 'overdue' => 'Service due', 'due_soon' => 'Due soon', default => 'On schedule' },
            'recommendations' => $recommendations,
            'recommendation_basis' => 'Mileage and recorded service history. Follow the manufacturer’s schedule; these reminders do not diagnose mechanical condition.',
        ];
    }
}
