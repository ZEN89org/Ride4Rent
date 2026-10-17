<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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

        if ($requestedMonth && preg_match('/^\d{4}-\d{2}$/', $requestedMonth)) {
            $cycleStart = Carbon::createFromFormat('Y-m-d', $requestedMonth . '-01', 'Asia/Manila')->startOfMonth();
            $cycleEnd = $cycleStart->copy()->endOfMonth();
        } else {
            $cycleStart = $now->copy()->startOfMonth();
            $cycleEnd = $now->copy()->endOfMonth();
            $requestedMonth = $now->format('Y-m');
        }

        $isCurrentMonth = ($requestedMonth === $now->format('Y-m'));
        $daysRemaining = $isCurrentMonth ? max(0, (int) $now->diffInDays($cycleEnd, false)) : 0;

        $commissionPercent = (float) env('PLATFORM_COMMISSION_PERCENT', 10.0);

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
            $surcharges = (float)($b->fuel_charge ?? 0)
                + (float)($b->damage_charge ?? 0)
                + (float)($b->late_fee ?? 0)
                + (float)($b->other_charges ?? 0);

            $bookingGross = $basePrice + $surcharges;
            $bookingCommission = round($bookingGross * ($commissionPercent / 100), 2);
            $bookingNet = round($bookingGross - $bookingCommission, 2);

            $grossRevenue += $bookingGross;
            $totalSurcharges += $surcharges;

            $renterName = trim(($b->renter?->first_name ?? '') . ' ' . ($b->renter?->last_name ?? '')) ?: 'Customer';
            $vehicleName = $b->vehicle?->name ?? 'Vehicle';

            $completedDate = $b->actual_end_time
                ? $b->actual_end_time->setTimezone('Asia/Manila')->format('M d, Y h:i A')
                : $b->updated_at->setTimezone('Asia/Manila')->format('M d, Y h:i A');

            $bookingsList[] = [
                'id' => $b->id,
                'booking_code' => '#' . $b->id,
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

        if (!$hasCurrentInMonths) {
            array_unshift($availableMonths, [
                'month' => $now->format('Y-m'),
                'label' => $now->format('F Y'),
                'count' => 0,
            ]);
        }

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
                'net_earnings' => $totalNetEarnings,
                'completed_bookings_count' => count($bookingsList),
                'active_bookings_count' => $activeCount,
                'available_months' => $availableMonths,
                'bookings' => $bookingsList,
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

        if (!$profile) {
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
            $updates['business_permit_front'] = $request->file('business_permit_front')->store('operator_documents', 'public');
        }
        if ($request->hasFile('business_permit_back')) {
            $updates['business_permit_back'] = $request->file('business_permit_back')->store('operator_documents', 'public');
        }
        if ($request->hasFile('government_id_front')) {
            $updates['government_id_front'] = $request->file('government_id_front')->store('operator_documents', 'public');
        }
        if ($request->hasFile('government_id_back')) {
            $updates['government_id_back'] = $request->file('government_id_back')->store('operator_documents', 'public');
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
