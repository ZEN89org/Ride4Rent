<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Services\PayMongoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    protected PayMongoService $payMongoService;

    public function __construct(PayMongoService $payMongoService)
    {
        $this->payMongoService = $payMongoService;
    }

    /**
     * Create PayMongo Checkout Session for Booking Reservation Fee
     */
    public function createCheckoutSession(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $booking = Booking::with(['vehicle', 'operator', 'renter'])
            ->where('renter_id', $user->id)
            ->findOrFail($id);

        if ($booking->status !== 'pending_payment') {
            return response()->json([
                'success' => false,
                'message' => 'This booking is not waiting for payment or has already been settled.',
            ], 422);
        }

        $successUrl = url("/api/v1/paymongo/callback/success?booking_id={$booking->id}");
        $cancelUrl = url("/api/v1/paymongo/callback/cancel?booking_id={$booking->id}");

        $result = $this->payMongoService->createCheckoutSession($booking, $successUrl, $cancelUrl);

        return response()->json([
            'success' => true,
            'data' => [
                'booking_id' => $booking->id,
                'reservation_fee' => (float) $booking->reservation_fee,
                'checkout_id' => $result['checkout_id'],
                'checkout_url' => $result['checkout_url'],
                'mode' => $result['mode'],
            ],
        ]);
    }

    /**
     * Poll / Inquire Payment Status directly from server (Zero-trust verify)
     */
    public function verifyPaymentStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $booking = Booking::with(['vehicle', 'operator', 'renter'])
            ->where('renter_id', $user->id)
            ->findOrFail($id);

        $result = $this->payMongoService->verifyPaymentStatus($booking);

        return response()->json([
            'success' => true,
            'data' => [
                'paid' => $result['paid'],
                'status' => $booking->fresh()->status,
                'payment_status' => $booking->fresh()->payment_status,
                'payment_reference' => $booking->fresh()->payment_reference,
            ],
        ]);
    }

    /**
     * Official PayMongo Webhook Endpoint
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        $signature = $request->header('Paymongo-Signature');

        $result = $this->payMongoService->handleWebhook($payload, $signature);

        return response()->json($result);
    }

    /**
     * Interactive Capstone Defense GCash Sandbox Simulator
     */
    public function renderSimulator(Request $request, int $id)
    {
        $booking = Booking::with(['vehicle', 'renter'])->findOrFail($id);
        $sessionId = $request->query('session_id', $booking->paymongo_checkout_id ?? 'cs_test_mock');

        return response(
            <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>GCash Payment Portal • Ride4Rent</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body { background: #F4F6F9; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; }
        .card { background: #FFFFFF; width: 100%; max-width: 380px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); overflow: hidden; }
        .header { background: #007DFE; padding: 24px 20px; text-align: center; color: #FFFFFF; }
        .header img { height: 32px; margin-bottom: 8px; }
        .header h1 { font-size: 20px; font-weight: 700; }
        .header p { font-size: 13px; opacity: 0.9; margin-top: 2px; }
        .body { padding: 24px 20px; }
        .amount-box { background: #F0F7FF; border: 1.5px dashed #007DFE; border-radius: 14px; padding: 16px; text-align: center; margin-bottom: 20px; }
        .amount-label { font-size: 12px; color: #007DFE; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .amount-val { font-size: 28px; font-weight: 800; color: #1E293B; margin-top: 4px; }
        .detail-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 12px; color: #64748B; }
        .detail-row strong { color: #1E293B; }
        .input-group { margin-top: 16px; }
        .input-group label { display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px; }
        .input-group input { width: 100%; height: 46px; border-radius: 10px; border: 1.5px solid #CBD5E1; padding: 0 14px; font-size: 15px; font-weight: 600; color: #0F172A; }
        .btn-confirm { width: 100%; height: 50px; background: #007DFE; color: #FFFFFF; border: none; border-radius: 14px; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 24px; transition: all 0.2s; }
        .btn-confirm:hover { background: #0066D6; }
        .secure-badge { text-align: center; font-size: 11px; color: #94A3B8; margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 4px; }
        .success-screen { display: none; text-align: center; padding: 30px 10px; }
        .success-icon { width: 64px; height: 64px; background: #ECFDF5; color: #10B981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 16px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1 style="letter-spacing:-0.5px;">GCash Checkout</h1>
            <p>PayMongo Authorized Gateway</p>
        </div>
        <div class="body" id="paymentView">
            <div class="amount-box">
                <div class="amount-label">Reservation Deposit</div>
                <div class="amount-val">₱500.00</div>
            </div>

            <div class="detail-row">
                <span>Merchant:</span>
                <strong>Ride4Rent Services</strong>
            </div>
            <div class="detail-row">
                <span>Vehicle:</span>
                <strong>{$booking->vehicle->name}</strong>
            </div>
            <div class="detail-row">
                <span>Booking ID:</span>
                <strong>#{$booking->id}</strong>
            </div>
            <div class="detail-row">
                <span>Customer:</span>
                <strong>{$booking->renter->first_name} {$booking->renter->last_name}</strong>
            </div>

            <div class="input-group">
                <label>GCash Mobile Number</label>
                <input type="text" value="0917-890-1234" readonly style="background:#F8FAFC;" />
            </div>

            <button class="btn-confirm" id="payBtn" onclick="submitMockPayment()">
                Pay ₱500.00 with GCash
            </button>

            <div class="secure-badge">
                256-Bit Encrypted & Verified Server-to-Server
            </div>
        </div>

        <div class="body success-screen" id="successView">
            <div class="success-icon">✓</div>
            <h2 style="color:#0F172A; font-size:20px; font-weight:800; margin-bottom:6px;">Payment Approved!</h2>
            <p style="color:#64748B; font-size:13px; line-height:18px; margin-bottom:20px;">
                ₱500.00 reservation fee was successfully authorized. Returning to Ride4Rent...
            </p>
            <div style="background:#F1F5F9; border-radius:10px; padding:12px; font-size:12px; color:#475569; font-weight:600;">
                Transaction Ref: <span id="refDisplay" style="color:#007DFE;"></span>
            </div>
        </div>
    </div>

    <script>
        function submitMockPayment() {
            var btn = document.getElementById('payBtn');
            btn.disabled = true;
            btn.innerText = 'Authorizing Payment...';

            fetch('/api/v1/paymongo/simulator/{$booking->id}/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    session_id: '{$sessionId}'
                })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.success) {
                    document.getElementById('paymentView').style.display = 'none';
                    document.getElementById('successView').style.display = 'block';
                    document.getElementById('refDisplay').innerText = data.reference;

                    // Automatically close or inform webview
                    setTimeout(function() {
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ event: 'PAYMENT_SUCCESS', booking_id: {$booking->id} }));
                        }
                    }, 1800);
                } else {
                    alert(data.message || 'Payment failed.');
                    btn.disabled = false;
                    btn.innerText = 'Pay ₱500.00 with GCash';
                }
            })
            .catch(function(err) {
                alert('Connection error. Please try again.');
                btn.disabled = false;
                btn.innerText = 'Pay ₱500.00 with GCash';
            });
        }
    </script>
</body>
</html>
HTML
        , 200, ['Content-Type' => 'text/html']);
    }

    /**
     * Confirm Mock Payment in Simulator (Triggers real backend status change & notification)
     */
    public function confirmSimulatorPayment(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with(['vehicle', 'renter'])->findOrFail($id);
        $ref = 'GCASH-PAYMONGO-' . strtoupper(uniqid());

        $this->payMongoService->markBookingAsPaid($booking, $ref, 'gcash');

        return response()->json([
            'success' => true,
            'message' => 'Payment settled successfully via GCash PayMongo gateway simulator.',
            'reference' => $ref,
            'booking_id' => $booking->id,
        ]);
    }
}
