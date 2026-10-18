<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Call;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CallController extends Controller
{
    /**
     * Helper to format user payload
     */
    private function formatUser(?User $user, string $host): ?array
    {
        if (! $user) {
            return null;
        }
        $photo = $user->profile_photo
            ? (str_starts_with($user->profile_photo, 'http') ? $user->profile_photo : $host.'/storage/'.$user->profile_photo)
            : null;

        $displayName = trim(($user->first_name ?? '').' '.($user->last_name ?? '')) ?: ($user->name ?? 'User');

        return [
            'id' => $user->id,
            'name' => $displayName,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'role' => $user->role,
            'profile_photo' => $photo,
            'business_name' => $user->operatorProfile?->business_name,
        ];
    }

    /**
     * Generate an HS256 LiveKit Access Token for a participant
     */
    private function generateLiveKitToken(string $roomName, string $identity, string $name): ?string
    {
        $apiKey = config('services.livekit.api_key');
        $apiSecret = config('services.livekit.api_secret');

        if (! $apiKey || ! $apiSecret) {
            return null;
        }

        $header = json_encode([
            'alg' => 'HS256',
            'typ' => 'JWT',
        ]);

        $now = time();
        $payload = json_encode([
            'iss' => $apiKey,
            'sub' => (string) $identity,
            'name' => $name,
            'nbf' => $now - 5,
            'exp' => $now + 7200, // Valid for 2 hours
            'video' => [
                'room' => $roomName,
                'roomJoin' => true,
                'canPublish' => true,
                'canSubscribe' => true,
                'canPublishData' => true,
            ],
        ]);

        $base64UrlHeader = rtrim(strtr(base64_encode($header), '+/', '-_'), '=');
        $base64UrlPayload = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
        $signature = hash_hmac('sha256', $base64UrlHeader.'.'.$base64UrlPayload, $apiSecret, true);
        $base64UrlSignature = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

        return $base64UrlHeader.'.'.$base64UrlPayload.'.'.$base64UrlSignature;
    }

    /**
     * Helper to format call payload
     */
    private function formatCall(Call $call, string $host, ?User $currentUser = null): array
    {
        $livekitToken = null;
        if ($currentUser && $call->channel_name) {
            $displayName = trim(($currentUser->first_name ?? '').' '.($currentUser->last_name ?? '')) ?: ($currentUser->name ?? 'User');
            $livekitToken = $this->generateLiveKitToken($call->channel_name, (string) $currentUser->id, $displayName);
        }

        return [
            'id' => (string) $call->id,
            'caller_id' => $call->caller_id,
            'receiver_id' => $call->receiver_id,
            'status' => $call->status,
            'channel_name' => $call->channel_name,
            'livekit_url' => config('services.livekit.url'),
            'livekit_token' => $livekitToken,
            'started_at' => $call->started_at?->toIso8601String(),
            'ended_at' => $call->ended_at?->toIso8601String(),
            'duration' => $call->duration,
            'created_at' => $call->created_at->toIso8601String(),
            'caller' => $this->formatUser($call->caller, $host),
            'receiver' => $this->formatUser($call->receiver, $host),
        ];
    }

    /**
     * Initiate a new in-app voice call
     */
    public function initiate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'receiver_id' => ['required', 'exists:users,id'],
        ]);

        if (! config('services.livekit.url') || ! config('services.livekit.api_key') || ! config('services.livekit.api_secret')) {
            return response()->json(['message' => 'Voice calling is not configured on this server.'], 503);
        }
        $caller = $request->user();
        $callerId = $caller->id;
        $receiverId = (int) $validated['receiver_id'];

        if ($callerId === $receiverId) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot call yourself.',
            ], 422);
        }

        // Cancel any stale calling/ringing calls for caller
        Call::where('caller_id', $callerId)
            ->whereIn('status', ['calling', 'ringing'])
            ->where('created_at', '<', now()->subSeconds(45))
            ->update([
                'status' => 'missed',
                'ended_at' => now(),
            ]);

        $channelName = 'call_'.min($callerId, $receiverId).'_'.max($callerId, $receiverId).'_'.time();

        $call = Call::create([
            'caller_id' => $callerId,
            'receiver_id' => $receiverId,
            'status' => 'ringing',
            'channel_name' => $channelName,
        ]);

        $callerName = trim(($caller->first_name ?? '').' '.($caller->last_name ?? '')) ?: ($caller->name ?? 'User');

        // Dispatch incoming call notification to receiver
        Notification::create([
            'user_id' => $receiverId,
            'title' => 'Incoming Voice Call',
            'message' => $callerName.' is calling you...',
            'type' => 'incoming_call',
            'action_url' => '/chat/'.$callerId,
            'is_read' => false,
        ]);

        $call->load(['caller.operatorProfile', 'receiver.operatorProfile']);

        return response()->json([
            'success' => true,
            'data' => $this->formatCall($call, $request->getSchemeAndHttpHost(), $caller),
        ]);
    }

    /**
     * Check for any active or incoming calls for current user
     */
    public function active(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $host = $request->getSchemeAndHttpHost();

        // 1. Check for incoming call (user is receiver and status is ringing/calling)
        $incoming = Call::with(['caller.operatorProfile', 'receiver.operatorProfile'])
            ->where('receiver_id', $userId)
            ->whereIn('status', ['calling', 'ringing'])
            ->where('created_at', '>=', now()->subSeconds(45))
            ->latest()
            ->first();

        if ($incoming) {
            return response()->json([
                'success' => true,
                'call' => $this->formatCall($incoming, $host, $request->user()),
                'role' => 'receiver',
            ]);
        }

        // 2. Check for outgoing call still ringing (user is caller)
        $outgoing = Call::with(['caller.operatorProfile', 'receiver.operatorProfile'])
            ->where('caller_id', $userId)
            ->whereIn('status', ['calling', 'ringing'])
            ->where('created_at', '>=', now()->subSeconds(45))
            ->latest()
            ->first();

        if ($outgoing) {
            return response()->json([
                'success' => true,
                'call' => $this->formatCall($outgoing, $host, $request->user()),
                'role' => 'caller',
            ]);
        }

        // 3. Check for ongoing accepted call
        $ongoing = Call::with(['caller.operatorProfile', 'receiver.operatorProfile'])
            ->where(function ($q) use ($userId) {
                $q->where('caller_id', $userId)->orWhere('receiver_id', $userId);
            })
            ->where('status', 'accepted')
            ->where('updated_at', '>=', now()->subHours(2))
            ->latest()
            ->first();

        if ($ongoing) {
            return response()->json([
                'success' => true,
                'call' => $this->formatCall($ongoing, $host, $request->user()),
                'role' => $ongoing->caller_id === $userId ? 'caller' : 'receiver',
            ]);
        }

        return response()->json([
            'success' => true,
            'call' => null,
            'role' => null,
        ]);
    }

    /**
     * Answer an incoming call
     */
    public function answer(Request $request, $id): JsonResponse
    {
        $userId = $request->user()->id;
        $call = Call::with(['caller.operatorProfile', 'receiver.operatorProfile'])->find($id);

        if (! $call) {
            return response()->json(['success' => false, 'message' => 'Call not found.'], 404);
        }

        if ($call->receiver_id !== $userId) {
            return response()->json(['success' => false, 'message' => 'Unauthorized to answer this call.'], 403);
        }

        if ($call->status !== 'ringing' && $call->status !== 'calling') {
            return response()->json([
                'success' => false,
                'message' => 'Call is no longer ringing.',
                'call' => $this->formatCall($call, $request->getSchemeAndHttpHost(), $request->user()),
            ], 400);
        }

        $call->update([
            'status' => 'accepted',
            'started_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->formatCall($call, $request->getSchemeAndHttpHost(), $request->user()),
        ]);
    }

    /**
     * Decline an incoming call
     */
    public function decline(Request $request, $id): JsonResponse
    {
        $userId = $request->user()->id;
        $call = Call::with(['caller.operatorProfile', 'receiver.operatorProfile'])->find($id);

        if (! $call) {
            return response()->json(['success' => false, 'message' => 'Call not found.'], 404);
        }

        if ($call->receiver_id !== $userId && $call->caller_id !== $userId) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $call->update([
            'status' => 'declined',
            'ended_at' => now(),
            'duration' => 0,
        ]);

        // Insert Missed Call message in chat
        Message::create([
            'sender_id' => $call->caller_id,
            'receiver_id' => $call->receiver_id,
            'message' => '[CALL:{"type":"missed","duration":0}]',
            'is_read' => false,
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->formatCall($call, $request->getSchemeAndHttpHost(), $request->user()),
        ]);
    }

    /**
     * End an active call
     */
    public function end(Request $request, $id): JsonResponse
    {
        $userId = $request->user()->id;
        $call = Call::with(['caller.operatorProfile', 'receiver.operatorProfile'])->find($id);

        if (! $call) {
            return response()->json(['success' => false, 'message' => 'Call not found.'], 404);
        }

        if ($call->receiver_id !== $userId && $call->caller_id !== $userId) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        // If already ended or declined, return current state
        if (in_array($call->status, ['ended', 'declined', 'missed'])) {
            return response()->json([
                'success' => true,
                'data' => $this->formatCall($call, $request->getSchemeAndHttpHost(), $request->user()),
            ]);
        }

        $now = now();
        $duration = 0;
        $wasAccepted = $call->status === 'accepted';

        if ($wasAccepted && $call->started_at) {
            $duration = max(1, $now->diffInSeconds($call->started_at));
            $call->update([
                'status' => 'ended',
                'ended_at' => $now,
                'duration' => $duration,
            ]);

            // Insert Voice Call summary in chat
            Message::create([
                'sender_id' => $call->caller_id,
                'receiver_id' => $call->receiver_id,
                'message' => '[CALL:{"type":"voice","duration":'.$duration.'}]',
                'is_read' => false,
            ]);
        } else {
            // Cancelled before answer
            $call->update([
                'status' => 'missed',
                'ended_at' => $now,
                'duration' => 0,
            ]);

            Message::create([
                'sender_id' => $call->caller_id,
                'receiver_id' => $call->receiver_id,
                'message' => '[CALL:{"type":"missed","duration":0}]',
                'is_read' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatCall($call, $request->getSchemeAndHttpHost(), $request->user()),
        ]);
    }
}
