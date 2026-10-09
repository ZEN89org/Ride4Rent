<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function test(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Administrator access granted.',
        ]);
    }

    public function pendingOperators(): JsonResponse
    {
        $operators = User::with('operatorProfile')
            ->where('role', 'operator')
            ->where('account_status', 'pending')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $operators->map(fn (User $operator) => [
                'user' => new UserResource($operator),
                'operator_profile' => $operator->operatorProfile,
            ])->values(),
        ]);
    }

    public function approveOperator(User $user): JsonResponse
    {
        $this->ensureOperator($user);

        $user->update([
            'account_status' => 'active',
        ]);

        $user->operatorProfile?->update([
            'rejection_reason' => null,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Operator approved successfully.',
            'data' => [
                'user' => new UserResource($user->fresh()),
                'operator_profile' => $user->operatorProfile()->first(),
            ],
        ]);
    }

    public function rejectOperator(Request $request, User $user): JsonResponse
    {
        $this->ensureOperator($user);

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ]);

        $user->update([
            'account_status' => 'rejected',
        ]);

        $user->operatorProfile?->update([
            'rejection_reason' => $validated['rejection_reason'],
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Operator rejected successfully.',
            'data' => [
                'user' => new UserResource($user->fresh()),
                'operator_profile' => $user->operatorProfile()->first(),
            ],
        ]);
    }

    public function pendingLicenses(): JsonResponse
    {
        $renters = User::whereIn('role', ['customer', 'renter'])
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

        return response()->json([
            'success' => true,
            'data' => $renters->map(fn (User $renter) => new UserResource($renter))->values(),
        ]);
    }

    public function approveLicense(User $user): JsonResponse
    {
        abort_unless(in_array($user->role, ['customer', 'renter']), 404);

        $user->update([
            'is_drivers_license_verified' => true,
            'license_verification_status' => 'approved',
            'license_rejection_reason' => null,
        ]);

        \App\Models\Notification::create([
            'user_id' => $user->id,
            'title' => "Driver's License Approved 🎉",
            'message' => 'Your driver\'s license has been verified by the Admin. You now have full booking privileges!',
            'type' => 'success',
            'action_url' => '/profile',
        ]);

        return response()->json([
            'success' => true,
            'message' => "Driver's license approved successfully.",
            'data' => new UserResource($user->fresh()),
        ]);
    }

    public function rejectLicense(Request $request, User $user): JsonResponse
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

        \App\Models\Notification::create([
            'user_id' => $user->id,
            'title' => "Driver's License Verification Rejected",
            'message' => 'Your driver\'s license verification was not approved: "' . $validated['rejection_reason'] . '". Please re-upload a clear and matching license photo.',
            'type' => 'error',
            'action_url' => '/driver-license',
        ]);

        return response()->json([
            'success' => true,
            'message' => "Driver's license rejected.",
            'data' => new UserResource($user->fresh()),
        ]);
    }

    private function ensureOperator(User $user): void
    {
        abort_unless($user->role === 'operator', 404);
    }
}
