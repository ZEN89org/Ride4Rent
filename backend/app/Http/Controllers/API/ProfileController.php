<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
        ]);

        $user = $request->user();

        if ($user->profile_photo && Storage::disk('public')->exists($user->profile_photo)) {
            Storage::disk('public')->delete($user->profile_photo);
        }

        $path = $request->file('photo')->store('profile-photos', 'public');

        $user->update([
            'profile_photo' => $path,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profile photo updated successfully.',
            'data' => new UserResource($user),
        ]);
    }

    public function updateOperatorPayment(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = $user->operatorProfile;

        if (!$profile) {
            return response()->json(['success' => false, 'message' => 'Operator profile not found.'], 404);
        }

        $validated = $request->validate([
            'account_name' => ['nullable', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'regex:/^(09|\+639)\d{9}$/'], // Validate valid 11-digit Philippine mobile / account
            'accepted_payment_methods' => ['nullable', 'array'],
            'qr_code' => ['nullable', 'image', 'max:10240'],
        ]);

        if ($request->hasFile('qr_code')) {
            if ($profile->qr_code && Storage::disk('public')->exists($profile->qr_code)) {
                Storage::disk('public')->delete($profile->qr_code);
            }
            $validated['qr_code'] = $request->file('qr_code')->store('payment_qr_codes', 'public');
        }

        $profile->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Rental payment setup updated successfully.',
            'data' => new UserResource($user->fresh(['operatorProfile'])),
        ]);
    }
}
