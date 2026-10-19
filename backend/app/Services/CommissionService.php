<?php

namespace App\Services;

use App\Models\AdminAuditLog;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\OperatorRemittance;
use App\Models\PlatformSetting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class CommissionService
{
    /**
     * Synchronize monthly commission totals for all operators for a given cycle.
     */
    public function syncMonthlyRemittances(?string $month = null): Collection
    {
        $now = now()->setTimezone('Asia/Manila');
        $billingMonth = $month && preg_match('/^\d{4}-\d{2}$/', $month) ? $month : $now->format('Y-m');

        $cycleStart = Carbon::createFromFormat('Y-m-d', $billingMonth.'-01', 'Asia/Manila')->startOfMonth();
        $cycleEnd = $cycleStart->copy()->endOfMonth();
        // 48-hour grace period begins immediately when cycle closes
        $graceDeadline = $cycleEnd->copy()->addHours(48);

        $commissionPercent = (float) PlatformSetting::get('platform_fee_percent', 10.0);

        $operators = User::where('role', 'operator')->get();
        $synced = collect();

        foreach ($operators as $operator) {
            $completedBookings = Booking::where('operator_id', $operator->id)
                ->where('status', 'completed')
                ->where(function ($q) use ($cycleStart, $cycleEnd) {
                    $q->whereBetween('actual_end_time', [$cycleStart, $cycleEnd])
                        ->orWhere(function ($sub) use ($cycleStart, $cycleEnd) {
                            $sub->whereNull('actual_end_time')
                                ->whereBetween('updated_at', [$cycleStart, $cycleEnd]);
                        });
                })
                ->get();

            $grossRevenue = 0.0;
            foreach ($completedBookings as $b) {
                $base = (float) $b->total_price;
                $surcharges = (float) ($b->fuel_charge ?? 0)
                    + (float) ($b->damage_charge ?? 0)
                    + (float) ($b->late_fee ?? 0)
                    + (float) ($b->other_charges ?? 0);
                $grossRevenue += ($base + $surcharges);
            }

            $commissionDue = round($grossRevenue * ($commissionPercent / 100), 2);
            $tripsCount = $completedBookings->count();

            // Only create/update if there were trips or if record already exists
            $existing = OperatorRemittance::where('operator_id', $operator->id)
                ->where('billing_month', $billingMonth)
                ->first();

            if ($tripsCount > 0 || $existing) {
                $status = $existing?->status ?? 'pending';

                // If already verified, do not alter status
                if ($status === 'pending' && $now->greaterThan($graceDeadline) && $commissionDue > 0) {
                    $status = 'overdue';
                }

                $record = OperatorRemittance::updateOrCreate(
                    [
                        'operator_id' => $operator->id,
                        'billing_month' => $billingMonth,
                    ],
                    [
                        'gross_revenue' => $grossRevenue,
                        'commission_rate' => $commissionPercent,
                        'commission_due' => $commissionDue,
                        'completed_trips_count' => $tripsCount,
                        'grace_period_expires_at' => $existing?->grace_period_expires_at ?? $graceDeadline,
                        'status' => $status,
                    ]
                );

                $synced->push($record);
            }
        }

        return $synced;
    }

    /**
     * Automated Check: Freeze operators whose 48-hour grace period expired without remittance.
     */
    public function checkAndProcessGraceExpirations(): int
    {
        $now = now()->setTimezone('Asia/Manila');
        $frozenCount = 0;

        $overdueRemittances = OperatorRemittance::with('operator')
            ->whereIn('status', ['pending', 'overdue'])
            ->where('commission_due', '>', 0)
            ->whereNotNull('grace_period_expires_at')
            ->where('grace_period_expires_at', '<=', $now)
            ->get();

        foreach ($overdueRemittances as $remittance) {
            $operator = $remittance->operator;
            if (! $operator) {
                continue;
            }

            // Mark remittance as frozen
            $remittance->update(['status' => 'frozen']);

            // Freeze the operator account so they cannot accept new bookings
            if ($operator->account_status !== 'suspended') {
                $operator->update(['account_status' => 'suspended']);

                Notification::create([
                    'user_id' => $operator->id,
                    'title' => 'Account Temporarily On Hold',
                    'message' => "Your account has been paused due to an unsettled {$remittance->billing_month} platform commission statement. Submit your remittance to resume receiving bookings.",
                    'type' => 'warning',
                    'action_url' => '/operator-profile',
                ]);

                AdminAuditLog::record(
                    action: 'operator_auto_frozen_commission_overdue',
                    targetType: 'User',
                    targetId: $operator->id,
                    targetName: trim($operator->first_name.' '.$operator->last_name),
                    details: "Automated 48-hour grace period expired for cycle {$remittance->billing_month}. Commission due: ₱".number_format((float) $remittance->commission_due, 2)
                );

                $frozenCount++;
            }
        }

        return $frozenCount;
    }

    /**
     * Admin verifies remittance payment and instantly unfreezes the operator account.
     */
    public function verifyRemittance(OperatorRemittance $remittance, User $admin, ?string $notes = null): void
    {
        $remittance->update([
            'status' => 'verified',
            'verified_at' => now(),
            'verified_by' => $admin->id,
            'admin_notes' => $notes,
        ]);

        $operator = $remittance->operator;
        if ($operator && $operator->account_status === 'suspended') {
            // Restore operator to active status
            $operator->update(['account_status' => 'active']);

            AdminAuditLog::record(
                action: 'operator_unfrozen_remittance_verified',
                targetType: 'User',
                targetId: $operator->id,
                targetName: trim($operator->first_name.' '.$operator->last_name),
                details: "Operator reactivated after verifying ₱".number_format((float) $remittance->commission_due, 2)." remittance for {$remittance->billing_month}."
            );
        }

        if ($operator) {
            Notification::create([
                'user_id' => $operator->id,
                'title' => 'Commission Remittance Verified',
                'message' => "Your platform commission for {$remittance->billing_month} has been confirmed. Your account is active and accepting new bookings!",
                'type' => 'success',
                'action_url' => '/operator-profile',
            ]);
        }
    }

    /**
     * Admin rejects remittance proof.
     */
    public function rejectRemittance(OperatorRemittance $remittance, User $admin, string $reason): void
    {
        $remittance->update([
            'status' => 'pending',
            'admin_notes' => 'Proof rejected: '.$reason,
        ]);

        $operator = $remittance->operator;
        if ($operator) {
            Notification::create([
                'user_id' => $operator->id,
                'title' => 'Remittance Proof Issue',
                'message' => "Your payment proof for {$remittance->billing_month} could not be verified: {$reason}. Please submit a valid transaction receipt.",
                'type' => 'error',
                'action_url' => '/operator-profile',
            ]);
        }

        AdminAuditLog::record(
            action: 'remittance_proof_rejected',
            targetType: 'OperatorRemittance',
            targetId: $remittance->id,
            details: "Rejected remittance proof for operator {$operator?->email}. Reason: {$reason}"
        );
    }
}
