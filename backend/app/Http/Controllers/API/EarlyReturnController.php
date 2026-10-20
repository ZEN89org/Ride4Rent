<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Notification;
use App\Services\DevicePushService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EarlyReturnController extends Controller
{
    public function request(Request $request, int $id)
    {
        $booking = Booking::findOrFail($id);
        abort_unless($request->user()->id === $booking->renter_id, 403);
        $this->active($booking);
        abort_if(in_array($booking->early_return_status, ['pending', 'approved']), 422, 'An early return request is already open.');
        abort_if(in_array($booking->extension_status, ['pending', 'payment_required', 'pending_verification']), 422, 'Finish or withdraw the extension before requesting early return.');
        $data = $request->validate(['requested_for' => ['required', 'date', 'after:now'], 'reason' => ['nullable', 'string', 'max:500']]);
        $proposed = Carbon::parse($data['requested_for']);
        abort_unless($proposed->lt($booking->scheduledReturn()), 422, 'Choose a time before the scheduled return.');
        $booking->forceFill([
            'booked_return_at' => $booking->booked_return_at ?? $booking->scheduledReturn(),
            'early_return_status' => 'pending', 'early_return_requested_for' => $proposed->utc(),
            'early_return_requested_at' => now(), 'early_return_reason' => $data['reason'] ?? null,
            'early_return_reviewed_at' => null, 'early_return_response' => null,
        ])->save();
        $this->notify($booking, $booking->operator_id, 'Early return requested', 'The renter proposed an early return. Review the time in Bookings. GPS remains active until handover.');
        return response()->json(['data' => $booking->fresh()]);
    }

    public function review(Request $request, int $id)
    {
        $booking = Booking::findOrFail($id);
        abort_unless($request->user()->id === $booking->operator_id, 403);
        $this->active($booking);
        abort_unless($booking->early_return_status === 'pending', 422, 'There is no pending early return request.');
        $data = $request->validate(['decision' => ['required', 'in:approved,declined'], 'response' => ['required_if:decision,declined', 'nullable', 'string', 'max:500']]);
        $booking->forceFill(['early_return_status' => $data['decision'], 'early_return_response' => $data['response'] ?? null, 'early_return_reviewed_at' => now()])->save();
        $this->notify($booking, $booking->renter_id, 'Early return '.$data['decision'], $data['decision'] === 'approved'
            ? 'Your return time was approved. Meet the operator for inspection. Your trip and GPS remain active until actual handover. The original rental total remains payable.'
            : 'The operator declined the proposed return time. Check the response in Bookings and coordinate through chat.');
        return response()->json(['data' => $booking->fresh()]);
    }

    public function withdraw(Request $request, int $id)
    {
        $booking = Booking::findOrFail($id);
        abort_unless($request->user()->id === $booking->renter_id, 403);
        $this->active($booking);
        abort_unless(in_array($booking->early_return_status, ['pending', 'approved']), 422, 'There is no open early return request.');
        $booking->forceFill(['early_return_status' => 'withdrawn'])->save();
        $this->notify($booking, $booking->operator_id, 'Early return withdrawn', 'The renter withdrew the early return request. The scheduled return remains unchanged.');
        return response()->json(['data' => $booking->fresh()]);
    }

    public function refund(Request $request, int $id)
    {
        $booking = Booking::findOrFail($id);
        abort_unless($request->user()->id === $booking->operator_id, 403);
        abort_unless($booking->status === 'completed' && $booking->returned_early, 422, 'An early return must be completed before recording an agreed refund.');
        abort_if($booking->early_return_refund_recorded_at, 422, 'A refund has already been recorded.');
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:'.$booking->total_price],
            'method' => ['required', 'in:cash,gcash,bank'],
            'reference' => ['required', 'string', 'max:255'], 'reason' => ['required', 'string', 'max:500'],
        ]);
        $booking->forceFill(['early_return_refund_amount' => round($data['amount'], 2),
            'early_return_refund_method' => $data['method'], 'early_return_refund_reference' => $data['reference'],
            'early_return_refund_reason' => $data['reason'], 'early_return_refund_recorded_at' => now()])->save();
        app(\App\Services\BookingPaymentReceipt::class)->post($booking, 'refund', 'recorded', (float) $data['amount'], $data['method'], $data['reference']);
        $this->notify($booking, $booking->renter_id, 'Early return refund recorded', 'The operator recorded an agreed refund. Check the amount and confirm only after you receive it. This record does not transfer money.');
        return response()->json(['data' => $booking->fresh()]);
    }

    public function confirmRefund(Request $request, int $id)
    {
        $booking = Booking::findOrFail($id);
        abort_unless($request->user()->id === $booking->renter_id, 403);
        abort_unless($booking->early_return_refund_recorded_at && !$booking->early_return_refund_received_at, 422, 'There is no refund awaiting receipt confirmation.');
        $request->validate(['received' => ['required', 'accepted']]);
        $booking->forceFill(['early_return_refund_received_at' => now()])->save();
        app(\App\Services\BookingPaymentReceipt::class)->post($booking, 'refund', 'received', (float) $booking->early_return_refund_amount, $booking->early_return_refund_method, $booking->early_return_refund_reference);
        $this->notify($booking, $booking->operator_id, 'Refund receipt confirmed', 'The renter confirmed receiving the agreed early return refund.');
        return response()->json(['data' => $booking->fresh()]);
    }

    private function active(Booking $booking): void
    {
        abort_unless(in_array($booking->status, ['ongoing', 'trip_in_progress', 'return_pending']), 422, 'Early returns are only available during an active trip.');
    }

    private function notify(Booking $booking, int $userId, string $title, string $message): void
    {
        $notification = Notification::create(['user_id' => $userId, 'title' => $title, 'message' => $message,
            'type' => 'info', 'action_url' => $userId === $booking->operator_id ? '/operator-bookings' : '/(tabs)/bookings', 'is_read' => false]);
        DB::afterCommit(fn () => app(DevicePushService::class)->send($notification));
    }
}
