<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Message;
use App\Models\Notification;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->checkAndProcessExpirations();

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

        // If previously rejected by a host or admin, require re-upload
        if ($user->license_verification_status === 'rejected') {
            return response()->json([
                'success' => false,
                'code' => 'LICENSE_REJECTED',
                'message' => "Your driver's license was rejected: " . ($user->license_rejection_reason ?? 'Please re-upload valid, clear license photos before booking.'),
            ], 422);
        }

        $validated = $request->validate([
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $vehicle = Vehicle::findOrFail($validated['vehicle_id']);

        // Anti-Spam Check 1: Max 1 pending unpaid reservation per renter
        $pendingUnpaidCount = Booking::where('renter_id', $user->id)
            ->where('status', 'pending_payment')
            ->where('payment_status', 'unpaid')
            ->count();

        if ($pendingUnpaidCount >= 1) {
            return response()->json([
                'success' => false,
                'message' => 'You already have a pending reservation awaiting payment. Please settle or cancel your existing pending requests before booking another vehicle.',
            ], 422);
        }

        // Anti-Spam Check 2: Maximum 3 cancellations in the last 2 hours
        $recentCancellations = Booking::where('renter_id', $user->id)
            ->where('status', 'cancelled')
            ->where('updated_at', '>=', now()->subHours(2))
            ->count();

        if ($recentCancellations >= 3) {
            return response()->json([
                'success' => false,
                'message' => 'Booking temporarily restricted due to multiple recent cancellations. Please wait before booking again.',
            ], 429);
        }

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

        // Check if renter already has another active/ongoing trip overlapping with these dates
        $startDate = $validated['start_date'];
        $endDate = $validated['end_date'];

        $hasConcurrentActiveTrip = Booking::where('renter_id', $user->id)
            ->whereIn('status', [
                'pending_payment',
                'pending_verification',
                'approved',
                'awaiting_pickup',
                'pickup_in_progress',
                'ready_to_start',
                'trip_in_progress',
                'ongoing',
                'return_pending',
            ])
            ->whereNotIn('status', ['cancelled', 'rejected', 'completed', 'refunded', 'no_show'])
            ->where(function ($query) use ($startDate, $endDate) {
                $query->where('start_date', '<=', $endDate)
                      ->where('end_date', '>=', $startDate);
            })
            ->first();

        // If concurrent rental is detected, require designated secondary driver details
        $isMultiVehicle = false;
        $secondaryName = null;
        $secondaryPhone = null;
        $secondaryFront = null;
        $secondaryBack = null;

        if ($hasConcurrentActiveTrip) {
            $isMultiVehicle = true;
            $request->validate([
                'secondary_driver_name' => ['required', 'string', 'min:3', 'max:150'],
                'secondary_driver_phone' => ['required', 'string', 'min:7', 'max:25'],
                'secondary_driver_license_front' => ['nullable', 'string'],
                'secondary_driver_license_back' => ['nullable', 'string'],
            ], [
                'secondary_driver_name.required' => 'Because you already have an active rental trip during this period, please designate the authorized secondary driver who will be driving this vehicle.',
                'secondary_driver_phone.required' => 'Please provide the secondary driver contact number.',
            ]);

            $secondaryName = $request->input('secondary_driver_name');
            $secondaryPhone = $request->input('secondary_driver_phone');
            $secondaryFront = $request->input('secondary_driver_license_front');
            $secondaryBack = $request->input('secondary_driver_license_back');
        }

        $start = new \DateTime($validated['start_date']);
        $end = new \DateTime($validated['end_date']);
        $totalDays = max(1, $start->diff($end)->days);

        $dailyRate = (float) $vehicle->daily_rate;
        $resFee = (float) ($vehicle->reservation_fee ?? 500);
        $totalPrice = $dailyRate * $totalDays;

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
            'expires_at' => now()->addHours(24),
            'pickup_location' => $vehicle->pickup_address,
            'notes' => $validated['notes'] ?? null,
            'is_multi_vehicle_rental' => $isMultiVehicle,
            'secondary_driver_name' => $secondaryName,
            'secondary_driver_phone' => $secondaryPhone,
            'secondary_driver_license_front' => $secondaryFront,
            'secondary_driver_license_back' => $secondaryBack,
        ]);

        Notification::create([
            'user_id' => $vehicle->operator_id,
            'title' => 'New Booking Request',
            'message' => 'New vehicle reservation request received.',
            'type' => 'booking',
            'action_url' => '/operator-bookings',
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
            'payment_reference' => [
                'required_unless:payment_method,cash',
                'nullable',
                'string',
                'regex:/^[\d\s-]{10,20}$/',
            ],
            'renter_refund_method' => ['nullable', 'string', 'in:gcash,maya,bank_transfer,cash'],
            'renter_refund_account_name' => ['nullable', 'string', 'max:150'],
            'renter_refund_account_number' => ['nullable', 'string', 'max:50'],
        ], [
            'payment_reference.required_unless' => 'Reference number is required to verify your transaction.',
            'payment_reference.required' => 'Reference number is required to verify your transaction.',
            'payment_reference.regex' => 'Please enter a valid GCash reference number (typically 13 digits from your receipt).',
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

        // Double Booking Prevention: Check if renter already has another active/settled trip overlapping with these exact trip dates
        $bookingStart = $booking->start_date;
        $bookingEnd = $booking->end_date;

        $hasConcurrentSettledTrip = Booking::where('renter_id', $request->user()->id)
            ->where('id', '!=', $booking->id)
            ->whereIn('status', [
                'pending_verification',
                'approved',
                'awaiting_pickup',
                'pickup_in_progress',
                'ready_to_start',
                'trip_in_progress',
                'ongoing',
                'return_pending',
            ])
            ->whereNotIn('status', ['completed', 'cancelled', 'rejected', 'refunded', 'no_show'])
            ->where(function ($query) use ($bookingStart, $bookingEnd) {
                $query->where('start_date', '<=', $bookingEnd)
                      ->where('end_date', '>=', $bookingStart);
            })
            ->first();

        if ($hasConcurrentSettledTrip && (!$booking->is_multi_vehicle_rental || empty($booking->secondary_driver_name))) {
            $otherDates = \Carbon\Carbon::parse($hasConcurrentSettledTrip->start_date)->format('M d') . ' – ' . \Carbon\Carbon::parse($hasConcurrentSettledTrip->end_date)->format('M d');
            return response()->json([
                'success' => false,
                'message' => "You currently have another active vehicle reservation during overlapping dates ({$otherDates}). Renting multiple vehicles simultaneously requires an authorized secondary driver designated during booking.",
            ], 422);
        }

        $renter = $request->user();
        $refundMethod = $validated['renter_refund_method'] ?? $validated['payment_method'];
        $refundName = $validated['renter_refund_account_name'] ?? trim(($renter->first_name ?? '') . ' ' . ($renter->last_name ?? '')) ?: ($renter->name ?? 'Renter');
        $refundNumber = $validated['renter_refund_account_number'] ?? ($renter->phone_number ?? $renter->phone ?? '');

        $booking->update([
            'payment_method' => $validated['payment_method'],
            'payment_reference' => $validated['payment_reference'] ?? 'REF-' . strtoupper(uniqid()),
            'payment_status' => 'paid_reservation',
            'status' => 'pending_verification',
            'expires_at' => now()->addHours(24),
            'renter_refund_method' => $refundMethod,
            'renter_refund_account_name' => $refundName,
            'renter_refund_account_number' => $refundNumber,
            'refund_amount' => $booking->reservation_fee,
        ]);

        // Auto update remaining units
        $remUnits = max(0, $totalUnits - ($takenUnits + 1));
        $vehicle->update([
            'available_units' => $remUnits,
            'availability_status' => $remUnits === 0 ? 'unavailable' : 'available',
        ]);

        // If no units remain, automatically cancel other competing un-settled pending_payment requests for this vehicle
        if ($remUnits === 0) {
            $competingPending = Booking::where('vehicle_id', $vehicle->id)
                ->where('id', '!=', $booking->id)
                ->where('status', 'pending_payment')
                ->get();

            foreach ($competingPending as $compBooking) {
                Notification::create([
                    'user_id' => $compBooking->renter_id,
                    'title' => 'Vehicle Unavailable',
                    'message' => 'The vehicle is no longer available.',
                    'type' => 'warning',
                    'action_url' => '/(tabs)/home',
                ]);
                $compBooking->delete();
            }
        }

        // Auto-post payment proof / receipt into the chat thread between renter and operator
        $vehicleTitle = trim(($vehicle->brand ?? '') . ' ' . ($vehicle->name ?? 'Vehicle'));
        $paymentRefDisplay = !empty($validated['payment_reference']) ? $validated['payment_reference'] : 'GCash Reference Provided';
        $startDateFormatted = \Carbon\Carbon::parse($booking->start_date)->format('M d, Y');
        $endDateFormatted = \Carbon\Carbon::parse($booking->end_date)->format('M d, Y');

        $receiptMessageText = "🧾 PAYMENT RECEIPT\n"
            . "──────────────────────────────\n"
            . "Vehicle: {$vehicleTitle}\n"
            . "Schedule: {$startDateFormatted} – {$endDateFormatted} ({$booking->total_days} " . ($booking->total_days == 1 ? 'day' : 'days') . ")\n"
            . "Method: " . strtoupper($validated['payment_method']) . "\n"
            . "Reference: {$paymentRefDisplay}\n"
            . "──────────────────────────────\n"
            . "Amount Paid: ₱" . number_format($booking->reservation_fee, 2) . "\n"
            . "Status: Reservation Fee Settled\n"
            . "──────────────────────────────\n"
            . "Awaiting host verification";

        $operatorUserId = $booking->operator_id ?: ($vehicle->operator_id ?? null) ?: ($booking->vehicle?->operator_id ?? null);

        if ($operatorUserId) {
            Message::create([
                'sender_id' => $renter->id,
                'receiver_id' => $operatorUserId,
                'vehicle_id' => $booking->vehicle_id,
                'message' => $receiptMessageText,
                'is_read' => false,
            ]);

            Notification::create([
                'user_id' => $operatorUserId,
                'title' => 'Payment Submitted',
                'message' => "Reservation payment of ₱" . number_format($booking->reservation_fee, 2) . " submitted for {$vehicleTitle}. Please verify within 24 hours.",
                'type' => 'booking',
                'action_url' => '/operator-bookings',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment submitted for host verification.',
            'data' => $booking,
        ]);
    }

    /**
     * Operator Confirms Payment Received and Approves Booking
     */
    public function confirmPayment(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => ['nullable', 'string', 'in:cash,gcash,maya,bank_transfer'],
            'payment_notes' => ['nullable', 'string', 'max:255'],
        ]);

        $booking = Booking::with(['vehicle', 'renter', 'operator'])->findOrFail($id);
        $user = $request->user();

        if ($user->id !== $booking->operator_id) {
            return response()->json([
                'success' => false,
                'message' => 'Only the operator can confirm payment and approve this booking.',
            ], 403);
        }

        $booking->update([
            'status' => 'approved',
            'payment_status' => 'paid_reservation',
            'payment_method' => $validated['payment_method'] ?? $booking->payment_method ?? 'cash',
        ]);

        // Verify renter's driver's license upon host approval (Option A)
        if ($booking->renter && !$booking->renter->is_drivers_license_verified) {
            $booking->renter->update([
                'is_drivers_license_verified' => true,
                'license_verification_status' => 'approved',
                'license_rejection_reason' => null,
            ]);
        }

        // Auto update remaining available units
        if ($booking->vehicle) {
            $vehicle = $booking->vehicle;
            $totalUnits = max(1, (int) ($vehicle->quantity ?? 1));
            $activeUnits = Booking::where('vehicle_id', $vehicle->id)
                ->whereIn('status', ['pending_verification', 'approved', 'awaiting_pickup', 'pickup_in_progress', 'ready_to_start', 'trip_in_progress', 'return_pending', 'ongoing'])
                ->count();

            $remUnits = max(0, $totalUnits - $activeUnits);
            $vehicle->update([
                'available_units' => $remUnits,
                'availability_status' => $remUnits === 0 ? 'unavailable' : 'available',
            ]);
        }

        // Notify Renter
        Notification::create([
            'user_id' => $booking->renter_id,
            'title' => 'Payment Confirmed & Booking Approved',
            'message' => "The operator has confirmed your payment of ₱" . number_format($booking->reservation_fee ?? 500, 2) . " for booking #{$booking->id}. Your reservation is ready for handover.",
            'type' => 'booking',
            'action_url' => '/(tabs)/bookings',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment confirmed and booking approved successfully.',
            'data' => $booking->fresh(['vehicle', 'renter', 'operator']),
        ]);
    }

    /**
     * 3. Start Trip with Handover Inspection (Mileage, Fuel Level, Notes, Photos)
     */
    public function startTrip(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'start_mileage' => ['required', 'integer', 'min:0'],
            'start_fuel_level' => ['required', 'integer', 'min:0', 'max:100'],
            'start_inspection_notes' => ['nullable', 'string', 'max:1000'],
            'start_inspection_photos' => ['nullable', 'array'],
            'start_inspection_photos.*' => ['string'],
        ]);

        $booking = Booking::with(['vehicle', 'renter', 'operator'])->findOrFail($id);
        $user = $request->user();

        if ($user->id !== $booking->operator_id) {
            return response()->json([
                'success' => false,
                'message' => 'Only the operator can perform handover and start the trip.',
            ], 403);
        }

        if (!in_array($booking->status, ['approved', 'awaiting_pickup', 'pickup_in_progress', 'ready_to_start'])) {
            return response()->json([
                'success' => false,
                'message' => 'Trip cannot be started in its current status: ' . $booking->status,
            ], 422);
        }

        $now = now();
        $booking->update([
            'status' => 'trip_in_progress',
            'actual_start_time' => $now,
            'start_mileage' => $validated['start_mileage'],
            'start_fuel_level' => $validated['start_fuel_level'],
            'start_inspection_notes' => $validated['start_inspection_notes'] ?? null,
            'start_inspection_photos' => $validated['start_inspection_photos'] ?? null,
        ]);

        Notification::create([
            'user_id' => $booking->renter_id,
            'title' => 'Trip Started',
            'message' => 'Your rental trip has started.',
            'type' => 'booking',
            'action_url' => '/(tabs)/bookings',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Trip started successfully with handover inspection logged.',
            'data' => $booking->fresh(),
        ]);
    }

    /**
     * 4. Complete Trip with Return Inspection & Settlement Calculation
     */
    public function completeTrip(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'end_mileage' => ['required', 'integer', 'min:0'],
            'end_fuel_level' => ['required', 'integer', 'min:0', 'max:100'],
            'fuel_charge' => ['nullable', 'numeric', 'min:0'],
            'damage_charge' => ['nullable', 'numeric', 'min:0'],
            'late_fee' => ['nullable', 'numeric', 'min:0'],
            'other_charges' => ['nullable', 'numeric', 'min:0'],
            'end_inspection_notes' => ['nullable', 'string', 'max:1000'],
            'end_inspection_photos' => ['nullable', 'array'],
            'end_inspection_photos.*' => ['string'],
        ]);

        $booking = Booking::with(['vehicle', 'renter', 'operator'])->findOrFail($id);
        $user = $request->user();

        if ($user->id !== $booking->operator_id) {
            return response()->json([
                'success' => false,
                'message' => 'Only the operator can conduct return inspection and complete the trip.',
            ], 403);
        }

        if (!in_array($booking->status, ['trip_in_progress', 'return_pending', 'ongoing'])) {
            return response()->json([
                'success' => false,
                'message' => 'Trip cannot be completed from current status: ' . $booking->status,
            ], 422);
        }

        $now = now();
        $startMileage = (int) ($booking->start_mileage ?? $validated['end_mileage']);
        $endMileage = (int) $validated['end_mileage'];
        $distanceTraveled = max(0, $endMileage - $startMileage);

        $fuelCharge = (float) ($validated['fuel_charge'] ?? 0);
        $damageCharge = (float) ($validated['damage_charge'] ?? 0);
        $lateFee = (float) ($validated['late_fee'] ?? 0);
        $otherCharges = (float) ($validated['other_charges'] ?? 0);
        $additionalTotal = $fuelCharge + $damageCharge + $lateFee + $otherCharges;

        // Final amount calculation
        $finalAmountDue = max(0, (float) $booking->total_price - (float) $booking->reservation_fee + $additionalTotal);

        $booking->update([
            'status' => 'completed',
            'payment_status' => 'paid_full',
            'actual_end_time' => $now,
            'end_mileage' => $endMileage,
            'end_fuel_level' => (int) $validated['end_fuel_level'],
            'distance_traveled' => $distanceTraveled,
            'fuel_charge' => $fuelCharge,
            'damage_charge' => $damageCharge,
            'late_fee' => $lateFee,
            'other_charges' => $otherCharges,
            'final_amount_due' => $finalAmountDue,
            'end_inspection_notes' => $validated['end_inspection_notes'] ?? null,
            'end_inspection_photos' => $validated['end_inspection_photos'] ?? null,
        ]);

        // Release vehicle availability count
        if ($booking->vehicle) {
            $vehicle = $booking->vehicle;
            $totalUnits = max(1, (int) ($vehicle->quantity ?? 1));
            $activeUnits = Booking::where('vehicle_id', $vehicle->id)
                ->whereIn('status', ['pending_verification', 'approved', 'awaiting_pickup', 'pickup_in_progress', 'ready_to_start', 'trip_in_progress', 'return_pending', 'ongoing'])
                ->count();

            $remUnits = max(0, $totalUnits - $activeUnits);
            $vehicle->update([
                'available_units' => $remUnits,
                'availability_status' => $remUnits === 0 ? 'unavailable' : 'available',
            ]);
        }

        Notification::create([
            'user_id' => $booking->renter_id,
            'title' => 'Trip Completed',
            'message' => 'Your rental trip has been completed.',
            'type' => 'success',
            'action_url' => '/(tabs)/bookings',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Trip successfully completed and final inspection recorded.',
            'data' => $booking->fresh(),
        ]);
    }

    /**
     * 5. Real-Time GPS Telemetry Sync (Renter updates phone location, Operator reads)
     */
    public function updateLocation(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'speed' => ['nullable', 'numeric', 'min:0'],
            'street' => ['nullable', 'string', 'max:255'],
            'barangay' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'location_address' => ['nullable', 'string', 'max:500'],
        ]);

        $booking = Booking::findOrFail($id);
        $user = $request->user();

        // Only the renter of this booking can send their GPS coordinates
        if ($user->id !== $booking->renter_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized telemetry source.'], 403);
        }

        // Only update location when trip is active
        if (!in_array($booking->status, ['trip_in_progress', 'ongoing', 'return_pending'])) {
            return response()->json(['success' => false, 'message' => 'GPS telemetry is only active during active trips.'], 422);
        }

        $booking->update([
            'current_latitude' => $validated['latitude'],
            'current_longitude' => $validated['longitude'],
            'current_speed' => $validated['speed'] ?? 0,
            'current_street' => $validated['street'] ?? $booking->current_street,
            'current_barangay' => $validated['barangay'] ?? $booking->current_barangay,
            'current_city' => $validated['city'] ?? $booking->current_city,
            'current_location_address' => $validated['location_address'] ?? $booking->current_location_address,
            'last_location_updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Telemetry ping recorded.',
            'data' => [
                'latitude' => $booking->current_latitude,
                'longitude' => $booking->current_longitude,
                'speed' => $booking->current_speed,
                'street' => $booking->current_street,
                'barangay' => $booking->current_barangay,
                'city' => $booking->current_city,
                'location_address' => $booking->current_location_address,
                'last_updated' => $booking->last_location_updated_at?->toIso8601String(),
            ],
        ]);
    }

    public function getLocation(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with('vehicle')->findOrFail($id);
        $user = $request->user();

        // Only host operator or renter can view live location
        if ($user->id !== $booking->operator_id && $user->id !== $booking->renter_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'booking_id' => $booking->id,
                'vehicle_name' => $booking->vehicle?->name,
                'status' => $booking->status,
                'current_latitude' => $booking->current_latitude,
                'current_longitude' => $booking->current_longitude,
                'current_speed' => $booking->current_speed,
                'current_street' => $booking->current_street,
                'current_barangay' => $booking->current_barangay,
                'current_city' => $booking->current_city,
                'current_location_address' => $booking->current_location_address,
                'last_location_updated_at' => $booking->last_location_updated_at?->toIso8601String(),
                'last_updated_human' => $booking->last_location_updated_at ? $booking->last_location_updated_at->diffForHumans() : 'No GPS pings received yet',
            ],
        ]);
    }

    /**
     * 6. Lifecycle Actions (Verify, Approve, Pickup, Ready, Return Pending, Cancel)
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:pending_payment,pending_verification,approved,awaiting_pickup,pickup_in_progress,ready_to_start,trip_in_progress,return_pending,ongoing,completed,cancelled,rejected,no_show'],
        ]);

        $booking = Booking::with(['vehicle', 'renter', 'operator'])->findOrFail($id);
        $user = $request->user();

        if ($user->id !== $booking->operator_id && $user->id !== $booking->renter_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $newStatus = $validated['status'];

        if ($newStatus === 'approved') {
            $overlappingTrip = Booking::where('renter_id', $booking->renter_id)
                ->where('id', '!=', $booking->id)
                ->whereIn('status', ['approved', 'awaiting_pickup', 'pickup_in_progress', 'ready_to_start', 'trip_in_progress', 'ongoing', 'return_pending'])
                ->where(function ($q) use ($booking) {
                    $q->where('start_date', '<=', $booking->end_date)
                      ->where('end_date', '>=', $booking->start_date);
                })
                ->first();

            if ($overlappingTrip && !$booking->is_multi_vehicle_rental && empty($booking->secondary_driver_name)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Renter already has an active overlapping trip. Cannot approve without a designated secondary driver.',
                ], 422);
            }
        }

        $booking->update(['status' => $newStatus]);

        // Vehicle availability state sync
        if ($booking->vehicle) {
            $vehicle = $booking->vehicle;
            $totalUnits = max(1, (int) ($vehicle->quantity ?? 1));
            $activeUnits = Booking::where('vehicle_id', $vehicle->id)
                ->whereIn('status', ['pending_verification', 'approved', 'awaiting_pickup', 'pickup_in_progress', 'ready_to_start', 'trip_in_progress', 'return_pending', 'ongoing'])
                ->count();

            $remUnits = max(0, $totalUnits - $activeUnits);
            $vehicle->update([
                'available_units' => $remUnits,
                'availability_status' => $remUnits === 0 ? 'unavailable' : 'available',
            ]);
        }

        // Contextual notifications
        if ($newStatus === 'approved' || $newStatus === 'awaiting_pickup') {
            // Verify renter's driver's license upon host approval (Option A)
            if ($booking->renter && !$booking->renter->is_drivers_license_verified) {
                $booking->renter->update([
                    'is_drivers_license_verified' => true,
                    'license_verification_status' => 'approved',
                    'license_rejection_reason' => null,
                ]);
            }

            Notification::create([
                'user_id' => $booking->renter_id,
                'title' => 'Booking Approved',
                'message' => 'Your reservation and driver\'s license have been approved by the host.',
                'type' => 'success',
                'action_url' => '/(tabs)/bookings',
            ]);
        } elseif ($newStatus === 'pickup_in_progress') {
            Notification::create([
                'user_id' => $booking->operator_id,
                'title' => 'Renter Arrived',
                'message' => 'Renter arrived for pickup.',
                'type' => 'booking',
                'action_url' => '/operator-bookings',
            ]);
        } elseif ($newStatus === 'return_pending') {
            Notification::create([
                'user_id' => $booking->operator_id,
                'title' => 'Vehicle Returned',
                'message' => 'Vehicle returned for inspection.',
                'type' => 'booking',
                'action_url' => '/operator-bookings',
            ]);
        } elseif ($newStatus === 'completed') {
            $booking->update(['payment_status' => 'paid_full']);
            Notification::create([
                'user_id' => $booking->renter_id,
                'title' => 'Trip Completed',
                'message' => 'Your rental trip has been completed.',
                'type' => 'success',
                'action_url' => '/(tabs)/bookings',
            ]);
        } elseif ($newStatus === 'no_show') {
            if ($user->id !== $booking->operator_id && $user->role !== 'admin') {
                return response()->json(['success' => false, 'message' => 'Only the host or an administrator can mark a booking as no-show.'], 403);
            }

            $booking->update([
                'status' => 'no_show',
                'payment_status' => 'paid_reservation',
                'refund_status' => null,
            ]);

            // Notify Renter
            Notification::create([
                'user_id' => $booking->renter_id,
                'title' => 'Reservation Marked as No-Show',
                'message' => "Your booking #{$booking->id} for {$booking->vehicle?->name} was marked as No-Show. The ₱" . number_format($booking->reservation_fee, 2) . " reservation fee has been forfeited.",
                'type' => 'warning',
                'action_url' => '/(tabs)/bookings',
            ]);

            // Notify Host
            Notification::create([
                'user_id' => $booking->operator_id,
                'title' => 'Booking Closed (No-Show)',
                'message' => "Booking #{$booking->id} was closed as No-Show. The unit has been restored to your fleet.",
                'type' => 'info',
                'action_url' => '/operator-bookings',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Booking closed as No-Show. Unit restored to inventory.',
                'data' => $booking->fresh(),
            ]);
        } elseif ($newStatus === 'rejected' || $newStatus === 'cancelled') {
            $isRenter = $user->id === $booking->renter_id;
            $hasPaidReservation = $booking->payment_status === 'paid_reservation' || $booking->status === 'pending_verification';

            if ($hasPaidReservation) {
                // Keep record and mark for refund
                $booking->update([
                    'status' => $newStatus,
                    'payment_status' => 'refund_pending',
                    'refund_status' => 'pending',
                    'refund_amount' => $booking->reservation_fee,
                ]);

                // Context notification to renter
                Notification::create([
                    'user_id' => $booking->renter_id,
                    'title' => $newStatus === 'cancelled' ? 'Booking Cancelled (Refund Pending)' : 'Booking Declined (Refund Pending)',
                    'message' => "Your booking #{$booking->id} was {$newStatus}. A refund of ₱" . number_format($booking->reservation_fee, 2) . " has been requested from the host.",
                    'type' => 'warning',
                    'action_url' => '/(tabs)/bookings',
                ]);

                // Urgent task notification to operator
                Notification::create([
                    'user_id' => $booking->operator_id,
                    'title' => 'Refund Required',
                    'message' => "Booking #{$booking->id} was {$newStatus}. Please refund ₱" . number_format($booking->reservation_fee, 2) . " to {$booking->renter_refund_account_name} ({$booking->renter_refund_method}: {$booking->renter_refund_account_number}).",
                    'type' => 'warning',
                    'action_url' => '/operator-bookings',
                ]);

                $rejectionReason = $request->input('rejection_reason') ?? $request->input('reason');
                if ($rejectionReason && $booking->renter) {
                    if (stripos($rejectionReason, 'license') !== false || stripos($rejectionReason, 'driver') !== false) {
                        $booking->renter->update([
                            'is_drivers_license_verified' => false,
                            'license_verification_status' => 'rejected',
                            'license_rejection_reason' => $rejectionReason,
                        ]);
                    }
                }

                return response()->json([
                    'success' => true,
                    'message' => "Booking {$newStatus}. Reservation fee refund is pending from the host.",
                    'data' => $booking->fresh(),
                ]);
            } else {
                Notification::create([
                    'user_id' => $isRenter ? $booking->operator_id : $booking->renter_id,
                    'title' => $newStatus === 'cancelled' ? 'Booking Cancelled' : 'Booking Declined',
                    'message' => $newStatus === 'cancelled' ? 'Reservation was cancelled.' : 'Reservation was declined.',
                    'type' => 'warning',
                    'action_url' => $isRenter ? '/operator-bookings' : '/(tabs)/bookings',
                ]);

                // When an unpaid booking is cancelled, retain record as cancelled so cancellation limits & anti-spam history are preserved
                if ($newStatus === 'cancelled') {
                    $booking->update([
                        'status' => 'cancelled',
                        'cancelled_at' => now(),
                    ]);

                    return response()->json([
                        'success' => true,
                        'message' => 'Unpaid booking cancelled.',
                        'data' => $booking->fresh(),
                    ]);
                }
            }
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

    /**
     * 9. Delete a single booking (Only cancelled, rejected, or completed bookings can be deleted by renter)
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $booking = Booking::where('id', $id)
            ->where(function ($query) use ($user) {
                $query->where('renter_id', $user->id)
                    ->orWhere('operator_id', $user->id);
            })
            ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found or unauthorized.',
            ], 404);
        }

        // Active bookings cannot be deleted
        if (in_array($booking->status, ['pending_verification', 'approved', 'ongoing', 'awaiting_pickup', 'pickup_in_progress', 'ready_to_start', 'trip_in_progress', 'return_pending'])) {
            return response()->json([
                'success' => false,
                'message' => 'Active bookings cannot be deleted.',
            ], 422);
        }

        // Refundable bookings with pending refund cannot be deleted
        if ($booking->refund_status === 'pending' || $booking->payment_status === 'refund_pending') {
            return response()->json([
                'success' => false,
                'message' => 'Bookings with pending refunds cannot be removed. Please settle the refund first.',
            ], 422);
        }

        $booking->delete();

        return response()->json([
            'success' => true,
            'message' => 'Booking record deleted successfully.',
        ]);
    }

    /**
     * 10. Batch delete multiple bookings
     */
    public function batchDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'booking_ids' => ['required', 'array', 'min:1'],
            'booking_ids.*' => ['integer'],
        ]);

        $user = $request->user();
        $bookingIds = $validated['booking_ids'];

        // Only allow deleting non-active bookings owned by the user without pending refund
        $deletableBookings = Booking::whereIn('id', $bookingIds)
            ->where(function ($query) use ($user) {
                $query->where('renter_id', $user->id)
                    ->orWhere('operator_id', $user->id);
            })
            ->whereIn('status', ['pending_payment', 'cancelled', 'rejected', 'completed', 'no_show'])
            ->where(function ($q) {
                $q->whereNull('refund_status')->orWhere('refund_status', '!=', 'pending');
            })
            ->where(function ($q) {
                $q->whereNull('payment_status')->orWhere('payment_status', '!=', 'refund_pending');
            })
            ->get();

        $deletedCount = 0;
        foreach ($deletableBookings as $booking) {
            $booking->delete();
            $deletedCount++;
        }

        return response()->json([
            'success' => true,
            'message' => "Successfully deleted {$deletedCount} booking(s).",
            'deleted_count' => $deletedCount,
        ]);
    }

    /**
     * 11. Operator/Admin Processes & Submits Refund Proof
     */
    public function processRefund(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'refund_reference' => ['required', 'string', 'min:3', 'max:100'],
            'refund_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $booking = Booking::with(['renter', 'vehicle'])->findOrFail($id);
        $user = $request->user();

        if ($user->id !== $booking->operator_id && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Only the operator or an administrator can process refunds.',
            ], 403);
        }

        if ($booking->refund_status === 'refunded' || $booking->payment_status === 'refunded') {
            return response()->json([
                'success' => false,
                'message' => 'This refund has already been recorded as completed.',
            ], 422);
        }

        $booking->update([
            'refund_status' => 'refunded',
            'payment_status' => 'refunded',
            'refund_reference' => $validated['refund_reference'],
            'refund_notes' => $validated['refund_notes'] ?? null,
            'refunded_at' => now(),
        ]);

        // Notify Renter
        Notification::create([
            'user_id' => $booking->renter_id,
            'title' => 'Refund Completed',
            'message' => "The host has processed your ₱" . number_format($booking->refund_amount ?: $booking->reservation_fee, 2) . " reservation refund. Reference ID: {$validated['refund_reference']}.",
            'type' => 'success',
            'action_url' => '/(tabs)/bookings',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Refund proof submitted successfully.',
            'data' => $booking->fresh(),
        ]);
    }

    /**
     * Internal: Check and auto-expire pending reservations past their deadline
     */
    public function checkAndProcessExpirations(): void
    {
        $now = now();

        // 1. Pending Verification bookings that reached expires_at without host action
        $expiredPendingVerification = Booking::with(['vehicle', 'renter', 'operator'])
            ->where('status', 'pending_verification')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', $now)
            ->get();

        foreach ($expiredPendingVerification as $booking) {
            $booking->update([
                'status' => 'cancelled',
                'payment_status' => 'refund_pending',
                'refund_status' => 'pending',
                'refund_amount' => $booking->reservation_fee,
            ]);

            // Sync vehicle availability
            if ($booking->vehicle) {
                $vehicle = $booking->vehicle;
                $totalUnits = max(1, (int) ($vehicle->quantity ?? 1));
                $activeUnits = Booking::where('vehicle_id', $vehicle->id)
                    ->whereIn('status', ['pending_verification', 'approved', 'awaiting_pickup', 'pickup_in_progress', 'ready_to_start', 'trip_in_progress', 'return_pending', 'ongoing'])
                    ->count();
                $remUnits = max(0, $totalUnits - $activeUnits);
                $vehicle->update([
                    'available_units' => $remUnits,
                    'availability_status' => $remUnits === 0 ? 'unavailable' : 'available',
                ]);
            }

            // Contextual notification to Renter
            $renterName = $booking->renter_refund_account_name ?: ($booking->renter ? $booking->renter->name : 'Renter');
            $refundDest = "{$booking->renter_refund_method} ({$booking->renter_refund_account_number})";

            Notification::create([
                'user_id' => $booking->renter_id,
                'title' => 'Booking Auto-Cancelled (Refund Pending)',
                'message' => "The host did not confirm booking #{$booking->id} in time. Your ₱" . number_format($booking->reservation_fee, 2) . " reservation fee is marked for refund to your {$refundDest}.",
                'type' => 'warning',
                'action_url' => '/(tabs)/bookings',
            ]);

            // Urgent task notification to Operator
            Notification::create([
                'user_id' => $booking->operator_id,
                'title' => 'Refund Required (Auto-Expired)',
                'message' => "Booking #{$booking->id} expired without verification. Please refund ₱" . number_format($booking->reservation_fee, 2) . " to {$renterName} via {$refundDest}.",
                'type' => 'warning',
                'action_url' => '/operator-bookings',
            ]);
        }

        // 2. Pending Payment bookings (unsettled) past deadline
        $expiredPendingPayment = Booking::where('status', 'pending_payment')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', $now)
            ->get();

        foreach ($expiredPendingPayment as $booking) {
            $booking->update([
                'status' => 'cancelled',
                'payment_status' => 'unpaid',
            ]);

            Notification::create([
                'user_id' => $booking->renter_id,
                'title' => 'Booking Expired',
                'message' => "Booking #{$booking->id} was cancelled due to unpaid reservation fee in time.",
                'type' => 'info',
                'action_url' => '/(tabs)/bookings',
            ]);
        }
    }

    /**
     * 12. Renter requests a rental extension (Schedule request only, no payment yet)
     */
    public function requestExtension(Request $request, int $id): JsonResponse
    {
        if (!$request->filled('extension_end_date') && $request->filled('extended_end_date')) {
            $request->merge(['extension_end_date' => $request->input('extended_end_date')]);
        }

        $validated = $request->validate([
            'extension_end_date' => ['required', 'date'],
            'extension_notes' => ['nullable', 'string', 'max:500'],
            'extension_days' => ['nullable', 'integer'],
        ]);

        $booking = Booking::with(['vehicle', 'operator'])->where('renter_id', $request->user()->id)->findOrFail($id);

        if (!in_array($booking->status, ['approved', 'ongoing', 'pickup_in_progress', 'ready_to_start', 'trip_in_progress'])) {
            return response()->json([
                'success' => false,
                'message' => 'Extensions can only be requested for confirmed or ongoing active rentals.',
            ], 422);
        }

        $currentEnd = \Carbon\Carbon::parse($booking->extension_status === 'approved' ? ($booking->extension_end_date ?: $booking->end_date) : $booking->end_date)->startOfDay();
        $newEnd = \Carbon\Carbon::parse($validated['extension_end_date'])->startOfDay();

        if ($newEnd->lte($currentEnd)) {
            return response()->json([
                'success' => false,
                'message' => 'The extension return date must be after your current return date (' . $currentEnd->format('M d, Y') . ').',
            ], 422);
        }

        $extraDays = max(1, (int) round($currentEnd->diffInDays($newEnd)));
        $dailyRate = (float) ($booking->vehicle?->daily_rate ?: $booking->daily_rate ?: 0);
        if ($dailyRate <= 0 && $booking->total_days > 0) {
            $dailyRate = (float) $booking->total_price / (float) $booking->total_days;
        }
        $extensionPrice = $extraDays * $dailyRate;

        $booking->update([
            'extension_days' => $extraDays,
            'extension_end_date' => $newEnd->toDateString(),
            'extension_price' => $extensionPrice,
            'extension_status' => 'pending',
            'extension_notes' => $validated['extension_notes'] ?? null,
            'extension_requested_at' => now(),
            'extension_payment_method' => null,
            'extension_payment_reference' => null,
            'extension_paid_at' => null,
        ]);

        $vehicleTitle = trim(($booking->vehicle?->brand ?? '') . ' ' . ($booking->vehicle?->name ?? 'Vehicle'));

        // Notify Operator to review the requested dates
        Notification::create([
            'user_id' => $booking->operator_id,
            'title' => 'Extension Requested',
            'message' => "Renter requested +{$extraDays} day(s) extension for {$vehicleTitle} until " . $newEnd->format('M d, Y') . " (₱" . number_format($extensionPrice, 2) . "). Please review.",
            'type' => 'booking',
            'action_url' => '/operator-bookings',
        ]);

        // Notify Renter
        Notification::create([
            'user_id' => $booking->renter_id,
            'title' => 'Extension Submitted',
            'message' => "Extension request (+{$extraDays} days until " . $newEnd->format('M d, Y') . ") submitted to host for review.",
            'type' => 'info',
            'action_url' => '/(tabs)/bookings',
        ]);

        return response()->json([
            'success' => true,
            'message' => "Extension request for +{$extraDays} day(s) submitted for host review.",
            'data' => $booking->fresh(['vehicle', 'operator']),
        ]);
    }

    /**
     * 13. Operator agrees to rental extension schedule (Renter can now pay)
     */
    public function approveExtension(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with(['vehicle', 'renter'])->where('operator_id', $request->user()->id)->findOrFail($id);

        if ($booking->extension_status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'No pending extension request found for this booking.',
            ], 422);
        }

        $extraDays = (int) ($booking->extension_days ?: 1);
        $newEnd = $booking->extension_end_date ?: $booking->extended_end_date;
        if (!$newEnd) {
            $newEnd = \Carbon\Carbon::parse($booking->end_date)->addDays($extraDays)->toDateString();
        }

        $extraPrice = (float) ($booking->extension_price ?: $booking->extension_fee ?: 0);
        if ($extraPrice <= 0) {
            $dailyRate = (float) ($booking->vehicle?->daily_rate ?: $booking->daily_rate ?: 0);
            $extraPrice = $extraDays * $dailyRate;
        }

        // Set status to payment_required so renter can proceed with GCash payment
        $booking->update([
            'extension_status' => 'payment_required',
            'extension_price' => $extraPrice,
            'extension_end_date' => $newEnd,
        ]);

        $newEndFormatted = \Carbon\Carbon::parse($newEnd)->format('M d, Y');

        // Notify Renter to settle payment
        Notification::create([
            'user_id' => $booking->renter_id,
            'title' => 'Extension Agreed by Host',
            'message' => "Your host agreed to the +{$extraDays} day extension until {$newEndFormatted}! Please settle the extension fee of ₱" . number_format($extraPrice, 2) . " to confirm your schedule.",
            'type' => 'success',
            'action_url' => '/(tabs)/bookings',
        ]);

        // Notify Operator
        Notification::create([
            'user_id' => $booking->operator_id,
            'title' => 'Extension Agreed',
            'message' => "You agreed to the extension for Booking #{$booking->id}. Awaiting renter payment of ₱" . number_format($extraPrice, 2) . ".",
            'type' => 'info',
            'action_url' => '/operator-bookings',
        ]);

        return response()->json([
            'success' => true,
            'message' => "Extension agreed. Renter notified to settle the extension payment.",
            'data' => $booking->fresh(['vehicle', 'renter']),
        ]);
    }

    /**
     * 14. Operator declines rental extension
     */
    public function rejectExtension(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with(['vehicle', 'renter'])->where('operator_id', $request->user()->id)->findOrFail($id);

        if (!in_array($booking->extension_status, ['pending', 'payment_required'])) {
            return response()->json([
                'success' => false,
                'message' => 'No active extension request found to decline.',
            ], 422);
        }

        $booking->update([
            'extension_status' => 'rejected',
        ]);

        // Notify Renter
        Notification::create([
            'user_id' => $booking->renter_id,
            'title' => 'Extension Declined',
            'message' => "Your host was unable to approve the extension for Booking #{$booking->id}. Please return the vehicle on the original schedule.",
            'type' => 'warning',
            'action_url' => '/(tabs)/bookings',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Extension request declined.',
            'data' => $booking->fresh(['vehicle', 'renter']),
        ]);
    }

    /**
     * 15. Renter settles extension fee (Updates booking dates & dispatches receipt to chat)
     */
    public function settleExtensionPayment(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => ['required', 'string', 'in:gcash,maya,bank_transfer,cash'],
            'payment_reference' => ['required', 'string', 'regex:/^[\d\s-]{10,20}$/'],
        ], [
            'payment_reference.required' => 'Payment reference number is required to verify your transaction.',
            'payment_reference.regex' => 'Please enter a valid GCash reference number (typically 13 digits from your receipt).',
        ]);

        $booking = Booking::with(['vehicle', 'operator', 'renter'])->where('renter_id', $request->user()->id)->findOrFail($id);

        if (!in_array($booking->extension_status, ['payment_required', 'pending'])) {
            return response()->json([
                'success' => false,
                'message' => 'This booking does not currently have an approved extension awaiting payment.',
            ], 422);
        }

        $extraDays = (int) ($booking->extension_days ?: 1);
        $newEnd = $booking->extension_end_date ?: $booking->extended_end_date;
        if (!$newEnd) {
            $newEnd = \Carbon\Carbon::parse($booking->end_date)->addDays($extraDays)->toDateString();
        }

        $extraPrice = (float) ($booking->extension_price ?: $booking->extension_fee ?: 0);
        if ($extraPrice <= 0) {
            $dailyRate = (float) ($booking->vehicle?->daily_rate ?: $booking->daily_rate ?: 0);
            $extraPrice = $extraDays * $dailyRate;
        }

        $start = new \DateTime($booking->start_date);
        $end = new \DateTime($newEnd);
        $calcTotalDays = max(1, $start->diff($end)->days);

        $booking->update([
            'end_date' => $newEnd,
            'total_days' => $calcTotalDays,
            'total_price' => ((float) $booking->total_price) + $extraPrice,
            'extension_status' => 'approved',
            'extension_end_date' => $newEnd,
            'extension_price' => $extraPrice,
            'extension_payment_method' => $validated['payment_method'],
            'extension_payment_reference' => $validated['payment_reference'],
            'extension_paid_at' => now(),
        ]);

        $vehicle = $booking->vehicle;
        $vehicleTitle = trim(($vehicle->brand ?? '') . ' ' . ($vehicle->name ?? 'Vehicle'));
        $paymentRefDisplay = trim($validated['payment_reference']);
        $newEndDateFormatted = \Carbon\Carbon::parse($newEnd)->format('M d, Y');

        // Auto-post official extension payment receipt into operator chat thread
        $receiptMessageText = "🧾 EXTENSION PAYMENT RECEIPT\n"
            . "──────────────────────────────\n"
            . "Vehicle: {$vehicleTitle}\n"
            . "Schedule: Extended by +{$extraDays} " . ($extraDays == 1 ? 'day' : 'days') . " (until {$newEndDateFormatted})\n"
            . "Method: " . strtoupper($validated['payment_method']) . "\n"
            . "Reference: {$paymentRefDisplay}\n"
            . "──────────────────────────────\n"
            . "Amount Paid: ₱" . number_format($extraPrice, 2) . "\n"
            . "Status: Extension Fee Settled\n"
            . "──────────────────────────────\n"
            . "Rental Extended Successfully";

        $operatorUserId = $booking->operator_id ?: ($vehicle->operator_id ?? null) ?: ($booking->vehicle?->operator_id ?? null);

        if ($operatorUserId) {
            Message::create([
                'sender_id' => $request->user()->id,
                'receiver_id' => $operatorUserId,
                'vehicle_id' => $booking->vehicle_id,
                'message' => $receiptMessageText,
                'is_read' => false,
            ]);

            Notification::create([
                'user_id' => $operatorUserId,
                'title' => 'Extension Payment Settled',
                'message' => "Extension fee of ₱" . number_format($extraPrice, 2) . " (Ref: {$paymentRefDisplay}) paid for {$vehicleTitle}. New return date is {$newEndDateFormatted}.",
                'type' => 'booking',
                'action_url' => '/operator-bookings',
            ]);
        }

        Notification::create([
            'user_id' => $booking->renter_id,
            'title' => 'Rental Extension Confirmed',
            'message' => "Your rental extension of +{$extraDays} day(s) until {$newEndDateFormatted} has been confirmed. Official receipt shared in your host chat.",
            'type' => 'success',
            'action_url' => '/(tabs)/bookings',
        ]);

        return response()->json([
            'success' => true,
            'message' => "Rental extension fee settled successfully! Booking extended until {$newEndDateFormatted}.",
            'data' => $booking->fresh(['vehicle', 'operator', 'renter']),
        ]);
    }
}
