<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    /**
     * Get list of conversations for current user (renter or operator)
     */
    public function conversations(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

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

            $conversations[] = [
                'user_id' => $otherUser->id,
                'name' => trim($otherUser->first_name . ' ' . $otherUser->last_name),
                'business_name' => $otherUser->operatorProfile?->business_name,
                'role' => $otherUser->role,
                'profile_photo' => $otherUser->profile_photo
                    ? $request->getSchemeAndHttpHost() . '/storage/' . $otherUser->profile_photo
                    : null,
                'last_message' => $lastMsg?->message ?? '',
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
    public function thread(Request $request, int $otherUserId): JsonResponse
    {
        $userId = $request->user()->id;

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
            ->map(function ($msg) use ($userId) {
                return [
                    'id' => (string) $msg->id,
                    'sender' => $msg->sender_id === $userId ? 'user' : 'other',
                    'text' => $msg->message,
                    'time' => $msg->created_at->format('h:i A'),
                    'created_at' => $msg->created_at->toIso8601String(),
                ];
            });

        $otherUser = User::with('operatorProfile')->find($otherUserId);

        return response()->json([
            'success' => true,
            'other_user' => $otherUser ? [
                'id' => $otherUser->id,
                'name' => trim($otherUser->first_name . ' ' . $otherUser->last_name),
                'business_name' => $otherUser->operatorProfile?->business_name,
                'role' => $otherUser->role,
                'profile_photo' => $otherUser->profile_photo
                    ? $request->getSchemeAndHttpHost() . '/storage/' . $otherUser->profile_photo
                    : null,
            ] : null,
            'data' => $messages,
        ]);
    }

    /**
     * Send a message
     */
    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'receiver_id' => ['required', 'exists:users,id'],
            'message' => ['required', 'string', 'max:1500'],
            'vehicle_id' => ['nullable', 'exists:vehicles,id'],
        ]);

        $msg = Message::create([
            'sender_id' => $request->user()->id,
            'receiver_id' => $validated['receiver_id'],
            'vehicle_id' => $validated['vehicle_id'] ?? null,
            'message' => $validated['message'],
            'is_read' => false,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (string) $msg->id,
                'sender' => 'user',
                'text' => $msg->message,
                'time' => $msg->created_at->format('h:i A'),
                'created_at' => $msg->created_at->toIso8601String(),
            ],
        ], 201);
    }
}
