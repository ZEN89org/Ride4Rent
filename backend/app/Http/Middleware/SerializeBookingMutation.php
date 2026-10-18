<?php

namespace App\Http\Middleware;

use App\Models\Booking;
use App\Models\User;
use App\Models\Vehicle;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class SerializeBookingMutation
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('GET')) {
            return $next($request);
        }

        DB::beginTransaction();
        try {
            $bookingId = $request->route('id');
            $renterId = $bookingId ? Booking::whereKey($bookingId)->value('renter_id') : $request->user()?->id;
            if ($renterId) {
                User::whereKey($renterId)->lockForUpdate()->first();
            }
            $vehicleId = $bookingId
                ? Booking::whereKey($bookingId)->value('vehicle_id')
                : $request->input('vehicle_id');

            // All actions for one listing acquire the same lock before reading availability.
            if ($vehicleId) {
                Vehicle::whereKey($vehicleId)->lockForUpdate()->first();
            }
            if ($bookingId) {
                Booking::whereKey($bookingId)->lockForUpdate()->first();
            }

            $response = $next($request);
            // Controllers occasionally return errors after writing. Roll those writes back.
            if ($response->getStatusCode() >= 400) {
                DB::rollBack();
            } else {
                DB::commit();
            }

            return $response;
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
