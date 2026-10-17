<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LicenseController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'front_image' => ['nullable', function ($attribute, $value, $fail) {
                if (request()->hasFile($attribute)) {
                    $file = request()->file($attribute);
                    $ext = strtolower($file->getClientOriginalExtension() ?: '');
                    $mime = $file->getMimeType() ?: '';
                    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'heic']) && !str_starts_with($mime, 'image/')) {
                        $fail("The {$attribute} must be a valid image file.");
                    }
                }
            }],
            'back_image' => ['nullable', function ($attribute, $value, $fail) {
                if (request()->hasFile($attribute)) {
                    $file = request()->file($attribute);
                    $ext = strtolower($file->getClientOriginalExtension() ?: '');
                    $mime = $file->getMimeType() ?: '';
                    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'heic']) && !str_starts_with($mime, 'image/')) {
                        $fail("The {$attribute} must be a valid image file.");
                    }
                }
            }],
        ]);

        $user = $request->user();

        if ($user->is_drivers_license_verified && $user->license_verification_status === 'approved') {
            return response()->json([
                'success' => false,
                'message' => "Your driver's license has already been verified and approved.",
            ], 422);
        }

        if ($request->hasFile('front_image')) {
            $frontPath = $request->file('front_image')->store('driver_licenses', 'public');
            $user->drivers_license_front = $frontPath;
        }

        if ($request->hasFile('back_image')) {
            $backPath = $request->file('back_image')->store('driver_licenses', 'public');
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
        \App\Models\Notification::create([
            'user_id' => $user->id,
            'title' => "License Uploaded",
            'message' => "Your driver's license was uploaded for verification.",
            'type' => 'info',
            'action_url' => '/driver-license',
        ]);

        return response()->json([
            'success' => true,
            'message' => "Driver's license uploaded successfully. It will be verified by your host when booking.",
            'data' => new UserResource($user),
        ]);
    }
}
