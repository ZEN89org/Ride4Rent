<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Notification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PayMongoService
{
    protected string $secretKey;
    protected string $publicKey;
    protected string $webhookSecret;
    protected string $baseUrl = 'https://api.paymongo.com/v1';

    public function __construct()
    {
        $this->secretKey = config('services.paymongo.secret_key', env('PAYMONGO_SECRET_KEY', ''));
        $this->publicKey = config('services.paymongo.public_key', env('PAYMONGO_PUBLIC_KEY', ''));
        $this->webhookSecret = config('services.paymongo.webhook_secret', env('PAYMONGO_WEBHOOK_SECRET', ''));
    }

    /**
     * Create PayMongo Checkout Session for GCash Reservation Fee (₱500)
     */
    public function createCheckoutSession(Booking $booking, string $successUrl, string $cancelUrl): array
    {
        $renter = $booking->renter;
        $vehicle = $booking->vehicle;
        $amountInCentavos = (int) round(((float) $booking->reservation_fee) * 100);

        // If amount is zero or negative, default to 500 PHP
        if ($amountInCentavos <= 0) {
            $amountInCentavos = 50000;
        }

        // If real PayMongo API keys are provided and not sample placeholders, call PayMongo API
        if ($this->hasValidApiKeys()) {
            try {
                $response = Http::withBasicAuth($this->secretKey, '')
                    ->withHeaders([
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json',
                    ])
                    ->post("{$this->baseUrl}/checkout_sessions", [
                        'data' => [
                            'attributes' => [
                                'billing' => [
                                    'name' => trim(($renter->first_name ?? '') . ' ' . ($renter->last_name ?? '')) ?: ($renter->name ?? 'Ride4Rent Customer'),
                                    'email' => $renter->email,
                                    'phone' => $renter->mobile_number ?? $renter->phone ?? '09171234567',
                                ],
                                'send_email_receipt' => true,
                                'show_description' => true,
                                'show_line_items' => true,
                                'description' => "Ride4Rent Reservation Fee for {$vehicle->name} (Booking #{$booking->id})",
                                'line_items' => [
                                    [
                                        'amount' => $amountInCentavos,
                                        'currency' => 'PHP',
                                        'name' => "Reservation Fee - {$vehicle->name}",
                                        'quantity' => 1,
                                        'description' => "Secures rental slot from {$booking->start_date} to {$booking->end_date}",
                                    ],
                                ],
                                'payment_method_types' => ['gcash', 'paymaya', 'card'],
                                'success_url' => $successUrl,
                                'cancel_url' => $cancelUrl,
                                'reference_number' => "R4R-BK-{$booking->id}",
                            ],
                        ],
                    ]);

                if ($response->successful()) {
                    $sessionData = $response->json('data');
                    $checkoutId = $sessionData['id'] ?? null;
                    $checkoutUrl = $sessionData['attributes']['checkout_url'] ?? null;
                    $paymentIntentId = $sessionData['attributes']['payment_intent']['id'] ?? null;

                    $booking->update([
                        'paymongo_checkout_id' => $checkoutId,
                        'paymongo_payment_intent_id' => $paymentIntentId,
                        'paymongo_checkout_url' => $checkoutUrl,
                    ]);

                    return [
                        'success' => true,
                        'checkout_id' => $checkoutId,
                        'checkout_url' => $checkoutUrl,
                        'mode' => 'live_paymongo',
                    ];
                }

                Log::warning('PayMongo API Error, falling back to Sandbox Simulator:', ['res' => $response->body()]);
            } catch (\Exception $e) {
                Log::error('PayMongo Exception: ' . $e->getMessage());
            }
        }

        // Seamless Built-in Simulator Mode (For local defense & offline testing without needing live internet/cards)
        $simCheckoutId = 'cs_test_' . strtoupper(uniqid());
        $simCheckoutUrl = url("/api/v1/paymongo/simulator/{$booking->id}?session_id={$simCheckoutId}");

        $booking->update([
            'paymongo_checkout_id' => $simCheckoutId,
            'paymongo_checkout_url' => $simCheckoutUrl,
        ]);

        return [
            'success' => true,
            'checkout_id' => $simCheckoutId,
            'checkout_url' => $simCheckoutUrl,
            'mode' => 'sandbox_simulator',
        ];
    }

    /**
     * Inquire Checkout Session or Payment Intent status directly from PayMongo
     */
    public function verifyPaymentStatus(Booking $booking): array
    {
        if ($booking->payment_status === 'paid_reservation' || in_array($booking->status, ['pending_verification', 'approved', 'ongoing', 'completed'])) {
            return [
                'paid' => true,
                'status' => $booking->status,
                'payment_reference' => $booking->payment_reference,
            ];
        }

        // If booking has checkout ID and valid API key, query PayMongo directly
        if ($booking->paymongo_checkout_id && $this->hasValidApiKeys()) {
            try {
                $response = Http::withBasicAuth($this->secretKey, '')
                    ->get("{$this->baseUrl}/checkout_sessions/{$booking->paymongo_checkout_id}");

                if ($response->successful()) {
                    $attributes = $response->json('data.attributes') ?? [];
                    $payments = $attributes['payments'] ?? [];

                    foreach ($payments as $payment) {
                        $paymentStatus = $payment['attributes']['status'] ?? null;
                        if ($paymentStatus === 'paid') {
                            $paymentRef = $payment['id'] ?? ('PAYMONGO-' . strtoupper(uniqid()));
                            $this->markBookingAsPaid($booking, $paymentRef, 'gcash');
                            return [
                                'paid' => true,
                                'status' => 'pending_verification',
                                'payment_reference' => $paymentRef,
                            ];
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::error('PayMongo verification check failed: ' . $e->getMessage());
            }
        }

        return [
            'paid' => false,
            'status' => $booking->status,
        ];
    }

    /**
     * Process official Webhook payload from PayMongo
     */
    public function handleWebhook(array $payload, ?string $signatureHeader = null): array
    {
        $event = $payload['data']['attributes']['type'] ?? null;
        $eventData = $payload['data']['attributes']['data'] ?? [];

        Log::info("PayMongo Webhook received: [{$event}]", ['payload' => $payload]);

        if ($event === 'checkout_session.payment.paid' || $event === 'payment.paid') {
            $paymentAttributes = $eventData['attributes'] ?? [];
            $checkoutId = $eventData['id'] ?? null;
            $paymentRef = $paymentAttributes['id'] ?? $checkoutId;
            $billingName = $paymentAttributes['billing']['name'] ?? null;
            $sourceType = $paymentAttributes['source']['type'] ?? 'gcash';

            // Find booking by checkout session ID or reference
            $booking = Booking::where('paymongo_checkout_id', $checkoutId)
                ->orWhere('paymongo_payment_intent_id', $paymentRef)
                ->first();

            if (!$booking && isset($paymentAttributes['description'])) {
                if (preg_match('/Booking #(\d+)/', $paymentAttributes['description'], $matches)) {
                    $booking = Booking::find($matches[1]);
                }
            }

            if ($booking) {
                $this->markBookingAsPaid($booking, $paymentRef, $sourceType);
                return ['success' => true, 'booking_id' => $booking->id, 'status' => 'paid'];
            }
        }

        return ['success' => false, 'message' => 'Event not handled or booking not found'];
    }

    /**
     * Mark booking as paid, secure vehicle inventory unit, and notify Host
     */
    public function markBookingAsPaid(Booking $booking, string $paymentRef, string $paymentMethod = 'gcash'): void
    {
        if ($booking->payment_status === 'paid_reservation') {
            return;
        }

        $renter = $booking->renter;
        $vehicle = $booking->vehicle;
        $totalUnits = max(1, (int) ($vehicle->quantity ?? 1));
        $takenUnits = Booking::where('vehicle_id', $vehicle->id)
            ->where('id', '!=', $booking->id)
            ->whereIn('status', ['pending_verification', 'approved', 'ongoing'])
            ->count();

        $refundName = trim(($renter->first_name ?? '') . ' ' . ($renter->last_name ?? '')) ?: ($renter->name ?? 'Renter');
        $refundNumber = $renter->mobile_number ?? $renter->phone ?? '';

        $booking->update([
            'payment_method' => $paymentMethod,
            'payment_reference' => $paymentRef,
            'payment_status' => 'paid_reservation',
            'status' => 'pending_verification',
            'paid_at' => now(),
            'expires_at' => now()->addHours(24),
            'renter_refund_method' => $paymentMethod,
            'renter_refund_account_name' => $refundName,
            'renter_refund_account_number' => $refundNumber,
            'refund_amount' => $booking->reservation_fee,
        ]);

        // Auto update remaining units
        $remUnits = max(0, $totalUnits - ($takenUnits + 1));
        $vehicle->update([
            'available_units' => $remUnits,
            'availability_status' => $remUnits === 0 ? 'unavailable' : 'available',
        ]);

        // Clean competing un-settled requests if full
        if ($remUnits === 0) {
            $competingPending = Booking::where('vehicle_id', $vehicle->id)
                ->where('id', '!=', $booking->id)
                ->where('status', 'pending_payment')
                ->get();

            foreach ($competingPending as $compBooking) {
                Notification::create([
                    'user_id' => $compBooking->renter_id,
                    'title' => 'Vehicle Unavailable',
                    'message' => 'The vehicle is no longer available.',
                    'type' => 'warning',
                    'action_url' => '/(tabs)/home',
                ]);
                $compBooking->delete();
            }
        }

        // Notify Host & Renter
        Notification::create([
            'user_id' => $booking->operator_id,
            'title' => '💳 GCash Reservation Paid',
            'message' => "Renter {$refundName} paid ₱" . number_format($booking->reservation_fee, 2) . " via GCash (Ref: {$paymentRef}). Please verify & approve booking #{$booking->id}.",
            'type' => 'success',
            'action_url' => '/operator-bookings',
        ]);

        Notification::create([
            'user_id' => $booking->renter_id,
            'title' => '✅ Reservation Payment Received',
            'message' => "Your GCash payment of ₱" . number_format($booking->reservation_fee, 2) . " was verified. Host was notified to approve your trip schedule.",
            'type' => 'success',
            'action_url' => '/(tabs)/bookings',
        ]);
    }

    protected function hasValidApiKeys(): bool
    {
        return !empty($this->secretKey) && !str_contains($this->secretKey, 'sample');
    }
}
