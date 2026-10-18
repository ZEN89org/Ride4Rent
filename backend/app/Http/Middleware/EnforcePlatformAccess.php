<?php

namespace App\Http\Middleware;

use App\Models\PlatformSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforcePlatformAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user('sanctum');
        if ($user && $user->account_status === 'suspended') {
            return response()->json(['message' => 'Your account is suspended.'], 403);
        }

        if (! $request->is('api/v1/platform-settings') && $user?->role !== 'admin' && PlatformSetting::get('maintenance_mode', '0') === '1') {
            return response()->json(['message' => 'Ride4Rent is temporarily undergoing maintenance.'], 503);
        }

        return $next($request);
    }
}
