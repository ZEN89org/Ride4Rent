<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\OperatorRemittance;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\CommissionService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OperatorController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $user = $request->user()->load('operatorProfile');

        return response()->json([
            'success' => true,
            'data' => [
                'role' => $user->role,
                'account_status' => $user->account_status,
                'is_frozen' => (bool) $user->is_frozen,
                'frozen_at' => $user->frozen_at?->format('Y-m-d H:i:s'),
                'freeze_reason' => $user->freeze_reason,
                'operator_profile' => $user->operatorProfile,
            ],
        ]);
    }

    /**
     * Get monthly revenue tracking and Ride4Rent admin commission breakdown.
     */
    public function revenue(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'operator' && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $now = now()->setTimezone('Asia/Manila');
        $requestedMonth = $request->query('month'); // format: 'YYYY-MM'
        $request->validate(['month' => ['nullable', 'date_format:Y-m']]);

        if ($requestedMonth && preg_match('/^\d{4}-\d{2}$/', $requestedMonth)) {
            $cycleStart = Carbon::createFromFormat('Y-m-d', $requestedMonth.'-01', 'Asia/Manila')->startOfMonth();
            $cycleEnd = $cycleStart->copy()->endOfMonth();
        } else {
            $cycleStart = $now->copy()->startOfMonth();
            $cycleEnd = $now->copy()->endOfMonth();
            $requestedMonth = $now->format('Y-m');
        }

        $isCurrentMonth = ($requestedMonth === $now->format('Y-m'));
        $daysRemaining = $isCurrentMonth ? max(0, (int) $now->diffInDays($cycleEnd, false)) : 0;

        $statement = OperatorRemittance::where('operator_id', $user->id)->where('billing_month', $requestedMonth)->first();
        $commissionPercent = (float) ($statement?->commission_rate ?? PlatformSetting::get('platform_fee_percent', env('PLATFORM_COMMISSION_PERCENT', 10.0)));

        // Fetch completed bookings for this operator within this month cycle
        $completedBookings = Booking::with(['vehicle', 'renter'])
            ->where('operator_id', $user->id)
            ->where('status', 'completed')
            ->where(function ($q) use ($cycleStart, $cycleEnd) {
                $q->whereBetween('actual_end_time', [$cycleStart, $cycleEnd])
                    ->orWhere(function ($sub) use ($cycleStart, $cycleEnd) {
                        $sub->whereNull('actual_end_time')
                            ->whereBetween('updated_at', [$cycleStart, $cycleEnd]);
                    });
            })
            ->latest()
            ->get();

        $grossRevenue = 0.0;
        $totalSurcharges = 0.0;
        $bookingsList = [];

        foreach ($completedBookings as $b) {
            $basePrice = (float) $b->total_price;
            $surcharges = (float) ($b->fuel_charge ?? 0)
                + (float) ($b->damage_charge ?? 0)
                + (float) ($b->late_fee ?? 0)
                + (float) ($b->other_charges ?? 0);

            $bookingGross = $basePrice + $surcharges;
            $bookingCommission = round($bookingGross * ($commissionPercent / 100), 2);
            $bookingNet = round($bookingGross - $bookingCommission, 2);

            $grossRevenue += $bookingGross;
            $totalSurcharges += $surcharges;

            $renterName = trim(($b->renter?->first_name ?? '').' '.($b->renter?->last_name ?? '')) ?: 'Customer';
            $vehicleName = $b->vehicle?->name ?? 'Vehicle';

            $completedDate = $b->actual_end_time
                ? $b->actual_end_time->setTimezone('Asia/Manila')->format('M d, Y h:i A')
                : $b->updated_at->setTimezone('Asia/Manila')->format('M d, Y h:i A');

            $bookingsList[] = [
                'id' => $b->id,
                'booking_code' => '#'.$b->id,
                'vehicle_name' => $vehicleName,
                'renter_name' => $renterName,
                'start_date' => $b->start_date ? $b->start_date->format('Y-m-d') : null,
                'end_date' => $b->end_date ? $b->end_date->format('Y-m-d') : null,
                'completed_at' => $completedDate,
                'base_rental' => $basePrice,
                'surcharges' => $surcharges,
                'gross_total' => $bookingGross,
                'commission_percent' => $commissionPercent,
                'commission_amount' => $bookingCommission,
                'net_amount' => $bookingNet,
            ];
        }

        $totalCommissionDue = round($grossRevenue * ($commissionPercent / 100), 2);
        $totalNetEarnings = round($grossRevenue - $totalCommissionDue, 2);

        // Active ongoing or approved bookings count
        $activeCount = Booking::where('operator_id', $user->id)
            ->whereIn('status', ['approved', 'awaiting_pickup', 'pickup_in_progress', 'ready_to_start', 'trip_in_progress', 'ongoing', 'return_pending'])
            ->count();

        // Historical months available for dropdown (from all completed trips)
        $allCompletedDates = Booking::where('operator_id', $user->id)
            ->where('status', 'completed')
            ->pluck('actual_end_time', 'updated_at');

        $monthCounts = [];
        foreach ($allCompletedDates as $updatedAt => $actualEndTime) {
            $dt = $actualEndTime ? Carbon::parse($actualEndTime) : Carbon::parse($updatedAt);
            $key = $dt->setTimezone('Asia/Manila')->format('Y-m');
            $monthCounts[$key] = ($monthCounts[$key] ?? 0) + 1;
        }

        krsort($monthCounts);

        $availableMonths = [];
        $hasCurrentInMonths = false;
        foreach ($monthCounts as $mKey => $count) {
            if ($mKey === $now->format('Y-m')) {
                $hasCurrentInMonths = true;
            }
            $mDate = Carbon::createFromFormat('Y-m', $mKey);
            $availableMonths[] = [
                'month' => $mKey,
                'label' => $mDate->format('F Y'),
                'count' => $count,
            ];
        }

        if (! $hasCurrentInMonths) {
            array_unshift($availableMonths, [
                'month' => $now->format('Y-m'),
                'label' => $now->format('F Y'),
                'count' => 0,
            ]);
        }

        // Remittance record for this billing month
        $remittance = OperatorRemittance::where('operator_id', $user->id)
            ->where('billing_month', $requestedMonth)
            ->first();

        // 48-Hour Grace Period calculations
        $graceDeadline = $remittance?->grace_period_expires_at ?? $cycleEnd->copy()->addHours(48);
        $graceHoursRemaining = max(0, (int) $now->diffInHours($graceDeadline, false));
        $isGraceExpired = $now->greaterThan($graceDeadline);
        $isFrozen = (bool) $user->is_frozen;

        return response()->json([
            'success' => true,
            'data' => [
                'month' => $requestedMonth,
                'month_label' => $cycleStart->format('F Y'),
                'cycle_start' => $cycleStart->format('M d, Y'),
                'cycle_end' => $cycleEnd->format('M d, Y'),
                'is_current_cycle' => $isCurrentMonth,
                'days_remaining_in_cycle' => $daysRemaining,
                'commission_percent' => $commissionPercent,
                'gross_revenue' => $grossRevenue,
                'commission_due' => $totalCommissionDue,
                'admin_payment_info' => [
                    'account_name' => PlatformSetting::get('commission_gcash_name', ''),
                    'account_number' => PlatformSetting::get('commission_gcash_number', ''),
                ],
                'net_earnings' => $totalNetEarnings,
                'completed_bookings_count' => count($bookingsList),
                'active_bookings_count' => $activeCount,
                'available_months' => $availableMonths,
                'bookings' => $bookingsList,
                'remittance' => [
                    'id' => $remittance?->id,
                    'status' => $remittance?->status ?? ($totalCommissionDue > 0 ? 'pending' : 'settled'),
                    'grace_period_expires_at' => $graceDeadline->format('Y-m-d H:i:s'),
                    'grace_hours_remaining' => $graceHoursRemaining,
                    'is_grace_expired' => $isGraceExpired,
                    'is_account_frozen' => $isFrozen,
                    'frozen_at' => $user->frozen_at?->format('Y-m-d H:i:s'),
                    'freeze_reason' => $user->freeze_reason,
                    'payment_method' => $remittance?->payment_method,
                    'payment_reference' => $remittance?->payment_reference,
                    'receipt_image_url' => $remittance?->receipt_image_url,
                    'submitted_at' => $remittance?->submitted_at?->format('Y-m-d H:i:s'),
                    'verified_at' => $remittance?->verified_at?->format('Y-m-d H:i:s'),
                    'admin_notes' => $remittance?->admin_notes,
                ],
            ],
        ]);
    }

    /**
     * Operator submits proof of 10% platform commission remittance.
     */
    public function submitRemittance(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'operator') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only vehicle operators can submit commission remittances.',
            ], 403);
        }

        $validated = $request->validate([
            'billing_month' => ['required', 'date_format:Y-m'],
            'payment_method' => ['required', 'string', 'in:GCash,gcash'],
            'payment_reference' => ['required', 'string', 'regex:/^\d{13}$/'],
            'receipt_image' => ['required', 'file', 'image', 'max:10240'],
            'operator_notes' => ['nullable', 'string', 'max:500'],
        ]);

        if ($validated['billing_month'] >= now('Asia/Manila')->format('Y-m')) {
            return response()->json(['message' => 'Submit commission payments after the monthly billing cycle closes.'], 422);
        }
        if (!PlatformSetting::get('commission_gcash_number', '') || !PlatformSetting::get('commission_gcash_name', '')) {
            return response()->json(['message' => 'The admin GCash account has not been set up. Please contact support before sending payment.'], 422);
        }

        // Look up or calculate remittance
        $commissionService = app(CommissionService::class);
        $commissionService->syncMonthlyRemittances($validated['billing_month']);

        $remittance = OperatorRemittance::where('operator_id', $user->id)
            ->where('billing_month', $validated['billing_month'])
            ->first();

        if (! $remittance) {
            return response()->json([
                'success' => false,
                'message' => 'No commission statement found for cycle '.$validated['billing_month'].'.',
            ], 404);
        }

        if (in_array($remittance->status, ['submitted', 'verified']) || (float) $remittance->commission_due <= 0) {
            return response()->json(['message' => 'This commission statement is already submitted, verified or has no amount due.'], 422);
        }
        $receiptPath = $request->file('receipt_image')->store('remittances', 'public');
        $remittance->update([
            'payment_method' => $validated['payment_method'],
            'payment_reference' => $validated['payment_reference'],
            'receipt_image' => $receiptPath,
            'status' => 'submitted',
            'submitted_at' => now(),
            'admin_notes' => $validated['operator_notes'] ?? null,
        ]);

        // Notify Admins
        $admins = User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'title' => 'Operator Remittance Submitted',
                'message' => "Operator {$user->first_name} {$user->last_name} submitted remittance proof for {$validated['billing_month']} (Ref: {$validated['payment_reference']}).",
                'type' => 'remittance_submitted',
                'action_url' => '/admin/dashboard#commissions',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Proof of commission payment submitted successfully! Admin will verify your remittance.',
            'data' => [
                'id' => $remittance->id,
                'billing_month' => $remittance->billing_month,
                'commission_due' => $remittance->commission_due,
                'payment_method' => $remittance->payment_method,
                'payment_reference' => $remittance->payment_reference,
                'receipt_image_url' => $remittance->receipt_image_url,
                'status' => $remittance->status,
                'submitted_at' => $remittance->submitted_at?->format('Y-m-d H:i:s'),
            ],
        ]);
    }

    /**
     * Resubmit operator business verification documents after rejection.
     */
    public function resubmitDocuments(Request $request): JsonResponse
    {
        $user = $request->user()->load('operatorProfile');
        $profile = $user->operatorProfile;

        if (! $profile) {
            return response()->json([
                'success' => false,
                'message' => 'Operator profile not found.',
            ], 404);
        }

        $validated = $request->validate([
            'business_permit_front' => ['nullable', 'image', 'max:10240'],
            'business_permit_back' => ['nullable', 'image', 'max:10240'],
            'government_id_front' => ['nullable', 'image', 'max:10240'],
            'government_id_back' => ['nullable', 'image', 'max:10240'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $updates = [];
        if ($request->hasFile('business_permit_front')) {
            $updates['business_permit_front'] = $request->file('business_permit_front')->store('operator_documents', 'local');
        }
        if ($request->hasFile('business_permit_back')) {
            $updates['business_permit_back'] = $request->file('business_permit_back')->store('operator_documents', 'local');
        }
        if ($request->hasFile('government_id_front')) {
            $updates['government_id_front'] = $request->file('government_id_front')->store('operator_documents', 'local');
        }
        if ($request->hasFile('government_id_back')) {
            $updates['government_id_back'] = $request->file('government_id_back')->store('operator_documents', 'local');
        }

        $updates['status'] = 'pending';
        $updates['rejection_reason'] = null;

        $profile->update($updates);

        $user->update([
            'account_status' => 'pending',
        ]);

        // Notify admins of resubmitted application
        $adminUsers = User::where('role', 'admin')->get();
        foreach ($adminUsers as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'title' => 'Operator Resubmitted Documents',
                'message' => "Operator {$profile->business_name} has resubmitted their verification documents for review.",
                'type' => 'operator_verification',
                'action_url' => '/admin/operators',
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Your documents have been resubmitted successfully. Your account is now under review.',
            'data' => [
                'role' => $user->role,
                'account_status' => 'pending',
                'operator_profile' => $profile->fresh(),
            ],
        ]);
    }
}
