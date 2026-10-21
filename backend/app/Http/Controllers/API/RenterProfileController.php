<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Message;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\PrivateDocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RenterProfileController extends Controller
{
    public function show(Request $request, int $renter): JsonResponse
    {
        $operator = $request->user();
        abort_unless($operator->role === 'operator', 403);
        $hasBooking = Booking::where('operator_id', $operator->id)->where('renter_id', $renter)->exists();
        $hasConversation = Message::where(function ($query) use ($operator, $renter) {
            $query->where('sender_id', $operator->id)->where('receiver_id', $renter);
        })->orWhere(function ($query) use ($operator, $renter) {
            $query->where('sender_id', $renter)->where('receiver_id', $operator->id);
        })->exists();
        abort_unless($hasBooking || $hasConversation, 404);
        $person = User::whereIn('role', ['customer', 'renter'])->findOrFail($renter);

        // Operators can review the license of renters connected through a booking or conversation.
        return response()->json(['success' => true, 'data' => [
            'id' => $person->id, 'first_name' => $person->first_name, 'middle_name' => $person->middle_name, 'last_name' => $person->last_name, 'suffix' => $person->suffix,
            'email' => $person->email, 'mobile_number' => $person->mobile_number,
            'profile_photo' => Vehicle::resolveStorageUrl($person->profile_photo),
            'is_drivers_license_verified' => (bool) $person->is_drivers_license_verified,
            'license_verification_status' => $person->license_verification_status,
            'can_review_license' => true,
            'date_of_birth' => $hasBooking ? $person->date_of_birth?->toDateString() : null,
            'sex' => $hasBooking ? $person->sex : null,
            'drivers_license_front_url' => PrivateDocumentService::url($person->getRawOriginal('drivers_license_front')),
            'drivers_license_back_url' => PrivateDocumentService::url($person->getRawOriginal('drivers_license_back')),
        ]]);
    }
}
