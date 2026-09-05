<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'operator') {
            $bookings = Booking::with(['renter', 'vehicle'])
                ->where('operator_id', $user->id)
                ->latest()
                ->get();
        } else {
            $bookings = Booking::with(['vehicle.operator.operatorProfile', 'operator.operatorProfile'])
                ->where('renter_id', $user->id)
                ->latest()
                ->get();
        }

        return response()->json([
            'success' => true,
            'data' => $bookings,
        ]);
    }

    /**
     * 1. Renter Books Vehicle
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'operator') {
            return response()->json([
                'success' => false,
                'message' => 'Operators are not permitted to make rental reservations.',
            ], 403);
        }

        // Check Driver's License uploaded
        if (empty($user->drivers_license_front) || empty($user->drivers_license_back)) {
            return response()->json([
                'success' => false,
                'code' => 'LICENSE_REQUIRED',
                'message' => "Please upload your Driver's License (Front & Back) in your profile before booking a vehicle.",
            ], 422);
        }

        $validated = $request->validate([
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $vehicle = Vehicle::findOrFail($validated['vehicle_id']);

        // Check Duplicate Active Booking by the same user for this vehicle
        $hasDuplicate = Booking::where('renter_id', $user->id)
            ->where('vehicle_id', $vehicle->id)
            ->whereIn('status', ['pending_payment', 'pending_verification', 'approved', 'ongoing'])
            ->exists();

        if ($hasDuplicate) {
            return response()->json([
                'success' => false,
                'message' => 'You already have an active reservation for this vehicle. Please check "My Bookings".',
            ], 422);
        }

        // Multi-unit availability check
        $activeBookingsCount = Booking::where('vehicle_id', $vehicle->id)
            ->whereIn('status', ['pending_verification', 'approved', 'ongoing'])
            ->count();

        $totalUnits = max(1, (int) ($vehicle->quantity ?? 1));

        if (!$vehicle->is_active || $vehicle->availability_status === 'unavailable' || $activeBookingsCount >= $totalUnits) {
            return response()->json([
                'success' => false,
                'message' => 'All available units of this vehicle are currently reserved or on an active trip.',
            ], 422);
        }

        $start = new \DateTime($validated['start_date']);
        $end = new \DateTime($validated['end_date']);
        $totalDays = max(1, $start->diff($end)->days);

        $dailyRate = (float) $vehicle->daily_rate;
        $resFee = (float) ($vehicle->reservation_fee ?? 500);
        $totalPrice = ($dailyRate * $totalDays) + $resFee;

        $booking = Booking::create([
            'renter_id' => $user->id,
            'vehicle_id' => $vehicle->id,
            'operator_id' => $vehicle->operator_id,
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'total_days' => $totalDays,
            'daily_rate' => $dailyRate,
            'reservation_fee' => $resFee,
            'total_price' => $totalPrice,
            'status' => 'pending_payment',
            'payment_status' => 'unpaid',
            'pickup_location' => $vehicle->pickup_address,
            'notes' => $validated['notes'] ?? null,
        ]);

        Notification::create([
            'user_id' => $vehicle->operator_id,
            'title' => 'New Rental Booking Requested',
            'message' => "A customer placed a reservation for {$vehicle->name}. Awaiting reservation payment.",
            'type' => 'booking',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Reservation created. Please settle the reservation fee.',
            'data' => $booking->load(['vehicle', 'operator']),
        ], 201);
    }

    /**
     * 2. Renter Settles Reservation Payment
     */
    public function settlePayment(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => ['required', 'string', 'in:gcash,maya,bank_transfer,cash'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
        ]);

        $booking = Booking::with(['vehicle', 'operator'])->where('renter_id', $request->user()->id)->findOrFail($id);

        if ($booking->status !== 'pending_payment') {
            return response()->json([
                'success' => false,
                'message' => 'This reservation payment has already been submitted or processed.',
            ], 422);
        }

        // Multi-unit race check: verify remaining available units before allowing settlement
        $vehicle = $booking->vehicle;
        $totalUnits = max(1, (int) ($vehicle->quantity ?? 1));
        $takenUnits = Booking::where('vehicle_id', $vehicle->id)
            ->where('id', '!=', $booking->id)
            ->whereIn('status', ['pending_verification', 'approved', 'ongoing'])
            ->count();

        if ($takenUnits >= $totalUnits) {
            $booking->update(['status' => 'cancelled']);
            return response()->json([
                'success' => false,
                'message' => 'All units for this vehicle have just been booked by other customers.',
            ], 422);
        }

        $booking->update([
            'payment_method' => $validated['payment_method'],
            'payment_reference' => $validated['payment_reference'] ?? 'REF-' . strtoupper(uniqid()),
            'payment_status' => 'paid_reservation',
            'status' => 'pending_verification',
        ]);

        // Auto update remaining units
        $remUnits = max(0, $totalUnits - ($takenUnits + 1));
        $vehicle->update([
            'available_units' => $remUnits,
            'availability_status' => $remUnits === 0 ? 'unavailable' : 'available',
        ]);

        Notification::create([
            'user_id' => $booking->operator_id,
            'title' => 'Payment Submitted for Verification',
            'message' => "Reservation fee was submitted for {$booking->vehicle?->name}. Please verify payment.",
            'type' => 'booking',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment submitted for host verification.',
            'data' => $booking,
        ]);
    }

    /**
     * 3 - 7. Lifecycle Actions (Verify, Approve, Handover/Start, Inspect/Complete, Cancel)
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:pending_payment,pending_verification,approved,ongoing,completed,cancelled,rejected'],
        ]);

        $booking = Booking::with(['vehicle', 'renter', 'operator'])->findOrFail($id);
        $user = $request->user();

        if ($user->id !== $booking->operator_id && $user->id !== $booking->renter_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $newStatus = $validated['status'];
        $booking->update(['status' => $newStatus]);

        // Vehicle availability state sync
        if ($booking->vehicle) {
            $vehicle = $booking->vehicle;
            $totalUnits = max(1, (int) ($vehicle->quantity ?? 1));
            $activeUnits = Booking::where('vehicle_id', $vehicle->id)
                ->whereIn('status', ['pending_verification', 'approved', 'ongoing'])
                ->count();

            $remUnits = max(0, $totalUnits - $activeUnits);
            $vehicle->update([
                'available_units' => $remUnits,
                'availability_status' => $remUnits === 0 ? 'unavailable' : 'available',
            ]);
        }

        // Contextual notifications
        if ($newStatus === 'approved') {
            Notification::create([
                'user_id' => $booking->renter_id,
                'title' => 'Reservation Confirmed & Approved',
                'message' => "Your host approved your reservation for {$booking->vehicle?->name}. Ready for pickup.",
                'type' => 'success',
            ]);
        } elseif ($newStatus === 'ongoing') {
            Notification::create([
                'user_id' => $booking->renter_id,
                'title' => 'Trip Started',
                'message' => "Have a safe trip with {$booking->vehicle?->name}.",
                'type' => 'booking',
            ]);
        } elseif ($newStatus === 'completed') {
            $booking->update(['payment_status' => 'paid_full']);
            Notification::create([
                'user_id' => $booking->renter_id,
                'title' => 'Rental Completed',
                'message' => "Vehicle returned and inspection passed for {$booking->vehicle?->name}. Please leave a rating.",
                'type' => 'success',
            ]);
        } elseif ($newStatus === 'rejected' || $newStatus === 'cancelled') {
            Notification::create([
                'user_id' => $user->id === $booking->renter_id ? $booking->operator_id : $booking->renter_id,
                'title' => 'Booking ' . ucfirst($newStatus),
                'message' => "The booking request for {$booking->vehicle?->name} was {$newStatus}.",
                'type' => 'warning',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => "Booking status updated to {$newStatus}",
            'data' => $booking,
        ]);
    }

    /**
     * 8. Renter Submits Review & Rating after completion
     */
    public function submitReview(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'review' => ['nullable', 'string', 'max:1000'],
        ]);

        $booking = Booking::with('vehicle')->where('renter_id', $request->user()->id)->findOrFail($id);

        if ($booking->status !== 'completed') {
            return response()->json([
                'success' => false,
                'message' => 'Reviews can only be submitted once the rental trip is completed.',
            ], 422);
        }

        $booking->update([
            'rating' => $validated['rating'],
            'review' => $validated['review'] ?? null,
        ]);

        if ($booking->vehicle) {
            $avg = Booking::where('vehicle_id', $booking->vehicle_id)->whereNotNull('rating')->avg('rating');
            $count = Booking::where('vehicle_id', $booking->vehicle_id)->whereNotNull('rating')->count();
            $booking->vehicle->update([
                'rating' => round($avg ?? 5.0, 2),
                'rating_count' => $count,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Thank you for your rating and review!',
            'data' => $booking,
        ]);
    }
}
