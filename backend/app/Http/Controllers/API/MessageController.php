<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Message;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MessageController extends Controller
{
    /**
     * Get list of conversations for current user (renter or operator)
     */
    public function conversations(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $host = $request->getSchemeAndHttpHost();

        $otherUserIds = Message::where('sender_id', $userId)
            ->pluck('receiver_id')
            ->merge(
                Message::where('receiver_id', $userId)->pluck('sender_id')
            )
            ->unique();

        $conversations = [];

        foreach ($otherUserIds as $otherId) {
            $otherUser = User::with('operatorProfile')->find($otherId);
            if (!$otherUser) continue;

            $lastMsg = Message::where(function ($q) use ($userId, $otherId) {
                    $q->where('sender_id', $userId)->where('receiver_id', $otherId);
                })
                ->orWhere(function ($q) use ($userId, $otherId) {
                    $q->where('sender_id', $otherId)->where('receiver_id', $userId);
                })
                ->latest()
                ->first();

            $unreadCount = Message::where('sender_id', $otherId)
                ->where('receiver_id', $userId)
                ->where('is_read', false)
                ->count();

            $displayMsg = $lastMsg?->message;
            if (!$displayMsg && $lastMsg?->image_url) {
                $displayMsg = 'Sent a photo';
            }

            $conversations[] = [
                'user_id' => $otherUser->id,
                'name' => trim(($otherUser->first_name ?? '') . ' ' . ($otherUser->last_name ?? '')) ?: ($otherUser->name ?? 'User'),
                'business_name' => $otherUser->operatorProfile?->business_name,
                'role' => $otherUser->role,
                'profile_photo' => $otherUser->profile_photo
                    ? (str_starts_with($otherUser->profile_photo, 'http') ? $otherUser->profile_photo : $host . '/storage/' . $otherUser->profile_photo)
                    : null,
                'last_message' => $displayMsg ?? '',
                'last_time' => $lastMsg?->created_at?->diffForHumans() ?? '',
                'unread_count' => $unreadCount,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $conversations,
        ]);
    }

    /**
     * Get chat messages between current user and target user
     */
    public function thread(Request $request, $otherUserId): JsonResponse
    {
        if (!is_numeric($otherUserId)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid user ID.',
            ], 404);
        }

        $otherUserId = (int) $otherUserId;
        $userId = $request->user()->id;
        $host = $request->getSchemeAndHttpHost();

        Message::where('sender_id', $otherUserId)
            ->where('receiver_id', $userId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        $messages = Message::where(function ($q) use ($userId, $otherUserId) {
                $q->where('sender_id', $userId)->where('receiver_id', $otherUserId);
            })
            ->orWhere(function ($q) use ($userId, $otherUserId) {
                $q->where('sender_id', $otherUserId)->where('receiver_id', $userId);
            })
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($msg) use ($userId, $host) {
                $imageUrl = null;
                if ($msg->image_url) {
                    $imageUrl = str_starts_with($msg->image_url, 'http')
                        ? $msg->image_url
                        : $host . '/storage/' . $msg->image_url;
                }

                return [
                    'id' => (string) $msg->id,
                    'sender' => $msg->sender_id === $userId ? 'user' : 'other',
                    'sender_id' => $msg->sender_id,
                    'text' => $msg->message ?? '',
                    'image_url' => $imageUrl,
                    'time' => $msg->created_at->format('h:i A'),
                    'created_at' => $msg->created_at->toIso8601String(),
                ];
            });

        $otherUser = User::with('operatorProfile')->find($otherUserId);

        // Find active unpaid booking awaiting payment settlement between these 2 users (renter + operator)
        $booking = Booking::with(['vehicle', 'operator.operatorProfile'])
            ->where(function ($q) use ($userId, $otherUserId) {
                $q->where(function ($sub) use ($userId, $otherUserId) {
                    $sub->where('renter_id', $userId)->where('operator_id', $otherUserId);
                })->orWhere(function ($sub) use ($userId, $otherUserId) {
                    $sub->where('renter_id', $otherUserId)->where('operator_id', $userId);
                });
            })
            ->where('status', 'pending_payment')
            ->where('payment_status', 'unpaid')
            ->latest()
            ->first();

        $bookingContext = null;
        if ($booking) {
            $bookingContext = [
                'id' => $booking->id,
                'vehicle_id' => $booking->vehicle_id,
                'vehicle_name' => $booking->vehicle?->name ?? 'Vehicle',
                'vehicle_image' => $booking->vehicle?->cover_photo ? (str_starts_with($booking->vehicle->cover_photo, 'http') ? $booking->vehicle->cover_photo : $host . '/storage/' . $booking->vehicle->cover_photo) : null,
                'start_date' => $booking->start_date ? $booking->start_date->format('Y-m-d') : null,
                'end_date' => $booking->end_date ? $booking->end_date->format('Y-m-d') : null,
                'total_days' => $booking->total_days,
                'total_price' => (float) $booking->total_price,
                'reservation_fee' => (float) ($booking->reservation_fee ?? 500),
                'balance_due' => max(0, (float) $booking->total_price - (float) ($booking->reservation_fee ?? 500)),
                'status' => $booking->status,
                'payment_status' => $booking->payment_status,
                'operator_payment_info' => $booking->operator_payment_info,
            ];
        }

        return response()->json([
            'success' => true,
            'other_user' => $otherUser ? [
                'id' => $otherUser->id,
                'name' => trim(($otherUser->first_name ?? '') . ' ' . ($otherUser->last_name ?? '')) ?: ($otherUser->name ?? 'User'),
                'business_name' => $otherUser->operatorProfile?->business_name,
                'role' => $otherUser->role,
                'profile_photo' => $otherUser->profile_photo
                    ? (str_starts_with($otherUser->profile_photo, 'http') ? $otherUser->profile_photo : $host . '/storage/' . $otherUser->profile_photo)
                    : null,
                'business_contact_number' => $otherUser->operatorProfile?->business_contact_number,
                'mobile_number' => $otherUser->mobile_number,
            ] : null,
            'booking_context' => $bookingContext,
            'data' => $messages,
        ]);
    }

    /**
     * Send a message with optional image attachment
     */
    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'receiver_id' => ['required', 'exists:users,id'],
            'message' => ['nullable', 'string', 'max:1500'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:10240'],
            'image_base64' => ['nullable', 'string'],
            'vehicle_id' => ['nullable'],
        ]);

        if (empty($validated['message']) && !$request->hasFile('image') && empty($validated['image_base64'])) {
            return response()->json([
                'success' => false,
                'message' => 'Please enter a message or select an image to send.',
            ], 422);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('chat_images', 'public');
        } elseif (!empty($validated['image_base64'])) {
            $raw = preg_replace('/^data:image\/\w+;base64,/', '', $validated['image_base64']);
            $decoded = base64_decode($raw);
            if ($decoded !== false) {
                $filename = 'chat_images/' . uniqid('chat_', true) . '.jpg';
                Storage::disk('public')->put($filename, $decoded);
                $imagePath = $filename;
            }
        }

        // Gracefully resolve vehicle_id only if valid
        $vehicleId = null;
        if (!empty($validated['vehicle_id']) && is_numeric($validated['vehicle_id'])) {
            if (Vehicle::where('id', (int) $validated['vehicle_id'])->exists()) {
                $vehicleId = (int) $validated['vehicle_id'];
            }
        }

        $msg = Message::create([
            'sender_id' => $request->user()->id,
            'receiver_id' => $validated['receiver_id'],
            'vehicle_id' => $vehicleId,
            'message' => $validated['message'] ?? '',
            'image_url' => $imagePath,
            'is_read' => false,
        ]);

        $host = $request->getSchemeAndHttpHost();
        $fullImageUrl = $imagePath ? $host . '/storage/' . $imagePath : null;

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (string) $msg->id,
                'sender' => 'user',
                'sender_id' => $msg->sender_id,
                'text' => $msg->message ?? '',
                'image_url' => $fullImageUrl,
                'time' => $msg->created_at->format('h:i A'),
                'created_at' => $msg->created_at->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * Delete a chat message
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;
        $msg = Message::findOrFail($id);

        if ($msg->sender_id !== $userId) {
            return response()->json([
                'success' => false,
                'message' => 'You can only delete messages sent by you.',
            ], 403);
        }

        if ($msg->image_url && Storage::disk('public')->exists($msg->image_url)) {
            Storage::disk('public')->delete($msg->image_url);
        }

        $msg->delete();

        return response()->json([
            'success' => true,
            'message' => 'Message deleted successfully.',
        ]);
    }
}
