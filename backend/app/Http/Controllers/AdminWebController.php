<?php

namespace App\Http\Controllers;

use App\Models\AdminAuditLog;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\OperatorRemittance;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\CommissionService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminWebController extends Controller
{
    public function loginForm(): View
    {
        return view('admin.login');
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt([...$credentials, 'role' => 'admin'])) {
            return back()
                ->withInput($request->only('email'))
                ->withErrors(['email' => 'Those credentials do not match an administrator account.']);
        }

        $request->session()->regenerate();

        AdminAuditLog::record(
            action: 'admin_login',
            targetType: 'System',
            details: 'Administrator signed in to the console'
        );

        return redirect()->route('admin.dashboard');
    }

    public function dashboard(Request $request): View
    {
        // 1. Commission & Remittance System (10% Platform Fee & Grace Period)
        $commissionService = app(CommissionService::class);
        $now = now()->setTimezone('Asia/Manila');
        $currentMonth = $now->format('Y-m');

        $selectedMonth = $request->input('month', $currentMonth);
        if (! preg_match('/^\d{4}-\d{2}$/', $selectedMonth)) {
            $selectedMonth = $currentMonth;
        }

        // Auto-sync current and previous billing cycles
        $commissionService->syncMonthlyRemittances($currentMonth);
        $prevMonth = $now->copy()->subMonth()->format('Y-m');
        $commissionService->syncMonthlyRemittances($prevMonth);
        if ($selectedMonth !== $currentMonth && $selectedMonth !== $prevMonth) {
            $commissionService->syncMonthlyRemittances($selectedMonth);
        }

        // Process automatic account freeze for expired 48-hour grace periods
        $commissionService->checkAndProcessGraceExpirations();

        // Remittances list for selected billing month
        $remittancesQuery = OperatorRemittance::with(['operator.operatorProfile', 'verifier'])
            ->where('billing_month', $selectedMonth);

        if ($request->filled('remittance_status') && $request->input('remittance_status') !== 'all') {
            $remittancesQuery->where('status', $request->input('remittance_status'));
        }

        $monthlyRemittances = $remittancesQuery->latest()->get();

        // Aggregated Commission Metrics
        $totalGrossAllTime = (float) OperatorRemittance::sum('gross_revenue');
        $totalCommissionAllTime = (float) OperatorRemittance::sum('commission_due');
        $totalCommissionCollected = (float) OperatorRemittance::where('status', 'verified')->sum('commission_due');
        $totalCommissionPending = (float) OperatorRemittance::whereIn('status', ['pending', 'submitted', 'overdue', 'frozen'])->sum('commission_due');

        $currentMonthRemittances = OperatorRemittance::where('billing_month', $currentMonth)->get();
        $currentMonthGross = (float) $currentMonthRemittances->sum('gross_revenue');
        $currentMonthCommission = (float) $currentMonthRemittances->sum('commission_due');
        $currentMonthCollected = (float) $currentMonthRemittances->where('status', 'verified')->sum('commission_due');
        $currentMonthPending = (float) $currentMonthRemittances->whereIn('status', ['pending', 'submitted', 'overdue', 'frozen'])->sum('commission_due');

        $frozenOperatorsCount = User::where('role', 'operator')->where('is_frozen', true)->count();
        $inGraceRemittances = OperatorRemittance::where('status', 'pending')
            ->whereNotNull('grace_period_expires_at')
            ->where('grace_period_expires_at', '>', $now)
            ->count();

        $commissionStats = [
            'total_gross_all_time' => $totalGrossAllTime,
            'total_commission_all_time' => $totalCommissionAllTime,
            'total_commission_collected' => $totalCommissionCollected,
            'total_commission_pending' => $totalCommissionPending,
            'current_month_gross' => $currentMonthGross,
            'current_month_commission' => $currentMonthCommission,
            'current_month_collected' => $currentMonthCollected,
            'current_month_pending' => $currentMonthPending,
            'frozen_operators_count' => $frozenOperatorsCount,
            'in_grace_count' => $inGraceRemittances,
        ];

        // Recent Remittances (for top right BankDash widget)
        $recentRemittances = OperatorRemittance::with('operator.operatorProfile')
            ->whereNotNull('submitted_at')
            ->orWhere('status', 'verified')
            ->latest('updated_at')
            ->take(4)
            ->get();

        if ($recentRemittances->isEmpty()) {
            $recentRemittances = OperatorRemittance::with('operator.operatorProfile')
                ->latest()
                ->take(4)
                ->get();
        }

        // Weekly Activity Dual-Bar Chart (Last 7 Days: Trips vs 10% Commission)
        $weeklyActivity = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = $now->copy()->subDays($i);
            $dayStart = $day->copy()->startOfDay();
            $dayEnd = $day->copy()->endOfDay();

            $dayTrips = Booking::where('status', 'completed')
                ->where(function ($q) use ($dayStart, $dayEnd) {
                    $q->whereBetween('actual_end_time', [$dayStart, $dayEnd])
                        ->orWhere(function ($sub) use ($dayStart, $dayEnd) {
                            $sub->whereNull('actual_end_time')
                                ->whereBetween('updated_at', [$dayStart, $dayEnd]);
                        });
                })->get();

            $dayTripsCount = $dayTrips->count();
            $dayCommission = 0.0;
            foreach ($dayTrips as $b) {
                $gross = (float) $b->total_price + (float) ($b->fuel_charge ?? 0) + (float) ($b->damage_charge ?? 0) + (float) ($b->late_fee ?? 0) + (float) ($b->other_charges ?? 0);
                $dayCommission += ($gross * 0.10);
            }

            $weeklyActivity[] = [
                'day_label' => $day->format('D'),
                'date' => $day->format('M d'),
                'trips' => $dayTripsCount,
                'commission' => round($dayCommission, 2),
            ];
        }

        // Fleet Distribution (for BankDash Donut/Pie chart)
        $vehicleTypes = DB::table('vehicles')
            ->leftJoin('vehicle_types', 'vehicles.vehicle_type_id', '=', 'vehicle_types.id')
            ->select(DB::raw("COALESCE(vehicle_types.name, 'Other') as type_name"), DB::raw('count(vehicles.id) as count'))
            ->groupBy('vehicle_types.name')
            ->get();
        $totalFleet = Vehicle::count();
        $fleetDistribution = [];
        $palette = ['#343C6A', '#FC7900', '#1814F3', '#FA00FF', '#16DBCC', '#FE5C73'];
        $colorIndex = 0;
        foreach ($vehicleTypes as $vt) {
            $pct = $totalFleet > 0 ? round(($vt->count / $totalFleet) * 100) : 0;
            $fleetDistribution[] = [
                'name' => ucfirst($vt->type_name ?: 'Other'),
                'count' => $vt->count,
                'percent' => $pct,
                'color' => $palette[$colorIndex % count($palette)],
            ];
            $colorIndex++;
        }
        if (empty($fleetDistribution)) {
            $fleetDistribution = [
                ['name' => 'Sedan', 'count' => 12, 'percent' => 35, 'color' => '#343C6A'],
                ['name' => 'SUV / Van', 'count' => 10, 'percent' => 30, 'color' => '#FC7900'],
                ['name' => 'Motorcycle', 'count' => 7, 'percent' => 20, 'color' => '#FA00FF'],
                ['name' => 'Hatchback', 'count' => 5, 'percent' => 15, 'color' => '#1814F3'],
            ];
        }

        // Monthly Revenue Growth History (for BankDash Area Spline chart)
        $revenueHistory = [];
        for ($m = 6; $m >= 0; $m--) {
            $histDate = $now->copy()->subMonths($m);
            $histStart = $histDate->copy()->startOfMonth();
            $histEnd = $histDate->copy()->endOfMonth();

            $monthBookings = Booking::where('status', 'completed')
                ->where(function ($q) use ($histStart, $histEnd) {
                    $q->whereBetween('actual_end_time', [$histStart, $histEnd])
                        ->orWhere(function ($sub) use ($histStart, $histEnd) {
                            $sub->whereNull('actual_end_time')
                                ->whereBetween('updated_at', [$histStart, $histEnd]);
                        });
                })->get();

            $mGross = 0.0;
            foreach ($monthBookings as $b) {
                $mGross += (float) $b->total_price + (float) ($b->fuel_charge ?? 0) + (float) ($b->damage_charge ?? 0) + (float) ($b->late_fee ?? 0) + (float) ($b->other_charges ?? 0);
            }
            $mCommission = round($mGross * 0.10, 2);

            $revenueHistory[] = [
                'month_label' => $histDate->format('M'),
                'year' => $histDate->format('Y'),
                'gross' => $mGross,
                'commission' => $mCommission,
            ];
        }

        // Quick Action Operators (with active remittances)
        $quickActionOperators = User::with('operatorProfile')
            ->where('role', 'operator')
            ->take(6)
            ->get();

        // Available billing months for dropdown
        $availableMonths = OperatorRemittance::select('billing_month')
            ->distinct()
            ->orderByDesc('billing_month')
            ->pluck('billing_month')
            ->toArray();
        if (! in_array($currentMonth, $availableMonths)) {
            array_unshift($availableMonths, $currentMonth);
        }

        // 2. Pending Operator Accreditation Applications (Admin Responsibility Only)
        $operators = User::with('operatorProfile')
            ->where('role', 'operator')
            ->where('account_status', 'pending')
            ->latest()
            ->get();

        // 3. User Directory & Status Governance (Excluding Admins)
        $usersQuery = User::with('operatorProfile')->where('role', '!=', 'admin');

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $usersQuery->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('mobile_number', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role') && $request->input('role') !== 'all') {
            $role = $request->input('role');
            if ($role === 'renter' || $role === 'customer') {
                $usersQuery->whereIn('role', ['customer', 'renter']);
            } elseif ($role === 'operator') {
                $usersQuery->where('role', 'operator');
            }
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $usersQuery->where('account_status', $request->input('status'));
        }

        $allUsers = $usersQuery->latest()->get();

        // 4. Platform Statistics
        $totalRenters = User::whereIn('role', ['customer', 'renter'])->count();
        $totalOperators = User::where('role', 'operator')->count();
        $activeOperators = User::where('role', 'operator')->where('account_status', 'active')->where('is_frozen', false)->count();
        $frozenOperators = User::where('role', 'operator')->where('is_frozen', true)->count();
        $pendingOperators = User::where('role', 'operator')->where('account_status', 'pending')->count();
        $activeAccounts = User::where('role', '!=', 'admin')->where('account_status', 'active')->count();

        $stats = [
            'total_platform_users' => User::where('role', '!=', 'admin')->count(),
            'total_renters' => $totalRenters,
            'total_operators' => $totalOperators,
            'active_operators' => $activeOperators,
            'frozen_operators' => $frozenOperators,
            'pending_operators' => $pendingOperators,
            'active_accounts' => $activeAccounts,
            'pending_verifications' => $operators->count(),
        ];

        // 5. Admin Audit Trail
        $auditLogs = AdminAuditLog::latest()->take(35)->get();

        // 6. Reviews & Ratings Moderation Desk
        $reviews = Booking::with(['renter', 'vehicle'])
            ->where(function ($q) {
                $q->whereNotNull('rating')->orWhereNotNull('review');
            })
            ->latest('updated_at')
            ->get();

        // 7. Escalation & Dispute Incident Desk
        $disputes = Booking::with(['renter', 'operator', 'vehicle'])
            ->where(function ($q) {
                $q->where('status', 'cancelled')
                    ->orWhere('status', 'no_show')
                    ->orWhere('damage_charge', '>', 0)
                    ->orWhere('fuel_charge', '>', 0)
                    ->orWhere('late_fee', '>', 0)
                    ->orWhereNotNull('admin_memo');
            })
            ->latest()
            ->get();

        // 8. Platform Operational Settings
        $platformSettings = [
            'require_kyc_for_booking' => PlatformSetting::get('require_kyc_for_booking', '1'),
            'maintenance_mode' => PlatformSetting::get('maintenance_mode', '0'),
            'support_phone' => PlatformSetting::get('support_phone', '+63 917 123 4567'),
            'support_email' => PlatformSetting::get('support_email', 'support@ride4rent.ph'),
            'max_advance_days' => PlatformSetting::get('max_advance_days', '30'),
            'platform_fee_percent' => PlatformSetting::get('platform_fee_percent', '10'),
            'commission_gcash_name' => PlatformSetting::get('commission_gcash_name', ''),
            'commission_gcash_number' => PlatformSetting::get('commission_gcash_number', ''),
        ];

        return view('admin.dashboard', compact(
            'operators',
            'allUsers',
            'stats',
            'commissionStats',
            'monthlyRemittances',
            'selectedMonth',
            'availableMonths',
            'recentRemittances',
            'weeklyActivity',
            'fleetDistribution',
            'revenueHistory',
            'quickActionOperators',
            'auditLogs',
            'reviews',
            'disputes',
            'platformSettings'
        ));
    }

    /**
     * Account Accreditation Status Management (Active / Pending / Rejected)
     */
    public function updateAccountStatus(Request $request, User $user): RedirectResponse
    {
        if ($user->role === 'admin' || $user->id === Auth::id()) {
            return back()->withErrors(['error' => 'Cannot modify the account status of an administrator.']);
        }

        $validated = $request->validate([
            'account_status' => ['required', 'in:active,pending,rejected'],
            'status_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $previousStatus = $user->account_status;
        $newStatus = $validated['account_status'];

        $user->update([
            'account_status' => $newStatus,
        ]);

        $reason = $validated['status_reason'] ?? null;

        AdminAuditLog::record(
            action: 'account_status_changed',
            targetType: 'User',
            targetId: $user->id,
            targetName: trim($user->first_name.' '.$user->last_name),
            details: "Changed status from {$previousStatus} to ".strtoupper($newStatus).($reason ? " (Reason: {$reason})" : '')
        );

        if ($newStatus === 'rejected') {
            Notification::create([
                'user_id' => $user->id,
                'title' => 'Account Status Update',
                'message' => 'Your account accreditation was not approved.',
                'type' => 'error',
                'action_url' => '/profile',
            ]);
        } elseif ($newStatus === 'active' && $previousStatus !== 'active') {
            Notification::create([
                'user_id' => $user->id,
                'title' => 'Account Activated',
                'message' => 'Your account has been activated.',
                'type' => 'success',
                'action_url' => '/profile',
            ]);
        }

        return back()->with('status', "Account status for {$user->first_name} {$user->last_name} ({$user->email}) updated to ".strtoupper($newStatus).'.');
    }

    /**
     * Toggle Operator Freeze Status (Only applies to operators)
     */
    public function toggleUserStatus(User $user): RedirectResponse
    {
        if ($user->role === 'admin' || $user->id === Auth::id()) {
            return back()->withErrors(['error' => 'You cannot freeze an administrative account.']);
        }

        if ($user->role === 'operator') {
            return $this->toggleOperatorFreeze($user);
        }

        return back()->with('status', "User {$user->email} is active. Freeze actions apply exclusively to vehicle hosts (operators).");
    }

    /**
     * Safe Account Deletion
     */
    public function deleteUser(User $user): RedirectResponse
    {
        if ($user->role === 'admin' || $user->id === Auth::id()) {
            return back()->withErrors(['error' => 'You cannot delete an administrative account.']);
        }

        try {
            $email = $user->email;
            $name = trim($user->first_name.' '.$user->last_name);
            $user->delete();

            AdminAuditLog::record(
                action: 'user_deleted',
                targetType: 'User',
                targetName: $name,
                details: "Deleted user account {$email}"
            );

            return back()->with('status', "User account {$email} has been permanently deleted.");
        } catch (\Throwable $e) {
            $user->update(['account_status' => 'suspended']);

            AdminAuditLog::record(
                action: 'user_suspended_on_delete',
                targetType: 'User',
                targetId: $user->id,
                targetName: trim($user->first_name.' '.$user->last_name),
                details: 'Attempted delete had associated records. Account was suspended instead.'
            );

            return back()->with('status', "User {$user->email} has active records on the platform. The account was suspended instead.");
        }
    }

    /**
     * Broadcast System Announcement / Notice to Platform Users
     */
    public function broadcastAnnouncement(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'target_audience' => ['required', 'in:all,customer,operator'],
            'title' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'max:1000'],
            'type' => ['required', 'in:info,warning,success'],
        ]);

        $query = User::where('role', '!=', 'admin');

        if ($validated['target_audience'] === 'customer') {
            $query->whereIn('role', ['customer', 'renter']);
        } elseif ($validated['target_audience'] === 'operator') {
            $query->where('role', 'operator');
        }

        $recipients = $query->get(['id']);

        if ($recipients->isEmpty()) {
            return back()->withErrors(['error' => 'No recipients found for the selected target audience.']);
        }

        $records = $recipients->map(fn ($user) => [
            'user_id' => $user->id,
            'title' => $validated['title'],
            'message' => $validated['message'],
            'type' => $validated['type'],
            'action_url' => '/notifications',
            'created_at' => now(),
            'updated_at' => now(),
        ])->toArray();

        Notification::insert($records);

        AdminAuditLog::record(
            action: 'announcement_broadcast',
            targetType: 'System',
            targetName: "Audience: {$validated['target_audience']}",
            details: "Broadcasted '{$validated['title']}' to {$recipients->count()} user(s)"
        );

        $targetLabel = match ($validated['target_audience']) {
            'customer' => 'Renters',
            'operator' => 'Vehicle Hosts (Operators)',
            default => 'All Platform Members',
        };

        return back()->with('status', "Announcement broadcasted successfully to {$recipients->count()} {$targetLabel}.");
    }

    /**
     * Update Global Operational Settings
     */
    public function updateSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'require_kyc_for_booking' => ['required', 'in:0,1'],
            'maintenance_mode' => ['required', 'in:0,1'],
            'support_phone' => ['required', 'string', 'max:50'],
            'support_email' => ['required', 'email', 'max:100'],
            'max_advance_days' => ['required', 'integer', 'min:1', 'max:365'],
            'platform_fee_percent' => ['required', 'numeric', 'min:0', 'max:50'],
            'commission_gcash_name' => ['nullable', 'string', 'max:100'],
            'commission_gcash_number' => ['nullable', 'regex:/^09\d{9}$/'],
        ]);

        foreach ($validated as $key => $value) {
            PlatformSetting::set($key, (string) $value, 'general');
        }

        AdminAuditLog::record(
            action: 'settings_updated',
            targetType: 'System',
            targetName: 'Platform Governance Settings',
            details: 'Updated operational policies (KYC enforcement, maintenance, helpline, fee structure)'
        );

        return back()->with('status', 'Platform operational settings updated successfully.');
    }

    /**
     * Review Moderation: Toggle Review Visibility (Hide / Show)
     */
    public function toggleReviewVisibility(Request $request, Booking $booking): RedirectResponse
    {
        $validated = $request->validate([
            'review_moderation_note' => ['nullable', 'string', 'max:255'],
        ]);

        $booking->is_review_hidden = ! $booking->is_review_hidden;
        if ($request->filled('review_moderation_note')) {
            $booking->review_moderation_note = $validated['review_moderation_note'];
        }
        $booking->save();
        $visible = Booking::where('vehicle_id', $booking->vehicle_id)->whereNotNull('rating')->where('is_review_hidden', false);
        $booking->vehicle?->update(['rating' => round((float) (clone $visible)->avg('rating'), 2), 'rating_count' => $visible->count()]);

        AdminAuditLog::record(
            action: 'review_moderated',
            targetType: 'Booking',
            targetId: $booking->id,
            targetName: "Booking #{$booking->id} Review",
            details: $booking->is_review_hidden ? 'Review marked hidden / redacted for community guidelines' : 'Review visibility restored'
        );

        $state = $booking->is_review_hidden ? 'hidden' : 'visible';

        return back()->with('status', "Booking #{$booking->id} review is now {$state}.");
    }

    /**
     * Trip Incident & Dispute Resolution Memo
     */
    public function saveDisputeMemo(Request $request, Booking $booking): RedirectResponse
    {
        $validated = $request->validate([
            'admin_memo' => ['required', 'string', 'max:1000'],
        ]);

        $booking->admin_memo = $validated['admin_memo'];
        $booking->save();

        AdminAuditLog::record(
            action: 'dispute_memo_added',
            targetType: 'Booking',
            targetId: $booking->id,
            targetName: "Booking #{$booking->id}",
            details: 'Added resolution memo: '.$validated['admin_memo']
        );

        return back()->with('status', "Official resolution memo logged for Booking #{$booking->id}.");
    }

    /**
     * Regulatory & Compliance CSV Exports
     */
    public function exportRentersKYC(): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="Ride4Rent_Renters_KYC_Audit_'.date('Y-m-d').'.csv"',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Full Name', 'Email', 'Mobile Number', 'Date of Birth', 'Gender', 'KYC Status', 'Submitted At', 'Account Status']);

            User::whereIn('role', ['customer', 'renter'])->orderBy('id')->chunk(100, function ($renters) use ($handle) {
                foreach ($renters as $r) {
                    fputcsv($handle, [
                        $r->id,
                        trim($r->first_name.' '.$r->middle_name.' '.$r->last_name.' '.$r->suffix),
                        $r->email,
                        $r->mobile_number ?: 'N/A',
                        $r->date_of_birth ? $r->date_of_birth->format('Y-m-d') : 'N/A',
                        $r->sex ? ucfirst($r->sex) : 'N/A',
                        $r->is_drivers_license_verified ? 'Verified' : 'Unverified',
                        $r->license_submitted_at ?: 'N/A',
                        ucfirst($r->account_status),
                    ]);
                }
            });

            fclose($handle);
        }, 200, $headers);
    }

    public function exportOperators(): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="Ride4Rent_Operators_Directory_'.date('Y-m-d').'.csv"',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Business Name', 'Representative Name', 'Email', 'Mobile', 'Municipal Address', 'Accreditation Status', 'Registration Date']);

            User::with('operatorProfile')->where('role', 'operator')->orderBy('id')->chunk(100, function ($ops) use ($handle) {
                foreach ($ops as $op) {
                    $prof = $op->operatorProfile;
                    fputcsv($handle, [
                        $op->id,
                        $prof?->business_name ?: 'N/A',
                        trim($op->first_name.' '.$op->last_name),
                        $op->email,
                        $op->mobile_number ?: 'N/A',
                        $prof ? ($prof->street_address.', '.$prof->barangay.', '.$prof->municipality) : 'N/A',
                        ucfirst($op->account_status),
                        $op->created_at?->format('Y-m-d H:i:s'),
                    ]);
                }
            });

            fclose($handle);
        }, 200, $headers);
    }

    public function exportAuditLogs(): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="Ride4Rent_Admin_Audit_Logs_'.date('Y-m-d').'.csv"',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Log ID', 'Timestamp', 'Admin Name', 'Action', 'Target Type', 'Target Name', 'Details / Note', 'IP Address']);

            AdminAuditLog::latest()->chunk(100, function ($logs) use ($handle) {
                foreach ($logs as $l) {
                    fputcsv($handle, [
                        $l->id,
                        $l->created_at?->format('Y-m-d H:i:s'),
                        $l->admin_name ?: 'System Admin',
                        $l->action,
                        $l->target_type ?: 'General',
                        $l->target_name ?: 'N/A',
                        $l->details ?: 'N/A',
                        $l->ip_address ?: 'N/A',
                    ]);
                }
            });

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Admin Moderation (Approve Operator Account & Business Permit)
     */
    public function approve(User $user): RedirectResponse
    {
        abort_unless($user->role === 'operator', 404);

        $user->update(['account_status' => 'active']);
        $user->operatorProfile?->update([
            'rejection_reason' => null,
            'reviewed_at' => now(),
        ]);

        AdminAuditLog::record(
            action: 'operator_approved',
            targetType: 'User',
            targetId: $user->id,
            targetName: trim($user->first_name.' '.$user->last_name),
            details: 'Accredited operator and approved business permit for '.($user->operatorProfile?->business_name ?: $user->first_name)
        );

        Notification::create([
            'user_id' => $user->id,
            'title' => 'Operator Account Approved',
            'message' => 'Your operator account has been verified and activated.',
            'type' => 'success',
            'action_url' => '/operator-profile',
        ]);

        return back()->with('status', 'Operator approved successfully.');
    }

    /**
     * Admin Moderation (Reject Operator Application)
     */
    public function reject(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->role === 'operator', 404);

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ]);

        $user->update(['account_status' => 'rejected']);
        $user->operatorProfile?->update([
            'rejection_reason' => $validated['rejection_reason'],
            'reviewed_at' => now(),
        ]);

        AdminAuditLog::record(
            action: 'operator_rejected',
            targetType: 'User',
            targetId: $user->id,
            targetName: trim($user->first_name.' '.$user->last_name),
            details: 'Rejected operator application: '.$validated['rejection_reason']
        );

        Notification::create([
            'user_id' => $user->id,
            'title' => 'Operator Application Rejected',
            'message' => 'Your operator application was not approved.',
            'type' => 'error',
            'action_url' => '/operator-profile',
        ]);

        return back()->with('status', 'Operator rejected successfully.');
    }

    /**
     * Admin Remittance Verification (Instantly Unfreezes Operator)
     */
    public function verifyRemittance(Request $request, OperatorRemittance $remittance): RedirectResponse
    {
        $notes = $request->input('admin_notes');
        $service = app(CommissionService::class);
        $service->verifyRemittance($remittance, Auth::user(), $notes);

        return back()->with('status', "Remittance for {$remittance->operator?->first_name} {$remittance->operator?->last_name} ({$remittance->billing_month}) verified. Operator account is active!");
    }

    /**
     * Admin Remittance Rejection
     */
    public function rejectRemittance(Request $request, OperatorRemittance $remittance): RedirectResponse
    {
        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:500'],
        ]);

        $service = app(CommissionService::class);
        $service->rejectRemittance($remittance, Auth::user(), $validated['rejection_reason']);

        return back()->with('status', "Remittance proof rejected for {$remittance->billing_month}. Operator has been notified.");
    }

    /**
     * Trigger Manual Sync of Monthly Remittances & Grace Expirations
     */
    public function syncRemittances(Request $request): RedirectResponse
    {
        $month = $request->input('month');
        $service = app(CommissionService::class);
        $synced = $service->syncMonthlyRemittances($month);
        $frozen = $service->checkAndProcessGraceExpirations();

        return back()->with('status', "Synchronized {$synced->count()} operator commission statement(s). Processed {$frozen} grace period expiration(s).");
    }

    /**
     * Toggle Operator Freeze (Manual Freeze / Unfreeze by Admin)
     */
    public function toggleOperatorFreeze(User $user): RedirectResponse
    {
        abort_unless($user->role === 'operator', 404);

        if ($user->is_frozen) {
            $user->unfreeze();
            $actionText = 'unfrozen (listings restored for new bookings)';
            $notifTitle = 'Operator Account Unfrozen';
            $notifMessage = 'Your account has been unfrozen by administration. Your vehicles are now open to receive new bookings!';
            $notifType = 'success';
        } else {
            $user->freeze('Manually frozen by platform administrator');
            $actionText = 'frozen (app access kept, but blocked from receiving new bookings)';
            $notifTitle = 'Bookings Temporarily Frozen';
            $notifMessage = 'Your vehicle hosting account has been temporarily frozen from receiving new bookings by administration.';
            $notifType = 'warning';
        }

        AdminAuditLog::record(
            action: $user->is_frozen ? 'operator_manually_frozen' : 'operator_manually_unfrozen',
            targetType: 'User',
            targetId: $user->id,
            targetName: trim($user->first_name.' '.$user->last_name),
            details: "Admin manually set operator freeze status: {$actionText}"
        );

        Notification::create([
            'user_id' => $user->id,
            'title' => $notifTitle,
            'message' => $notifMessage,
            'type' => $notifType,
            'action_url' => '/operator-profile',
        ]);

        return back()->with('status', "Operator {$user->first_name} {$user->last_name} is now {$actionText}.");
    }

    /**
     * Admin Moderation (Approve Driver License)
     */
    public function approveLicense(User $user): RedirectResponse
    {
        abort_unless(in_array($user->role, ['customer', 'renter']), 404);

        $user->update([
            'is_drivers_license_verified' => true,
            'license_verification_status' => 'approved',
            'license_rejection_reason' => null,
        ]);

        AdminAuditLog::record(
            action: 'license_approved',
            targetType: 'User',
            targetId: $user->id,
            targetName: trim($user->first_name.' '.$user->last_name),
            details: "Verified and approved renter's driver's license"
        );

        Notification::create([
            'user_id' => $user->id,
            'title' => 'Driver\'s License Approved',
            'message' => 'Your driver\'s license has been verified.',
            'type' => 'success',
            'action_url' => '/profile',
        ]);

        return back()->with('status', 'Renter driver\'s license approved successfully.');
    }

    /**
     * Admin Moderation (Reject Driver License)
     */
    public function rejectLicense(Request $request, User $user): RedirectResponse
    {
        abort_unless(in_array($user->role, ['customer', 'renter']), 404);

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ]);

        $user->update([
            'is_drivers_license_verified' => false,
            'license_verification_status' => 'rejected',
            'license_rejection_reason' => $validated['rejection_reason'],
        ]);

        AdminAuditLog::record(
            action: 'license_rejected',
            targetType: 'User',
            targetId: $user->id,
            targetName: trim($user->first_name.' '.$user->last_name),
            details: "Rejected driver's license: ".$validated['rejection_reason']
        );

        Notification::create([
            'user_id' => $user->id,
            'title' => 'Driver\'s License Rejected',
            'message' => 'Your driver\'s license was not approved. Please upload a clear photo.',
            'type' => 'error',
            'action_url' => '/driver-license',
        ]);

        return back()->with('status', 'Renter driver\'s license rejected.');
    }

    public function logout(Request $request): RedirectResponse
    {
        AdminAuditLog::record(
            action: 'admin_logout',
            targetType: 'System',
            details: 'Administrator signed out'
        );

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}
