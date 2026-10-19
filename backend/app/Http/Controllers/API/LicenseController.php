<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Notification;
use App\Services\PrivateDocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LicenseController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'front_image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
            'back_image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ]);

        $user = $request->user();

        // Replacing a verified license is allowed; the new documents must be
        // reviewed again before they can be treated as verified.
        if ($request->hasFile('front_image')) {
            $frontPath = PrivateDocumentService::storeLicense($request->file('front_image'));
            $user->drivers_license_front = $frontPath;
        }

        if ($request->hasFile('back_image')) {
            $backPath = PrivateDocumentService::storeLicense($request->file('back_image'));
            $user->drivers_license_back = $backPath;
        }

        if (empty($user->drivers_license_front) || empty($user->drivers_license_back)) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide both Front and Back photos of your driver\'s license.',
            ], 422);
        }

        $user->is_drivers_license_verified = false;
        $user->license_verification_status = 'pending';
        $user->license_rejection_reason = null;
        $user->license_submitted_at = now();
        $user->save();

        // Create in-app notification for the renter
        Notification::create([
            'user_id' => $user->id,
            'title' => 'License Uploaded',
            'message' => "Your driver's license was uploaded for verification.",
            'type' => 'info',
            'action_url' => '/driver-license',
        ]);

        return response()->json([
            'success' => true,
            'message' => "Driver's license uploaded successfully. Your operator will review your documents.",
            'data' => new UserResource($user),
        ]);
    }
}
