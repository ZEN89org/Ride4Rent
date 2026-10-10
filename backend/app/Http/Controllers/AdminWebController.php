<?php

namespace App\Http\Controllers;

use App\Models\AdminAuditLog;
use App\Models\Booking;
use App\Models\Notification;
use App\Models\OperatorProfile;
use App\Models\PlatformSetting;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
        // 1. Pending Operator Business Applications
        $operators = User::with('operatorProfile')
            ->where('role', 'operator')
            ->where('account_status', 'pending')
            ->latest()
            ->get();

        // 2. Pending Renter Driver's License Submissions
        $pendingRenters = User::whereIn('role', ['customer', 'renter'])
            ->where(function ($query) {
                $query->where('license_verification_status', 'pending')
                    ->orWhere(function ($q) {
                        $q->whereNull('license_verification_status')
                            ->where('is_drivers_license_verified', false)
                            ->whereNotNull('drivers_license_front');
                    });
            })
            ->latest('license_submitted_at')
            ->latest()
            ->get();

        // 3. User Directory & Status Governance (Excluding Admins from client members list)
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

        // 4. Platform Compliance & Moderation Analytics
        $totalRenters = User::whereIn('role', ['customer', 'renter'])->count();
        $verifiedRenters = User::whereIn('role', ['customer', 'renter'])->where('is_drivers_license_verified', true)->count();
        $unverifiedRenters = User::whereIn('role', ['customer', 'renter'])->where('is_drivers_license_verified', false)->count();

        $totalOperators = User::where('role', 'operator')->count();
        $activeOperators = User::where('role', 'operator')->where('account_status', 'active')->count();
        $pendingOperators = User::where('role', 'operator')->where('account_status', 'pending')->count();

        $activeAccounts = User::where('role', '!=', 'admin')->where('account_status', 'active')->count();
        $suspendedAccounts = User::where('role', '!=', 'admin')->where('account_status', 'suspended')->count();

        $stats = [
            'total_platform_users' => User::where('role', '!=', 'admin')->count(),
            'total_renters' => $totalRenters,
            'verified_renters' => $verifiedRenters,
            'unverified_renters' => $unverifiedRenters,
            'total_operators' => $totalOperators,
            'active_operators' => $activeOperators,
            'pending_operators' => $pendingOperators,
            'active_accounts' => $activeAccounts,
            'suspended_accounts' => $suspendedAccounts,
            'pending_verifications' => $pendingRenters->count() + $operators->count(),
            'kyc_compliance_rate' => $totalRenters > 0 ? round(($verifiedRenters / $totalRenters) * 100) : 0,
        ];

        // 5. Admin-Exclusive Features: Audit Trail
        $auditLogs = AdminAuditLog::latest()->take(35)->get();

        // 6. Admin-Exclusive Features: Reviews & Ratings Moderation Desk
        $reviews = Booking::with(['renter', 'vehicle'])
            ->where(function ($q) {
                $q->whereNotNull('rating')->orWhereNotNull('review');
            })
            ->latest('updated_at')
            ->get();

        // 7. Admin-Exclusive Features: Escalation & Incident Desk
        $disputes = Booking::with(['renter', 'operator', 'vehicle'])
            ->where(function ($q) {
                $q->where('status', 'cancelled')
                  ->orWhere('damage_charge', '>', 0)
                  ->orWhere('fuel_charge', '>', 0)
                  ->orWhere('late_fee', '>', 0)
                  ->orWhereNotNull('admin_memo');
            })
            ->latest()
            ->get();

        // 8. Admin-Exclusive Features: Operational Governance Settings
        $platformSettings = [
            'require_kyc_for_booking' => PlatformSetting::get('require_kyc_for_booking', '1'),
            'maintenance_mode' => PlatformSetting::get('maintenance_mode', '0'),
            'support_phone' => PlatformSetting::get('support_phone', '+63 917 123 4567'),
            'support_email' => PlatformSetting::get('support_email', 'support@ride4rent.ph'),
            'max_advance_days' => PlatformSetting::get('max_advance_days', '30'),
            'platform_fee_percent' => PlatformSetting::get('platform_fee_percent', '10'),
        ];

        return view('admin.dashboard', compact(
            'operators',
            'pendingRenters',
            'allUsers',
            'stats',
            'auditLogs',
            'reviews',
            'disputes',
            'platformSettings'
        ));
    }

    /**
     * Account Status Management (Active / Suspended / Pending)
     */
    public function updateAccountStatus(Request $request, User $user): RedirectResponse
    {
        if ($user->role === 'admin' || $user->id === Auth::id()) {
            return back()->withErrors(['error' => 'Cannot modify the account status of an administrator.']);
        }

        $validated = $request->validate([
            'account_status' => ['required', 'in:active,suspended,pending'],
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
            targetName: trim($user->first_name . ' ' . $user->last_name),
            details: "Changed status from {$previousStatus} to " . strtoupper($newStatus) . ($reason ? " (Reason: {$reason})" : "")
        );

        if ($newStatus === 'suspended') {
            Notification::create([
                'user_id' => $user->id,
                'title' => 'Account Suspended by Admin',
                'message' => $reason 
                    ? "Your account access has been suspended: {$reason}" 
                    : "Your account has been temporarily suspended due to a compliance review.",
                'type' => 'warning',
                'action_url' => '/profile',
            ]);
        } elseif ($newStatus === 'active' && $previousStatus !== 'active') {
            Notification::create([
                'user_id' => $user->id,
                'title' => 'Account Reactivated',
                'message' => 'Your account status has been restored to active. Full platform access is available.',
                'type' => 'success',
                'action_url' => '/profile',
            ]);
        }

        return back()->with('status', "Account status for {$user->first_name} {$user->last_name} ({$user->email}) updated to " . strtoupper($newStatus) . ".");
    }

    /**
     * Quick status toggle (Active <-> Suspended)
     */
    public function toggleUserStatus(User $user): RedirectResponse
    {
        if ($user->role === 'admin' || $user->id === Auth::id()) {
            return back()->withErrors(['error' => 'You cannot suspend an administrative account.']);
        }

        $newStatus = $user->account_status === 'active' ? 'suspended' : 'active';
        $user->update(['account_status' => $newStatus]);

        AdminAuditLog::record(
            action: 'account_status_toggled',
            targetType: 'User',
            targetId: $user->id,
            targetName: trim($user->first_name . ' ' . $user->last_name),
            details: "Account access toggled to {$newStatus}"
        );

        if ($newStatus === 'suspended') {
            Notification::create([
                'user_id' => $user->id,
                'title' => 'Account Suspended',
                'message' => 'Your account access has been suspended by the administrator.',
                'type' => 'warning',
                'action_url' => '/profile',
            ]);
        }

        return back()->with('status', "Account for {$user->email} is now {$newStatus}.");
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
            $name = trim($user->first_name . ' ' . $user->last_name);
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
                targetName: trim($user->first_name . ' ' . $user->last_name),
                details: "Attempted delete had associated records. Account was suspended instead."
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
            details: "Added resolution memo: " . $validated['admin_memo']
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
            'Content-Disposition' => 'attachment; filename="Ride4Rent_Renters_KYC_Audit_' . date('Y-m-d') . '.csv"',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Full Name', 'Email', 'Mobile Number', 'Date of Birth', 'Gender', 'KYC Status', 'Submitted At', 'Account Status']);

            User::whereIn('role', ['customer', 'renter'])->orderBy('id')->chunk(100, function ($renters) use ($handle) {
                foreach ($renters as $r) {
                    fputcsv($handle, [
                        $r->id,
                        trim($r->first_name . ' ' . $r->middle_name . ' ' . $r->last_name . ' ' . $r->suffix),
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
            'Content-Disposition' => 'attachment; filename="Ride4Rent_Operators_Directory_' . date('Y-m-d') . '.csv"',
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
                        trim($op->first_name . ' ' . $op->last_name),
                        $op->email,
                        $op->mobile_number ?: 'N/A',
                        $prof ? ($prof->street_address . ', ' . $prof->barangay . ', ' . $prof->municipality) : 'N/A',
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
            'Content-Disposition' => 'attachment; filename="Ride4Rent_Admin_Audit_Logs_' . date('Y-m-d') . '.csv"',
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
            targetName: trim($user->first_name . ' ' . $user->last_name),
            details: "Accredited operator and approved business permit for " . ($user->operatorProfile?->business_name ?: $user->first_name)
        );

        Notification::create([
            'user_id' => $user->id,
            'title' => 'Operator Account Approved',
            'message' => 'Congratulations! Your operator account and business permits have been verified and activated.',
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
            targetName: trim($user->first_name . ' ' . $user->last_name),
            details: "Rejected operator application: " . $validated['rejection_reason']
        );

        Notification::create([
            'user_id' => $user->id,
            'title' => 'Operator Application Rejected',
            'message' => 'Your operator application was not approved: ' . $validated['rejection_reason'],
            'type' => 'error',
            'action_url' => '/operator-profile',
        ]);

        return back()->with('status', 'Operator rejected successfully.');
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
            targetName: trim($user->first_name . ' ' . $user->last_name),
            details: "Verified and approved renter's driver's license"
        );

        Notification::create([
            'user_id' => $user->id,
            'title' => 'Driver\'s License Approved',
            'message' => 'Your driver\'s license has been verified by the administrator. You now have full booking privileges!',
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
            targetName: trim($user->first_name . ' ' . $user->last_name),
            details: "Rejected driver's license: " . $validated['rejection_reason']
        );

        Notification::create([
            'user_id' => $user->id,
            'title' => 'Driver\'s License Verification Rejected',
            'message' => 'Reason: ' . $validated['rejection_reason'] . '. Please re-upload a clear copy of your license card.',
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
