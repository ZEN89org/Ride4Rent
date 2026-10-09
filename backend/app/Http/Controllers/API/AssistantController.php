<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AssistantController extends Controller
{
    public function chat(Request $request): JsonResponse
    {
        $message = trim((string) $request->input('message', ''));
        if (empty($message)) {
            return response()->json([
                'success' => false,
                'message' => 'Message cannot be empty.',
            ], 422);
        }

        $apiKey = config('services.gemini.key') ?? env('GEMINI_API_KEY');

        // Fetch live catalog context from database
        $activeVehicles = Vehicle::with(['brand', 'vehicleType', 'transmissionType', 'fuelType'])
            ->where('is_active', true)
            ->where('availability_status', 'available')
            ->get();

        $brands = VehicleBrand::where('is_active', true)->pluck('name')->toArray();
        $types = VehicleType::where('is_active', true)->pluck('name')->toArray();

        $vehicleSummary = $activeVehicles->map(function ($v) {
            return [
                'id' => (string) $v->id,
                'name' => $v->name,
                'brand' => $v->brand?->name,
                'type' => $v->vehicleType?->name,
                'price_per_day' => (float) $v->daily_rate,
                'seats' => (int) ($v->seating_capacity ?? 5),
                'transmission' => $v->transmissionType?->name ?? 'Automatic',
                'fuel' => $v->fuelType?->name ?? 'Gasoline',
                'pickup_address' => $v->pickup_address ?? 'Pinamalayan, Oriental Mindoro',
            ];
        })->toArray();

        if (!empty($apiKey)) {
            try {
                $geminiResponse = $this->callGemini($apiKey, $message, $vehicleSummary, $brands, $types);
                if ($geminiResponse) {
                    $recommendedIds = $geminiResponse['recommended_vehicle_ids'] ?? [];
                    $matchedVehicles = [];

                    if (!empty($recommendedIds)) {
                        $matched = Vehicle::whereIn('id', $recommendedIds)->get();
                        $matchedVehicles = $this->formatVehicles($matched, $request);
                    }

                    $cleanReply = trim(str_replace('*', '', (string) ($geminiResponse['reply'] ?? "I'm here to help with your vehicle rental questions!")));
                    $rawQuickReplies = $geminiResponse['quick_replies'] ?? ["Show available SUVs", "Budget friendly cars", "Rental requirements"];
                    $cleanQuickReplies = array_map(function ($qr) {
                        return trim(str_replace('*', '', (string) $qr));
                    }, $rawQuickReplies);

                    return response()->json([
                        'success' => true,
                        'data' => [
                            'reply' => $cleanReply,
                            'vehicles' => $matchedVehicles,
                            'quick_replies' => $cleanQuickReplies,
                        ],
                    ]);
                }
            } catch (\Throwable $e) {
                Log::error('Gemini Assistant Error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            }
        }

        // Fallback intelligent handler if API key is not configured or offline
        return $this->localFallbackHandler($message, $activeVehicles, $brands, $request);
    }

    private function callGemini(string $apiKey, string $userMessage, array $vehicles, array $brands, array $types): ?array
    {
        $systemPrompt = "You are the intelligent, friendly, and expert AI Assistant for Ride4Rent (a peer-to-peer vehicle rental marketplace in Oriental Mindoro, Philippines).

Role, Language & Strict Domain Scope:
1. STRICT PURPOSE: You ONLY assist with Ride4Rent vehicle rentals, car/motorcycle inquiries, pricing, booking steps, reservation fees, policies, requirements, and travel/routes in Oriental Mindoro, Philippines.
2. OFF-TOPIC & UNRELATED QUESTIONS: If the user asks about ANYTHING outside vehicle rentals or Ride4Rent (for example: coding, math, general science, politics, relationship advice, recipes, homework, weather predictions outside travel, general knowledge, etc.):
   - Do NOT answer the off-topic question.
   - Politely decline with a message like:
     - In English: \"I'd like to help with your question, but I am only specialized in assisting with Ride4Rent vehicle rentals, car/motorcycle bookings, and rental policies in Oriental Mindoro. How can I help you find or book a vehicle today?\"
     - In Tagalog: \"Nais ko sanang sagutin ang iyong katanungan, ngunit ako ay nakalaan lamang para sa mga katanungan tungkol sa Ride4Rent vehicle rentals, car/motorcycle booking, at mga patakaran sa pag-upa ng sasakyan sa Oriental Mindoro. Paano po kita matutulungan sa pagrenta ng sasakyan?\"
3. LANGUAGE SUPPORT (Tagalog & Taglish):
   - You fully understand Filipino / Tagalog, Taglish, and English.
   - Always respond in the SAME language or dialect the user used. If the user asks in Tagalog or Taglish, reply naturally in helpful, conversational Tagalog/Taglish. If the user asks in English, reply in English.

IMPORTANT FORMATTING RULE:
- NEVER use asterisks (*) or double asterisks (**) anywhere in your response.
- Write clean, normal, conversational, easy-to-read text without any markdown asterisks.
- Use natural line breaks, numbered points (1., 2., 3.), or relevant emojis (🚗, 📋, 📍, 💡, 🔑) instead of asterisks or bullet markdown.

Key Ride4Rent Platform Rules & Knowledge:
1. Requirements: Valid unexpired Driver's License + 1 secondary government ID. Minimum age is 21 years old. IDs are inspected upon vehicle handover.
2. Booking & Reservation Fee: Renter books on the app -> settles reservation fee (₱500) via GCash or gateway -> Host reviews & confirms/approves -> Renter meets host for vehicle handover inspection and pays the remaining rental balance.
3. Policies: Same-to-Same Fuel Policy. Late returns require 3 hours advance notice. Free cancellation before host confirmation. Smoking/Pets prohibited inside enclosed vehicles unless authorized by the host.
4. No-Show Policy: If the host approves the booking fee but the renter fails to pick up the vehicle, the booking is marked as no-show; the ₱500 reservation fee is non-refundable (forfeited to host), and vehicle inventory is released.
5. Service Area: Oriental Mindoro (Pinamalayan, Calapan, Victoria, Roxas, and nearby areas).

Available Brands: " . implode(', ', $brands) . "
Available Vehicle Categories: " . implode(', ', $types) . "
Active Available Vehicles in Database (JSON): " . json_encode($vehicles) . "

Output Format Instructions:
You MUST return ONLY a valid JSON object with the following schema:
{
  \"reply\": \"(Your natural, clean response with NO asterisks at all. In the user's language)\",
  \"recommended_vehicle_ids\": [\"id1\", \"id2\"], // Array of relevant vehicle IDs from the database if recommending vehicles, or empty array
  \"quick_replies\": [\"Short question 1\", \"Short question 2\", \"Short question 3\"] // 3-4 short clean follow-up questions
}";

        // Prioritize stable fast models with fallback list
        $modelsToTry = [
            'gemini-2.5-flash',
            'gemini-flash-latest',
            'gemini-3.5-flash',
            'gemini-3.6-flash',
        ];

        foreach ($modelsToTry as $model) {
            try {
                $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

                $response = Http::timeout(15)->post($url, [
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [
                                ['text' => $systemPrompt . "\n\nUser Question: " . $userMessage],
                            ],
                        ],
                    ],
                    'generationConfig' => [
                        'response_mime_type' => 'application/json',
                        'temperature' => 0.2,
                    ],
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    $rawText = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
                    if ($rawText) {
                        $parsed = json_decode($rawText, true);
                        if (is_array($parsed) && isset($parsed['reply'])) {
                            return $parsed;
                        }
                    }
                } else {
                    Log::warning("Gemini model {$model} returned status " . $response->status() . ": " . $response->body());
                }
            } catch (\Throwable $e) {
                Log::warning("Gemini model {$model} error: " . $e->getMessage());
            }
        }

        return null;
    }

    private function localFallbackHandler(string $message, $activeVehicles, array $brands, Request $request): JsonResponse
    {
        $lower = strtolower($message);
        $vehicles = [];
        $quickReplies = ["What brands are available?", "Show budget vehicles", "Rental requirements", "How to book and pay?"];
        $reply = "";

        if (str_contains($lower, 'brand')) {
            $reply = "We offer popular vehicle brands on Ride4Rent:\n\n🚗 Cars & SUVs: Toyota, Honda, Mitsubishi, Nissan, Ford, Hyundai, Suzuki, Isuzu, Kia\n🏍️ Motorcycles: Yamaha, Honda, Kawasaki, Vespa, Kymco, SYM, TVS\n\nWhat brand or model are you looking for?";
            $vehicles = $this->formatVehicles($activeVehicles->take(3), $request);
            $quickReplies = ["Show Toyota cars", "Show Honda motorcycles", "Show SUVs"];
        } elseif (str_contains($lower, 'require') || str_contains($lower, 'document') || str_contains($lower, 'license') || str_contains($lower, 'id')) {
            $reply = "To rent on Ride4Rent:\n• Valid Driver's License\n• Secondary Valid ID (Passport, UMID, National ID)\n• Age 21+\n\nOriginal IDs are verified during handover inspection.";
            $quickReplies = ["How to book?", "What brands are available?", "How does payment work?"];
        } else {
            $reply = "Hello! I'm your Ride4Rent Assistant 🚗✨\n\nI can help you browse cars, explain rental rules, or recommend vehicles for your trip in Oriental Mindoro!";
            $vehicles = $this->formatVehicles($activeVehicles->take(3), $request);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'reply' => $reply,
                'vehicles' => $vehicles,
                'quick_replies' => $quickReplies,
            ],
        ]);
    }

    private function formatVehicles($vehicles, Request $request): array
    {
        return $vehicles->map(function ($vehicle) use ($request) {
            $hasRating = (int) ($vehicle->rating_count ?? 0) > 0 && $vehicle->rating !== null;
            return [
                'id' => (string) $vehicle->id,
                'name' => $vehicle->name,
                'price_per_day' => (float) $vehicle->daily_rate,
                'rating' => $hasRating ? (float) $vehicle->rating : null,
                'rating_count' => (int) ($vehicle->rating_count ?? 0),
                'seats' => (int) ($vehicle->seating_capacity ?? 5),
                'transmission' => $vehicle->transmissionType?->name ?? 'Automatic',
                'image_url' => $vehicle->cover_photo
                    ? $request->getSchemeAndHttpHost() . '/storage/' . $vehicle->cover_photo
                    : ($vehicle->images->first() ? $request->getSchemeAndHttpHost() . '/storage/' . $vehicle->images->first()->image_path : null),
            ];
        })->toArray();
    }
}
