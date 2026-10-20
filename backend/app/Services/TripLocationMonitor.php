<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Notification;
use Illuminate\Support\Facades\DB;

class TripLocationMonitor
{
    public const ACTIVE = ['trip_in_progress', 'ongoing', 'return_pending'];
    public const STALE_SECONDS = 120;

    // Called inside the serialized booking mutation, after coordinates are saved.
    public function received(Booking $booking, ?float $accuracy): void
    {
        $previous = $booking->location_sharing_status;
        $booking->forceFill(['location_sharing_status' => 'on', 'location_sharing_reason' => null,
            'location_sharing_changed_at' => $previous === 'on' ? $booking->location_sharing_changed_at : now()])->save();
        if (in_array($previous, ['off', 'unavailable'])) {
            $this->notifyBoth($booking, 'Trip GPS restored', 'Location sharing has resumed for '.$this->vehicleName($booking).'.', 'success');
        }
        // Ignore imprecise boundary readings; never reject real telemetry outside the province.
        if ($accuracy !== null && $accuracy > 100) return;
        $outside = !ServiceArea::contains((float) $booking->current_latitude, (float) $booking->current_longitude);
        $previousOutside = $booking->outside_service_area;
        $booking->forceFill(['outside_service_area' => $outside])->save();
        if ($outside && $previousOutside !== true) {
            $this->notifyBoth($booking, 'Vehicle outside Oriental Mindoro',
                'The renter’s GPS for '.$this->vehicleName($booking).' is outside Oriental Mindoro. Check the live map and contact each other.', 'warning');
        }
    }

    public function turnedOff(Booking $booking, string $reason): void
    {
        if ($booking->location_sharing_status === 'off') return;
        $booking->forceFill(['location_sharing_status' => 'off', 'location_sharing_reason' => $reason, 'location_sharing_changed_at' => now()])->save();
        $this->notifyBoth($booking, 'Trip location sharing off', 'Location sharing for '.$this->vehicleName($booking).' is off. The renter must enable Ride4Rent location access and phone GPS during the active trip.', 'warning');
    }

    public function checkStale(Booking $booking): void
    {
        if (!$this->isStale($booking)) return;
        DB::transaction(function () use ($booking) {
            $current = Booking::whereKey($booking->id)->lockForUpdate()->first();
            if (!$current || !$this->isStale($current)) return;
            $current->forceFill(['location_sharing_status' => 'unavailable', 'location_sharing_reason' => 'updates_missing', 'location_sharing_changed_at' => now()])->save();
            $this->notifyBoth($current, 'Trip GPS unavailable', 'No GPS update has been received for '.$this->vehicleName($current).' for over 2 minutes. Check the renter’s connection, location access and app.', 'warning');
        });
    }

    public function sweep(?int $userId = null): void
    {
        $query = Booking::whereIn('status', self::ACTIVE)
            ->where(fn ($q) => $q->whereNull('location_sharing_status')->orWhereNotIn('location_sharing_status', ['off', 'unavailable']));
        if ($userId) $query->where(fn ($q) => $q->where('renter_id', $userId)->orWhere('operator_id', $userId));
        $query->chunkById(100, function ($bookings) { foreach ($bookings as $booking) $this->checkStale($booking); });
    }

    private function isStale(Booking $booking): bool
    {
        if (!in_array($booking->status, self::ACTIVE) || in_array($booking->location_sharing_status, ['off', 'unavailable'])) return false;
        $last = $booking->last_location_updated_at ?? $booking->actual_start_time ?? $booking->rental_balance_paid_at ?? $booking->updated_at;
        return $last && $last->lt(now()->subSeconds(self::STALE_SECONDS));
    }

    private function vehicleName(Booking $booking): string { return $booking->vehicle?->name ?: 'your active rental'; }

    private function notifyBoth(Booking $booking, string $title, string $message, string $type): void
    {
        foreach (array_unique([$booking->renter_id, $booking->operator_id]) as $userId) {
            $notification = Notification::create(['user_id' => $userId, 'title' => $title, 'message' => $message,
                'type' => $type, 'action_url' => '/live-tracking?bookingId='.$booking->id, 'is_read' => false]);
            DB::afterCommit(fn () => app(DevicePushService::class)->send($notification));
        }
    }
}
