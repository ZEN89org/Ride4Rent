<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::where('user_id', $request->user()->id)
            ->latest()
            ->take(50)
            ->get()
            ->map(function ($notif) {
                return [
                    'id' => (string) $notif->id,
                    'title' => $notif->title,
                    'message' => $notif->message,
                    'type' => $notif->type,
                    'action_url' => $notif->action_url,
                    'is_read' => $notif->is_read,
                    'time' => $notif->created_at->diffForHumans(),
                    'created_at' => $notif->created_at->toIso8601String(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $notifications,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:1000'],
            'type' => ['nullable', 'string', 'in:info,success,warning,error,booking,chat'],
            'action_url' => ['nullable', 'string', 'max:255'],
        ]);

        $userId = $request->user()->id;
        $title = $validated['title'];
        $message = $validated['message'] ?? $validated['title'];
        $type = $validated['type'] ?? 'info';

        // Deduplicate within 5 seconds for the same user & title
        $existing = Notification::where('user_id', $userId)
            ->where('title', $title)
            ->where('created_at', '>=', now()->subSeconds(5))
            ->first();

        if ($existing) {
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => (string) $existing->id,
                    'title' => $existing->title,
                    'message' => $existing->message,
                    'type' => $existing->type,
                    'action_url' => $existing->action_url,
                    'is_read' => $existing->is_read,
                    'time' => $existing->created_at->diffForHumans(),
                    'created_at' => $existing->created_at->toIso8601String(),
                ],
            ], 200);
        }

        $notification = Notification::create([
            'user_id' => $userId,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'action_url' => $validated['action_url'] ?? null,
            'is_read' => false,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (string) $notification->id,
                'title' => $notification->title,
                'message' => $notification->message,
                'type' => $notification->type,
                'action_url' => $notification->action_url,
                'is_read' => $notification->is_read,
                'time' => $notification->created_at->diffForHumans(),
                'created_at' => $notification->created_at->toIso8601String(),
            ],
        ], 201);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'unread_count' => $count,
        ]);
    }

    public function markAsRead(Request $request, int $id): JsonResponse
    {
        $notif = Notification::where('user_id', $request->user()->id)->findOrFail($id);
        $notif->update(['is_read' => true]);

        return response()->json(['success' => true]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        Notification::where('user_id', $request->user()->id)->update(['is_read' => true]);

        return response()->json(['success' => true]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $notif = Notification::where('user_id', $request->user()->id)->findOrFail($id);
        $notif->delete();

        return response()->json(['success' => true, 'message' => 'Notification deleted successfully.']);
    }

    public function clearAll(Request $request): JsonResponse
    {
        Notification::where('user_id', $request->user()->id)->delete();

        return response()->json(['success' => true, 'message' => 'All notifications cleared successfully.']);
    }
}
