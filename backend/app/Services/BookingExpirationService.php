<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Notification;
use App\Models\Vehicle;
use Illuminate\Support\Facades\DB;

class BookingExpirationService
{
    public function expire(): void
    {
        $candidates = Booking::whereIn('status', ['pending_payment', 'pending_verification'])
            ->whereNotNull('expires_at')->where('expires_at', '<=', now())->get(['id', 'vehicle_id']);

        foreach ($candidates as $candidate) {
            DB::transaction(function () use ($candidate) {
                $vehicle = Vehicle::whereKey($candidate->vehicle_id)->lockForUpdate()->first();
                $booking = Booking::whereKey($candidate->id)->lockForUpdate()->first();
                if (! $booking || ! in_array($booking->status, ['pending_payment', 'pending_verification']) || ! $booking->expires_at || $booking->expires_at->isFuture()) {
                    return;
                }
                $paid = $booking->payment_status === 'paid_reservation';
                $booking->update([
                    'status' => 'cancelled',
                    'payment_status' => $paid ? 'refund_pending' : 'unpaid',
                    'refund_status' => $paid ? 'pending' : null,
                    'refund_amount' => $paid ? $booking->reservation_fee : 0,
                ]);
                if ($vehicle) {
                    $active = Booking::where('vehicle_id', $vehicle->id)->whereIn('status', Booking::ACTIVE_STATUSES)->count();
                    $remaining = max(0, max(1, (int) $vehicle->quantity) - $active);
                    $vehicle->update(['available_units' => $remaining, 'availability_status' => $remaining > 0 ? 'available' : 'unavailable']);
                }
                Notification::create([
                    'user_id' => $booking->renter_id, 'title' => 'Booking Expired',
                    'message' => $paid ? 'Host did not confirm in time. Your refund is pending.' : 'Your booking expired due to unpaid reservation fee.',
                    'type' => $paid ? 'warning' : 'info', 'action_url' => '/(tabs)/bookings',
                ]);
                if ($paid) {
                    Notification::create([
                        'user_id' => $booking->operator_id, 'title' => 'Refund Required',
                        'message' => 'An expired booking requires a reservation refund.',
                        'type' => 'warning', 'action_url' => '/operator-bookings',
                    ]);
                }
            }, 3);
        }
    }
}
