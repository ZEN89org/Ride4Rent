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
            'front_image' => ['nullable', 'image', 'max:10240'],
            'back_image' => ['nullable', 'image', 'max:10240'],
        ]);

        $user = $request->user();

        if ($request->hasFile('front_image')) {
            $frontPath = $request->file('front_image')->store('driver_licenses', 'public');
            $user->drivers_license_front = $frontPath;
        }

        if ($request->hasFile('back_image')) {
            $backPath = $request->file('back_image')->store('driver_licenses', 'public');
            $user->drivers_license_back = $backPath;
        }

        if ($user->drivers_license_front && $user->drivers_license_back) {
            $user->is_drivers_license_verified = true;
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => "Driver's license submitted successfully.",
            'data' => new UserResource($user),
        ]);
    }
}
