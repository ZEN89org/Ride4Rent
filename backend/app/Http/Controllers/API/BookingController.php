<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Message;
use App\Models\Notification;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\BookingExpirationService;
use App\Services\DemandPricingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->checkAndProcessExpirations($user?->id);

        if ($user->role === 'operator') {
            $bookings = Booking::with(['renter', 'vehicle.images'])
                ->where('operator_id', $user->id)
                ->latest()
                ->get();
        } else {
            $bookings = Booking::with(['vehicle.images', 'vehicle.operator.operatorProfile', 'operator.operatorProfile'])
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

        if ($user->role !== 'customer') {
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
                'message' => "Your driver's license was rejected: ".($user->license_rejection_reason ?? 'Please re-upload valid, clear license photos before booking.'),
            ], 422);
        }

        $validated = $request->validate([
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'pickup_time' => ['nullable', 'regex:/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/'],
            'return_time' => ['nullable', 'regex:/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        if (Carbon::parse($validated['start_date'])->startOfDay()->gt(now()->startOfDay()->addDays((int) PlatformSetting::get('max_advance_days', '30')))) {
            return response()->json(['message' => 'The pickup date exceeds the maximum advance booking period.'], 422);
        }
        $vehicle = Vehicle::findOrFail($validated['vehicle_id']);
        if ($vehicle->operator?->account_status !== 'active') {
            return response()->json(['message' => 'This operator is not currently active.'], 422);
        }
        if ($vehicle->operator?->is_frozen) {
            return response()->json([
                'success' => false,
                'message' => 'This vehicle is currently unavailable because the host is temporarily not accepting new bookings.',
                'code' => 'OPERATOR_FROZEN',
            ], 422);
        }

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
            ->whereIn('status', Booking::ACTIVE_STATUSES)
            ->count();

        $totalUnits = max(1, (int) ($vehicle->quantity ?? 1));

        if (! $vehicle->is_active || $vehicle->availability_status === 'unavailable' || $activeBookingsCount >= $totalUnits) {
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

        $dailyRate = (float) DemandPricingService::calculateVehicleDemand($vehicle)['effective_price'];
        $totalPrice = $dailyRate * $totalDays;
        $resFee = round($totalPrice * 0.05, 2);

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
            'pickup_at' => Carbon::parse($validated['start_date'].' '.($validated['pickup_time'] ?? '10:00 AM'), 'Asia/Manila')->utc(),
            'return_at' => Carbon::parse($validated['end_date'].' '.($validated['return_time'] ?? '10:00 AM'), 'Asia/Manila')->utc(),
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

        if ($booking->expires_at?->isPast()) {
            return response()->json(['message' => 'This reservation has expired.'], 422);
        }

        // Multi-unit race check: verify remaining available units before allowing settlement
        $vehicle = $booking->vehicle;
        $totalUnits = max(1, (int) ($vehicle->quantity ?? 1));
        $takenUnits = Booking::where('vehicle_id', $vehicle->id)
            ->where('id', '!=', $booking->id)
            ->whereIn('status', Booking::ACTIVE_STATUSES)
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

        if ($hasConcurrentSettledTrip && (! $booking->is_multi_vehicle_rental || empty($booking->secondary_driver_name))) {
            $otherDates = Carbon::parse($hasConcurrentSettledTrip->start_date)->format('M d').' – '.Carbon::parse($hasConcurrentSettledTrip->end_date)->format('M d');

            return response()->json([
                'success' => false,
                'message' => "You currently have another active vehicle reservation during overlapping dates ({$otherDates}). Renting multiple vehicles simultaneously requires an authorized secondary driver designated during booking.",
            ], 422);
        }

        $renter = $request->user();
        $refundMethod = $validated['renter_refund_method'] ?? $validated['payment_method'];
        $refundName = $validated['renter_refund_account_name'] ?? trim(($renter->first_name ?? '').' '.($renter->last_name ?? '')) ?: ($renter->name ?? 'Renter');
        $refundNumber = $validated['renter_refund_account_number'] ?? ($renter->phone_number ?? $renter->phone ?? '');

        $booking->update([
            'payment_method' => $validated['payment_method'],
            'payment_reference' => $validated['payment_reference'] ?? 'REF-'.strtoupper(uniqid()),
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
        $vehicleTitle = self::formatVehicleName($vehicle);
        $paymentRefDisplay = ! empty($validated['payment_reference']) ? $validated['payment_reference'] : 'Cash submitted for host verification';
        $startDateFormatted = Carbon::parse($booking->start_date)->format('M d, Y');
        $endDateFormatted = Carbon::parse($booking->end_date)->format('M d, Y');

        $operatorUserId = $booking->operator_id ?: ($vehicle->operator_id ?? null) ?: ($booking->vehicle?->operator_id ?? null);
        $operator = $operatorUserId ? User::with('operatorProfile')->find($operatorUserId) : null;
        $operatorProfile = $operator?->operatorProfile;
        $operatorRealName = trim(($operator?->first_name ?? '').' '.($operator?->last_name ?? ''));
        $operatorName = $operatorRealName ?: ($operator?->name ?: ($operatorProfile?->account_name ?: 'Vehicle Host'));

        $receiptMessageText = "🧾 PAYMENT RECEIPT\n"
            ."──────────────────────────────\n"
            ."Vehicle: {$vehicleTitle}\n"
            ."Recipient: {$operatorName}\n"
            ."Schedule: {$startDateFormatted} – {$endDateFormatted} ({$booking->total_days} ".($booking->total_days == 1 ? 'day' : 'days').")\n"
            .'Method: '.strtoupper($validated['payment_method'])."\n"
            ."Reference: {$paymentRefDisplay}\n"
            ."──────────────────────────────\n"
            .'Submitted Amount: ₱'.number_format($booking->reservation_fee, 2)."\n"
            ."Status: Payment Submitted — Awaiting Host Verification\n"
            ."──────────────────────────────\n"
            .'Awaiting host verification';

        if ($operatorUserId) {
            $alreadySent = Message::where('sender_id', $renter->id)
                ->where('receiver_id', $operatorUserId)
                ->where('message', 'like', "%{$paymentRefDisplay}%")
                ->exists();

            if (! $alreadySent) {
                Message::create([
                    'sender_id' => $renter->id,
                    'receiver_id' => $operatorUserId,
                    'vehicle_id' => $booking->vehicle_id,
                    'message' => $receiptMessageText,
                    'is_read' => false,
                ]);
            }

            Notification::create([
                'user_id' => $operatorUserId,
                'title' => 'Payment Submitted',
                'message' => 'Renter submitted reservation payment for verification.',
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

        if (! in_array($booking->status, ['pending_payment', 'pending_verification'])) {
            return response()->json(['message' => 'Only pending reservations can be approved.'], 422);
        }
        if ($booking->expires_at?->isPast()) {
            return response()->json(['message' => 'This reservation has expired.'], 422);
        }
        $otherUnits = Booking::where('vehicle_id', $booking->vehicle_id)->where('id', '!=', $booking->id)->whereIn('status', Booking::ACTIVE_STATUSES)->count();
        if (! $booking->vehicle?->is_active || $otherUnits >= max(1, (int) $booking->vehicle?->quantity)) {
            return response()->json(['message' => 'No units remain for this reservation.'], 422);
        }
        $overlap = Booking::where('renter_id', $booking->renter_id)->where('id', '!=', $booking->id)
            ->whereIn('status', Booking::ACTIVE_STATUSES)->where('start_date', '<=', $booking->end_date)->where('end_date', '>=', $booking->start_date)->exists();
        if ($overlap && (! $booking->is_multi_vehicle_rental || ! $booking->secondary_driver_name)) {
            return response()->json(['message' => 'An overlapping rental requires a designated secondary driver.'], 422);
        }
        if (!$booking->renter?->drivers_license_front || !$booking->renter?->drivers_license_back || $booking->renter?->license_verification_status === 'rejected') {
            return response()->json(['message' => 'Ask the renter to upload both sides of a valid license before approval.'], 422);
        }
        $booking->renter->update([
            'is_drivers_license_verified' => true,
            'license_verification_status' => 'approved',
            'license_rejection_reason' => null,
        ]);
        $booking->update([
            'status' => 'approved',
            'payment_status' => 'paid_reservation',
            'payment_method' => $validated['payment_method'] ?? $booking->payment_method ?? 'cash',
        ]);

        // Auto update remaining available units
        if ($booking->vehicle) {
            $vehicle = $booking->vehicle;
            $totalUnits = max(1, (int) ($vehicle->quantity ?? 1));
            $activeUnits = Booking::where('vehicle_id', $vehicle->id)
                ->whereIn('status', Booking::ACTIVE_STATUSES)
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
            'title' => 'Booking Approved',
            'message' => 'Your booking has been approved by the host.',
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
            'rental_balance_collected' => ['required', 'accepted'],
            'start_fuel_level' => ['required', 'integer', 'min:0', 'max:100'],
            'start_inspection_notes' => ['nullable', 'string', 'max:1000'],
            'start_inspection_photos' => ['nullable', 'array', 'max:10'],
            'start_inspection_photos.*' => ['image', 'max:10240'],
        ]);

        $booking = Booking::with(['vehicle', 'renter', 'operator'])->findOrFail($id);
        $user = $request->user();

        if ($user->id !== $booking->operator_id) {
            return response()->json([
                'success' => false,
                'message' => 'Only the operator can perform handover and start the trip.',
            ], 403);
        }

        if (! in_array($booking->status, ['approved', 'awaiting_pickup', 'pickup_in_progress', 'ready_to_start'])) {
            return response()->json([
                'success' => false,
                'message' => 'Trip cannot be started in its current status: '.$booking->status,
            ], 422);
        }

        if (!in_array($booking->payment_status, ['paid_reservation', 'paid_full'])) {
            return response()->json(['message' => 'Verify the reservation payment before handover.'], 422);
        }

        $photoPaths = [];
        if ($request->hasFile('start_inspection_photos')) {
            foreach ($request->file('start_inspection_photos') as $file) {
                $photoPaths[] = $file->store('inspections', 'public');
            }
        } elseif (isset($validated['start_inspection_photos']) && is_array($validated['start_inspection_photos'])) {
            $photoPaths = $validated['start_inspection_photos'];
        }

        $now = now();
        $booking->update([
            'status' => 'trip_in_progress',
            'actual_start_time' => $now,
            'rental_paid_amount' => max(0, (float) $booking->total_price - (float) $booking->extension_paid_total),
            'rental_balance_paid_at' => $now,
            'payment_status' => 'paid_full',
            'start_mileage' => $validated['start_mileage'],
            'start_fuel_level' => $validated['start_fuel_level'],
            'start_inspection_notes' => $validated['start_inspection_notes'] ?? null,
            'start_inspection_photos' => ! empty($photoPaths) ? $photoPaths : null,
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
            'settlement_confirmed' => ['required', 'accepted'],
            'end_fuel_level' => ['required', 'integer', 'min:0', 'max:100'],
            'fuel_charge' => ['nullable', 'numeric', 'min:0'],
            'damage_charge' => ['nullable', 'numeric', 'min:0'],
            'late_fee' => ['nullable', 'numeric', 'min:0'],
            'other_charges' => ['nullable', 'numeric', 'min:0'],
            'end_inspection_notes' => ['nullable', 'string', 'max:1000'],
            'end_inspection_photos' => ['nullable', 'array', 'max:10'],
            'end_inspection_photos.*' => ['image', 'max:10240'],
        ]);

        $booking = Booking::with(['vehicle', 'renter', 'operator'])->findOrFail($id);
        $user = $request->user();

        if ($user->id !== $booking->operator_id) {
            return response()->json([
                'success' => false,
                'message' => 'Only the operator can conduct return inspection and complete the trip.',
            ], 403);
        }

        if (! in_array($booking->status, ['trip_in_progress', 'return_pending', 'ongoing'])) {
            return response()->json([
                'success' => false,
                'message' => 'Trip cannot be completed from current status: '.$booking->status,
            ], 422);
        }

        if (in_array($booking->extension_status, ['pending', 'payment_required', 'pending_verification'])) {
            return response()->json(['message' => 'Finish or decline the outstanding extension request before completing the trip.'], 422);
        }
        $now = now();
        $startMileage = (int) ($booking->start_mileage ?? $validated['end_mileage']);
        $endMileage = (int) $validated['end_mileage'];
        if ($endMileage < $startMileage) {
            return response()->json(['message' => 'Return mileage cannot be lower than handover mileage.'], 422);
        }
        $distanceTraveled = max(0, $endMileage - $startMileage);

        $fuelCharge = (float) ($validated['fuel_charge'] ?? 0);
        $damageCharge = (float) ($validated['damage_charge'] ?? 0);
        $lateFee = (float) ($validated['late_fee'] ?? 0);
        $otherCharges = (float) ($validated['other_charges'] ?? 0);
        $additionalTotal = $fuelCharge + $damageCharge + $lateFee + $otherCharges;

        // Final amount calculation (subtract both initial reservation fee and settled extension payment)
        $totalPaidSoFar = (float) ($booking->rental_paid_amount ?: $booking->reservation_fee);
        if ((float) $booking->extension_paid_total > 0) {
            $totalPaidSoFar += (float) $booking->extension_paid_total;
        } elseif ($booking->extension_status === 'approved') {
            $totalPaidSoFar += (float) $booking->extension_price;
        }
        $finalAmountDue = max(0, (float) $booking->total_price - $totalPaidSoFar + $additionalTotal);

        $endPhotoPaths = [];
        if ($request->hasFile('end_inspection_photos')) {
            foreach ($request->file('end_inspection_photos') as $file) {
                $endPhotoPaths[] = $file->store('inspections', 'public');
            }
        } elseif (isset($validated['end_inspection_photos']) && is_array($validated['end_inspection_photos'])) {
            $endPhotoPaths = $validated['end_inspection_photos'];
        }

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
            'final_amount_due' => 0,
            'return_collected_amount' => $finalAmountDue,
            'rental_paid_amount' => max(0, (float) $booking->total_price - (float) $booking->extension_paid_total),
            'end_inspection_notes' => $validated['end_inspection_notes'] ?? null,
            'end_inspection_photos' => ! empty($endPhotoPaths) ? $endPhotoPaths : null,
        ]);

        $booking->vehicle?->update(['current_odometer' => max((int) $booking->vehicle->current_odometer, $endMileage)]);

        // Release vehicle availability count
        if ($booking->vehicle) {
            $vehicle = $booking->vehicle;
            $totalUnits = max(1, (int) ($vehicle->quantity ?? 1));
            $activeUnits = Booking::where('vehicle_id', $vehicle->id)
                ->whereIn('status', Booking::ACTIVE_STATUSES)
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
        if (! in_array($booking->status, ['trip_in_progress', 'ongoing', 'return_pending'])) {
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
        $booking = Booking::with(['vehicle.operator.operatorProfile', 'operator.operatorProfile', 'renter'])->findOrFail($id);
        $user = $request->user();

        // Only host operator or renter can view live location
        if ($user->id !== $booking->operator_id && $user->id !== $booking->renter_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $opLat = $booking->vehicle?->pickup_latitude ?? $booking->operator?->operatorProfile?->latitude;
        $opLng = $booking->vehicle?->pickup_longitude ?? $booking->operator?->operatorProfile?->longitude;
        $opAddress = $booking->pickup_location ?? $booking->vehicle?->pickup_address ?? $booking->operator?->operatorProfile?->business_address;
        $opBusinessName = $booking->operator?->operatorProfile?->business_name ?? 'Operator Hub';
        $renterName = $booking->renter ? trim($booking->renter->first_name . ' ' . $booking->renter->last_name) : 'Renter';

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
                'operator_latitude' => $opLat ? (float) $opLat : null,
                'operator_longitude' => $opLng ? (float) $opLng : null,
                'operator_address' => $opAddress,
                'operator_business_name' => $opBusinessName,
                'renter_name' => $renterName,
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
        $isHost = $user->id === $booking->operator_id;
        $allowed = $isHost
            ? ['approved', 'awaiting_pickup', 'pickup_in_progress', 'ready_to_start', 'return_pending', 'cancelled', 'rejected', 'no_show']
            : ['pickup_in_progress', 'return_pending', 'cancelled'];
        if (! in_array($newStatus, $allowed)) {
            return response()->json(['message' => 'You cannot perform this booking action.'], 403);
        }
        $transitions = [
            'approved' => ['pending_verification'],
            'awaiting_pickup' => ['approved'],
            'pickup_in_progress' => ['approved', 'awaiting_pickup'],
            'ready_to_start' => ['pickup_in_progress'],
            'return_pending' => ['trip_in_progress', 'ongoing'],
            'cancelled' => ['pending_payment', 'pending_verification', 'approved', 'awaiting_pickup'],
            'rejected' => ['pending_payment', 'pending_verification'],
            'no_show' => ['approved', 'awaiting_pickup'],
        ];
        if (! in_array($booking->status, $transitions[$newStatus] ?? [])) {
            return response()->json(['message' => 'This action is not valid for the current booking status.'], 422);
        }
        if ($newStatus === 'approved') {
            return $this->confirmPayment($request, $id);
        }
        if ($newStatus === 'no_show' && now()->startOfDay()->lt($booking->start_date)) {
            return response()->json(['message' => 'A future pickup cannot be marked as no-show.'], 422);
        }

        if ($isHost && $newStatus === 'rejected' && $request->boolean('license_rejected') && $booking->renter) {
            $request->validate(['rejection_reason' => ['required', 'string', 'max:500']]);
            $reason = $request->input('rejection_reason');
            $booking->renter->update([
                'is_drivers_license_verified' => false,
                'license_verification_status' => 'rejected',
                'license_rejection_reason' => $reason,
            ]);
            Notification::create([
                'user_id' => $booking->renter_id,
                'title' => 'New License Photos Required',
                'message' => $reason.' Please upload new front and back photos of your license.',
                'type' => 'warning',
                'action_url' => '/driver-license',
            ]);
        }

        $booking->update(['status' => $newStatus]);

        // Vehicle availability state sync
        if ($booking->vehicle) {
            $vehicle = $booking->vehicle;
            $totalUnits = max(1, (int) ($vehicle->quantity ?? 1));
            $activeUnits = Booking::where('vehicle_id', $vehicle->id)
                ->whereIn('status', Booking::ACTIVE_STATUSES)
                ->count();

            $remUnits = max(0, $totalUnits - $activeUnits);
            $vehicle->update([
                'available_units' => $remUnits,
                'availability_status' => $remUnits === 0 ? 'unavailable' : 'available',
            ]);
        }

        // Contextual notifications
        if ($newStatus === 'approved' || $newStatus === 'awaiting_pickup') {
            Notification::create([
                'user_id' => $booking->renter_id,
                'title' => 'Booking Approved',
                'message' => 'Your booking has been approved by the host.',
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
                'title' => 'Marked as No-Show',
                'message' => 'Your booking was marked as no-show.',
                'type' => 'warning',
                'action_url' => '/(tabs)/bookings',
            ]);

            // Notify Host
            Notification::create([
                'user_id' => $booking->operator_id,
                'title' => 'Booking Closed',
                'message' => 'Booking closed as no-show.',
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
                    'title' => $newStatus === 'cancelled' ? 'Booking Cancelled' : 'Booking Declined',
                    'message' => $newStatus === 'cancelled'
                        ? 'Your booking was cancelled. Refund is pending.'
                        : 'Your booking was declined. Refund is pending.',
                    'type' => 'warning',
                    'action_url' => '/(tabs)/bookings',
                ]);

                // Urgent task notification to operator
                Notification::create([
                    'user_id' => $booking->operator_id,
                    'title' => 'Refund Required',
                    'message' => 'Please process the reservation refund for the cancelled booking.',
                    'type' => 'warning',
                    'action_url' => '/operator-bookings',
                ]);

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
            $avg = Booking::where('vehicle_id', $booking->vehicle_id)->whereNotNull('rating')->where('is_review_hidden', false)->avg('rating');
            $count = Booking::where('vehicle_id', $booking->vehicle_id)->whereNotNull('rating')->where('is_review_hidden', false)->count();
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

        if (! $booking) {
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
            'message' => 'Your reservation refund has been processed.',
            'type' => 'success',
            'action_url' => '/(tabs)/bookings',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Refund proof submitted successfully.',
            'data' => $booking->fresh(),
        ]);
    }

    public static function formatVehicleName(?Vehicle $vehicle): string
    {
        if (! $vehicle) {
            return 'your selected vehicle';
        }

        $brandName = '';
        if ($vehicle->relationLoaded('brand') && $vehicle->brand) {
            $brandName = trim((string) ($vehicle->brand->name ?? ''));
        } elseif (! empty($vehicle->brand_id)) {
            $brandName = trim((string) (\App\Models\VehicleBrand::where('id', $vehicle->brand_id)->value('name') ?? ''));
        }

        $rawName = trim((string) ($vehicle->name ?? ''));

        // If rawName is a JSON dump or contains serialized object code, clean and extract name
        if (str_starts_with($rawName, '{')) {
            $decoded = json_decode($rawName, true);
            if (is_array($decoded)) {
                $rawName = trim((string) ($decoded['name'] ?? $decoded['model'] ?? ''));
            }
        }

        if (empty($rawName)) {
            $rawName = trim((string) ($vehicle->model ?? 'Vehicle'));
        }

        if (! empty($brandName) && stripos($rawName, $brandName) === false) {
            return trim("{$brandName} {$rawName}");
        }

        return $rawName ?: 'your vehicle';
    }

    /**
     * Internal: Check and auto-expire pending reservations past their deadline,
     * and dispatch progressive "Don't Miss Your Ride" reminders for unpaid & upcoming bookings.
     */
    public function checkAndProcessExpirations(?int $userId = null): void
    {
        $now = now();

        app(BookingExpirationService::class)->expire();

        // 3. Progressive "Don't Miss Your Ride" Reminders for Unpaid Pending Bookings
        $activePendingQuery = Booking::with(['vehicle.brand'])
            ->where('status', 'pending_payment')
            ->where('payment_status', 'unpaid')
            ->where(function ($q) use ($now) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', $now);
            });

        if ($userId) {
            $activePendingQuery->where('renter_id', $userId);
        }

        $activePendingBookings = $activePendingQuery->get();

        foreach ($activePendingBookings as $booking) {
            if (! $booking->created_at) {
                continue;
            }

            $elapsedSeconds = max(0, $now->timestamp - $booking->created_at->timestamp);
            $vehicleName = self::formatVehicleName($booking->vehicle);
            $resFee = number_format((float) ($booking->reservation_fee ?: 500), 0);
            $tripDates = Carbon::parse($booking->start_date)->format('M d')
                .' – '
                .Carbon::parse($booking->end_date)->format('M d');

            // Ordered from latest milestone to earliest so we only trigger the highest reached milestone
            // without flooding multiple past milestones simultaneously if the user was offline.
            $stages = [
                [
                    'seconds' => 18 * 3600, // 18 hours (6 hours before 24h expiry)
                    'title' => 'Reservation Expiring Soon',
                    'message' => "Don't miss your reservation! Your pending booking for {$vehicleName} expires in 6 hours. Settle the ₱{$resFee} fee now to keep your slot.",
                    'type' => 'warning',
                ],
                [
                    'seconds' => 2 * 3600, // 2 hours
                    'title' => "Still Interested in {$vehicleName}?",
                    'message' => "Don't miss out on {$vehicleName} ({$tripDates}). Complete your ₱{$resFee} reservation before another renter books it!",
                    'type' => 'booking',
                ],
                [
                    'seconds' => 15 * 60, // 15 minutes
                    'title' => 'Complete Your Reservation',
                    'message' => "Your {$vehicleName} ({$tripDates}) is still waiting in your bookings. Settle the ₱{$resFee} reservation fee to lock in your trip.",
                    'type' => 'booking',
                ],
                [
                    'seconds' => 60, // 1 minute (first nudge & live demo friendly)
                    'title' => "Don't Miss Your Ride!",
                    'message' => "Your {$vehicleName} is waiting in your bookings! Settle the ₱{$resFee} reservation fee to lock in your trip dates.",
                    'type' => 'booking',
                ],
            ];

            foreach ($stages as $stage) {
                if ($elapsedSeconds >= $stage['seconds']) {
                    $alreadySent = Notification::where('user_id', $booking->renter_id)
                        ->where('title', $stage['title'])
                        ->where('created_at', '>=', $booking->created_at)
                        ->exists();

                    if (! $alreadySent) {
                        Notification::create([
                            'user_id' => $booking->renter_id,
                            'title' => $stage['title'],
                            'message' => $stage['message'],
                            'type' => $stage['type'],
                            'action_url' => '/(tabs)/bookings',
                            'is_read' => false,
                        ]);
                    }
                    // Break so only the current active milestone is evaluated per cycle
                    break;
                }
            }
        }

        // 4. Upcoming Trip Reminder (1 Day Before or Day of Pickup for Approved Bookings)
        $approvedQuery = Booking::with(['vehicle.brand'])
            ->whereIn('status', ['approved', 'awaiting_pickup']);

        if ($userId) {
            $approvedQuery->where('renter_id', $userId);
        }

        $approvedBookings = $approvedQuery->get();
        $today = $now->copy()->startOfDay();

        foreach ($approvedBookings as $booking) {
            if (! $booking->start_date) {
                continue;
            }

            $startDay = Carbon::parse($booking->start_date)->startOfDay();
            $daysUntilPickup = (int) $today->diffInDays($startDay, false);

            if ($daysUntilPickup >= 0 && $daysUntilPickup <= 1) {
                $vehicleName = self::formatVehicleName($booking->vehicle);
                $startFormatted = $startDay->format('M d, Y');
                $whenLabel = $daysUntilPickup === 0 ? 'today' : 'tomorrow';
                $reminderTitle = 'Upcoming Trip Reminder';
                $reminderMessage = "Don't miss your trip {$whenLabel} with {$vehicleName} ({$startFormatted})! Check your pickup details and bring your driver's license.";

                $alreadyReminded = Notification::where('user_id', $booking->renter_id)
                    ->where('title', $reminderTitle)
                    ->where('message', 'like', "%{$vehicleName}%")
                    ->where('created_at', '>=', $booking->created_at ?? $now->copy()->subDays(30))
                    ->exists();

                if (! $alreadyReminded) {
                    Notification::create([
                        'user_id' => $booking->renter_id,
                        'title' => $reminderTitle,
                        'message' => $reminderMessage,
                        'type' => 'booking',
                        'action_url' => '/(tabs)/bookings',
                        'is_read' => false,
                    ]);
                }
            }
        }
    }

    /**
     * 12. Renter requests a rental extension (Schedule request only, no payment yet)
     */
    public function requestExtension(Request $request, int $id): JsonResponse
    {
        if (! $request->filled('extension_end_date') && $request->filled('extended_end_date')) {
            $request->merge(['extension_end_date' => $request->input('extended_end_date')]);
        }

        $validated = $request->validate([
            'extension_end_date' => ['required', 'date'],
            'extension_notes' => ['nullable', 'string', 'max:500'],
            'extension_days' => ['nullable', 'integer'],
        ]);

        $booking = Booking::with(['vehicle', 'operator'])->where('renter_id', $request->user()->id)->findOrFail($id);

        if (! in_array($booking->status, ['ongoing', 'trip_in_progress'])) {
            return response()->json([
                'success' => false,
                'message' => 'Extensions can only be requested after handover while the trip is ongoing.',
            ], 422);
        }

        if (in_array($booking->extension_status, ['pending', 'payment_required', 'pending_verification'])) {
            return response()->json(['message' => 'Please finish the existing extension request first.'], 422);
        }
        $currentEnd = Carbon::parse($booking->extension_status === 'approved' ? ($booking->extension_end_date ?: $booking->end_date) : $booking->end_date)->startOfDay();
        $newEnd = Carbon::parse($validated['extension_end_date'])->startOfDay();

        if ($newEnd->lte($currentEnd)) {
            return response()->json([
                'success' => false,
                'message' => 'The extension return date must be after your current return date ('.$currentEnd->format('M d, Y').').',
            ], 422);
        }

        $extraDays = max(1, (int) round($currentEnd->diffInDays($newEnd)));
        $dailyRate = (float) ($booking->daily_rate ?: $booking->vehicle?->daily_rate ?: 0);
        if ($dailyRate <= 0 && $booking->total_days > 0) {
            $dailyRate = (float) $booking->total_price / (float) $booking->total_days;
        }
        if ($dailyRate <= 0) {
            $dailyRate = 2000;
        }
        $extensionPrice = $extraDays * $dailyRate;

        if ($booking->extension_status === 'approved' && ! (float) $booking->extension_paid_total) {
            $booking->extension_paid_total = (float) $booking->extension_price;
        }
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

        // Notify Operator to review the requested dates
        Notification::create([
            'user_id' => $booking->operator_id,
            'title' => 'Extension Requested',
            'message' => 'A renter requested a trip extension. Please review.',
            'type' => 'booking',
            'action_url' => '/operator-bookings',
        ]);

        // Notify Renter
        Notification::create([
            'user_id' => $booking->renter_id,
            'title' => 'Extension Submitted',
            'message' => 'Your trip extension request was sent to the host.',
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
        if (! $newEnd) {
            $newEnd = Carbon::parse($booking->end_date)->addDays($extraDays)->toDateString();
        }

        $extraPrice = (float) ($booking->extension_price ?: $booking->extension_fee ?: 0);
        if ($extraPrice <= 0) {
            $dailyRate = (float) ($booking->vehicle?->daily_rate ?: $booking->daily_rate ?: 0);
            if ($dailyRate <= 0 && (int) $booking->total_days > 0) {
                $dailyRate = (float) $booking->total_price / (float) $booking->total_days;
            }
            if ($dailyRate <= 0) {
                $dailyRate = 2000;
            }
            $extraPrice = $extraDays * $dailyRate;
        }

        // Set status to payment_required so renter can proceed with GCash payment
        $booking->update([
            'extension_status' => 'payment_required',
            'extension_days' => $extraDays,
            'extension_price' => $extraPrice,
            'extension_end_date' => $newEnd,
        ]);

        // Notify Renter to settle payment
        Notification::create([
            'user_id' => $booking->renter_id,
            'title' => 'Extension Approved',
            'message' => 'Your extension request was approved. Please settle the payment.',
            'type' => 'success',
            'action_url' => '/(tabs)/bookings',
        ]);

        // Notify Operator
        Notification::create([
            'user_id' => $booking->operator_id,
            'title' => 'Extension Approved',
            'message' => 'Extension approved. Awaiting renter payment.',
            'type' => 'info',
            'action_url' => '/operator-bookings',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Extension agreed. Renter notified to settle the extension payment.',
            'data' => $booking->fresh(['vehicle', 'renter']),
        ]);
    }

    /**
     * 14. Operator declines rental extension
     */
    public function rejectExtension(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with(['vehicle', 'renter'])->where('operator_id', $request->user()->id)->findOrFail($id);

        if (! in_array($booking->extension_status, ['pending', 'payment_required'])) {
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
            'message' => 'Your trip extension request was declined by the host.',
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
            'payment_method' => ['required', 'string', 'in:gcash'],
            'payment_reference' => ['required', 'string', 'regex:/^\d{13}$/'],
        ], [
            'payment_reference.required' => 'Payment reference number is required to verify your transaction.',
            'payment_reference.regex' => 'Please enter a valid GCash reference number (typically 13 digits from your receipt).',
        ]);

        $booking = Booking::with(['vehicle', 'operator', 'renter'])->where('renter_id', $request->user()->id)->findOrFail($id);

        if ($booking->extension_status !== 'payment_required' || ! in_array($booking->status, Booking::ACTIVE_STATUSES)) {
            return response()->json([
                'success' => false,
                'message' => 'This booking does not currently have an approved extension awaiting payment.',
            ], 422);
        }

        $booking->update([
            'extension_status' => 'pending_verification',
            'extension_payment_method' => $validated['payment_method'],
            'extension_payment_reference' => $validated['payment_reference'] ?? null,
        ]);
        Notification::create([
            'user_id' => $booking->operator_id, 'title' => 'Extension Payment Submitted',
            'message' => 'Please verify the extension payment before confirming the new return date.',
            'type' => 'booking', 'action_url' => '/operator-bookings',
        ]);

        return response()->json(['success' => true, 'message' => 'Extension payment submitted for host verification.', 'data' => $booking->fresh()]);
    }

    public function confirmExtensionPayment(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with(['vehicle', 'operator', 'renter'])->where('operator_id', $request->user()->id)->findOrFail($id);
        if ($booking->extension_status !== 'pending_verification' || ! in_array($booking->status, Booking::ACTIVE_STATUSES)) {
            return response()->json(['message' => 'No active extension payment awaits verification.'], 422);
        }

        return $this->finalizeExtensionPayment($booking);
    }

    private function finalizeExtensionPayment(Booking $booking): JsonResponse
    {
        $validated = ['payment_method' => $booking->extension_payment_method, 'payment_reference' => $booking->extension_payment_reference];
        $extraDays = (int) ($booking->extension_days ?: 1);
        $newEnd = $booking->extension_end_date ?: $booking->extended_end_date;
        if (! $newEnd) {
            $newEnd = Carbon::parse($booking->end_date)->addDays($extraDays)->toDateString();
        }

        $dailyRate = (float) ($booking->daily_rate ?: $booking->vehicle?->daily_rate ?: 0);
        if ($dailyRate <= 0 && (int) $booking->total_days > 0) {
            $dailyRate = (float) $booking->total_price / (float) $booking->total_days;
        }

        $extraPrice = (float) ($booking->extension_price > 0 ? $booking->extension_price : ($extraDays * $dailyRate));
        if ($extraPrice <= 0) {
            $extraPrice = $extraDays * 2000;
        }

        // Exact math: Directly increment the total days and total rental price
        $currentTotalDays = (int) ($booking->total_days ?: 1);
        $calcTotalDays = $currentTotalDays + $extraDays;
        $newTotalPrice = ((float) $booking->total_price) + $extraPrice;

        $booking->update([
            'end_date' => $newEnd,
            'total_days' => $calcTotalDays,
            'total_price' => $newTotalPrice,
            'extension_status' => 'approved',
            'return_at' => Carbon::parse($newEnd, 'Asia/Manila')->setTimeFrom(($booking->return_at ?: Carbon::parse('10:00', 'Asia/Manila'))->copy()->setTimezone('Asia/Manila'))->utc(),
            'extension_end_date' => $newEnd,
            'extension_price' => $extraPrice,
            'extension_payment_method' => $validated['payment_method'],
            'extension_payment_reference' => $validated['payment_reference'],
            'extension_paid_at' => now(),
            'extension_paid_total' => (float) $booking->extension_paid_total + $extraPrice,
        ]);

        $vehicle = $booking->vehicle;
        $vehicleTitle = self::formatVehicleName($vehicle);
        $paymentRefDisplay = trim($validated['payment_reference'] ?? 'Cash confirmed by host');
        $newEndDateFormatted = Carbon::parse($newEnd)->format('M d, Y');

        $operatorUserId = $booking->operator_id ?: ($vehicle->operator_id ?? null) ?: ($booking->vehicle?->operator_id ?? null);
        $operator = $operatorUserId ? User::with('operatorProfile')->find($operatorUserId) : null;
        $operatorProfile = $operator?->operatorProfile;
        $operatorRealName = trim(($operator?->first_name ?? '').' '.($operator?->last_name ?? ''));
        $operatorName = $operatorRealName ?: ($operator?->name ?: ($operatorProfile?->account_name ?: 'Vehicle Host'));

        // Auto-post official extension payment receipt into operator chat thread
        $receiptMessageText = "🧾 EXTENSION PAYMENT RECEIPT\n"
            ."──────────────────────────────\n"
            ."Vehicle: {$vehicleTitle}\n"
            ."Recipient: {$operatorName}\n"
            ."Schedule: Extended by +{$extraDays} ".($extraDays == 1 ? 'day' : 'days')." (until {$newEndDateFormatted})\n"
            .'Method: '.strtoupper($validated['payment_method'])."\n"
            ."Reference: {$paymentRefDisplay}\n"
            ."──────────────────────────────\n"
            .'Amount Paid: ₱'.number_format($extraPrice, 2)."\n"
            ."Status: Extension Fee Settled\n"
            ."──────────────────────────────\n"
            .'Rental Extended Successfully';

        if ($operatorUserId) {
            $alreadySent = Message::where('sender_id', $booking->renter_id)
                ->where('receiver_id', $operatorUserId)
                ->where('message', 'like', "%{$paymentRefDisplay}%")
                ->exists();

            if (! $alreadySent) {
                Message::create([
                    'sender_id' => $booking->renter_id,
                    'receiver_id' => $operatorUserId,
                    'vehicle_id' => $booking->vehicle_id,
                    'message' => $receiptMessageText,
                    'is_read' => false,
                ]);
            }

            Notification::create([
                'user_id' => $operatorUserId,
                'title' => 'Extension Paid',
                'message' => 'Renter paid the trip extension fee.',
                'type' => 'booking',
                'action_url' => '/operator-bookings',
            ]);
        }

        Notification::create([
            'user_id' => $booking->renter_id,
            'title' => 'Extension Confirmed',
            'message' => 'Your trip extension is confirmed.',
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
