<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Message;

class BookingPaymentReceipt
{
    // Called within the serialized booking transaction. The unique event key also
    // prevents duplicate receipts on retries without matching unrelated chat text.
    public function post(Booking $booking, string $kind, string $stage, float $amount, string $method, ?string $reference = null): void
    {
        if ($amount <= 0) return;
        $cycle = $kind === 'extension' ? ($booking->extension_requested_at?->toIso8601String() ?? '').'|'.$booking->extension_end_date?->toDateString() : '';
        $key = hash('sha256', implode('|', [$booking->id, $kind, $stage, $cycle, $reference]));
        $label = match ($kind) {
            'extension' => 'EXTENSION PAYMENT RECEIPT',
            'handover' => 'HANDOVER PAYMENT RECEIPT',
            'return' => 'RETURN PAYMENT RECEIPT',
            'refund' => 'REFUND PAYMENT RECEIPT',
            default => 'PAYMENT RECEIPT',
        };
        $status = match ($stage) {
            'submitted' => 'Payment Submitted — Awaiting Host Verification',
            'correction' => 'Payment Not Verified — Correction Requested',
            'recorded' => 'Refund Sent — Awaiting Renter Confirmation',
            'sent' => 'Refund Sent — Recorded by Operator',
            'received' => 'Refund Receipt Confirmed',
            default => 'Payment Confirmed',
        };
        $refund = $kind === 'refund';
        $sender = $refund ? $booking->operator_id : $booking->renter_id;
        $receiver = $refund ? $booking->renter_id : $booking->operator_id;
        $schedule = $kind === 'extension'
            ? 'Extended return date: '.$booking->extension_end_date?->format('M d, Y').' '.($booking->extension_return_time ?? '')
            : 'Schedule: '.$booking->start_date?->format('M d, Y').' – '.$booking->end_date?->format('M d, Y');
        $recipient = $refund ? $booking->renter : $booking->operator;
        $name = trim(($recipient?->first_name ?? '').' '.($recipient?->last_name ?? '')) ?: 'Booking recipient';
        $message = "🧾 {$label}\nReceipt ID: ".substr($key, 0, 12)."\nBooking: {$booking->id}\n"
            ."Recipient: {$name}\n".'Vehicle: '.($booking->vehicle?->name ?: 'Rental vehicle')."\n{$schedule}\n"
            .'Method: '.strtoupper(str_replace('_', ' ', $method))."\nReference: ".($reference ?: 'In-person collection recorded by operator')."\n"
            .($stage === 'submitted' ? 'Submitted Amount: ₱' : 'Amount: ₱').number_format($amount, 2)."\nStatus: {$status}\n"
            .'Recorded: '.now()->setTimezone('Asia/Manila')->format('M d, Y h:i A').' (Philippine time)';
        Message::firstOrCreate(['receipt_event_key' => $key], ['sender_id' => $sender, 'receiver_id' => $receiver,
            'vehicle_id' => $booking->vehicle_id, 'message' => $message, 'is_read' => false]);
    }
}
