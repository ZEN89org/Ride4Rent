<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Notification;
use Carbon\Carbon;

class BookingReminderService
{
    public function send(): void
    {
        Booking::where(fn ($query) => $query->whereIn('status', ['approved', 'awaiting_pickup', 'trip_in_progress', 'ongoing', 'return_pending'])
            ->orWhere('refund_status', 'pending'))->chunkById(100, function ($bookings) {
                foreach ($bookings as $booking) {
                    if (in_array($booking->status, ['approved', 'awaiting_pickup'])) {
                        $pickup = $booking->scheduledPickup();
                        if ($pickup->isPast()) $this->notify($booking, $booking->renter_id, 'Pickup Reminder', 'Your vehicle is awaiting pickup. Contact your operator if you are delayed.');
                    }
                    if (in_array($booking->status, ['trip_in_progress', 'ongoing', 'return_pending'])) {
                        $return = $booking->return_at ?: Carbon::parse($booking->end_date->format('Y-m-d').' 10:00', 'Asia/Manila');
                        if ($return->isPast()) {
                            $this->notify($booking, $booking->renter_id, 'Vehicle Return Overdue', 'Your return time has passed. Return the vehicle or contact the operator about an extension.');
                            $this->notify($booking, $booking->operator_id, 'Vehicle Return Overdue', 'The vehicle has not been checked in after its return deadline. Contact the renter.');
                        }
                        $lastUpdate = $booking->last_location_updated_at ?: $booking->actual_start_time;
                        if ($lastUpdate && $lastUpdate->lt(now()->subMinutes(10))) {
                            $this->notify($booking, $booking->renter_id, 'Trip Location Unavailable', 'Check GPS, location permissions and your connection to restore trip sharing.');
                            $this->notify($booking, $booking->operator_id, 'Trip Location Unavailable', 'No recent location update has arrived from the renter. Contact them to check location sharing.');
                        }
                    }
                    if ($booking->refund_status === 'pending') $this->notify($booking, $booking->operator_id, 'Refund Reminder', 'A reservation refund is still pending. Please send it and record the GCash reference.');
                }
            });
    }

    private function notify(Booking $booking, int $userId, string $title, string $message): void
    {
        $message = "Booking #{$booking->id}: {$message}";
        if (Notification::where('user_id', $userId)->where('title', $title)->where('message', $message)
            ->where('created_at', '>=', now()->startOfDay())->exists()) return;
        $notification = Notification::create(['user_id' => $userId, 'title' => $title, 'message' => $message, 'type' => 'warning',
            'action_url' => $userId === $booking->operator_id ? '/operator-bookings' : '/(tabs)/bookings']);
        app(DevicePushService::class)->send($notification);
    }
}
