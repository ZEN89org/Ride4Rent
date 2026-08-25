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

    private function ensureOperator(User $user): void
    {
        abort_unless($user->role === 'operator', 404);
    }
}
