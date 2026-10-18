<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    protected array $excludedTitles = [
        'Welcome Back',
        'Copied',
        'Test Alert Sent',
        'Invalid Number',
        'Daily Rate Required',
        'Photos Required',
        'Upload Failed',
        'Message Error',
        'Success',
        'Deleted',
        'Payment Setup Saved',
        'HELLO!',
    ];

    public function index(Request $request): JsonResponse
    {
        try {
            app(BookingController::class)->checkAndProcessExpirations($request->user()?->id);
        } catch (\Throwable $e) {
            // Do not block notification feed if reminder check fails
        }

        $sanitizeText = function (?string $text): string {
            if (empty($text)) {
                return '';
            }
            $clean = $text;
            if (str_contains($clean, '{"') || str_contains($clean, "{'")) {
                $clean = preg_replace_callback('/\{[^{}]*?"name"\s*:\s*"([^"]+)"[^{}]*?\}/i', function ($m) {
                    return $m[1] ?? 'vehicle';
                }, $clean);
                $clean = preg_replace('/\{[^{}]+\}/', '', $clean);
            }
            // Deduplicate consecutive repeated words (e.g. "Honda Honda" -> "Honda")
            $clean = preg_replace('/\b(\w+)\s+\1\b/i', '$1', $clean);
            return preg_replace('/\s{2,}/', ' ', trim($clean));
        };

        // Auto-heal any legacy notifications containing raw JSON objects, duplicate words, or empty titles
        try {
            Notification::where('user_id', $request->user()->id)
                ->where(function ($q) {
                    $q->where('message', 'like', '%{%')
                        ->orWhere('title', 'like', '%{%')
                        ->orWhere('message', 'like', '%Honda Honda%')
                        ->orWhere('title', 'like', '%Honda Honda%')
                        ->orWhereNull('title')
                        ->orWhere('title', '');
                })
                ->get()
                ->each(function ($notif) use ($sanitizeText) {
                    $cleanedMsg = $sanitizeText($notif->message);
                    $cleanedTitle = $sanitizeText($notif->title);
                    if (empty($cleanedTitle)) {
                        $lower = strtolower($cleanedMsg);
                        if (str_contains($lower, "don't miss your trip") || str_contains($lower, 'upcoming trip')) {
                            $cleanedTitle = 'Upcoming Trip Reminder';
                        } elseif (str_contains($lower, "don't miss your ride")) {
                            $cleanedTitle = "Don't Miss Your Ride!";
                        } elseif (str_contains($lower, 'still interested in')) {
                            $cleanedTitle = 'Still Interested in Your Ride?';
                        } elseif (str_contains($lower, 'complete your reservation')) {
                            $cleanedTitle = 'Complete Your Reservation';
                        } else {
                            $cleanedTitle = 'Notification';
                        }
                    }
                    if ($cleanedMsg !== $notif->message || $cleanedTitle !== $notif->title) {
                        $notif->update([
                            'message' => $cleanedMsg,
                            'title' => $cleanedTitle,
                        ]);
                    }
                });
        } catch (\Throwable $e) {
            // ignore
        }

        $notifications = Notification::where('user_id', $request->user()->id)
            ->whereNotIn('title', $this->excludedTitles)
            ->latest()
            ->take(50)
            ->get()
            ->map(function ($notif) use ($sanitizeText) {
                $cleanTitle = $sanitizeText($notif->title);
                $cleanMessage = $sanitizeText($notif->message);

                if (empty($cleanTitle)) {
                    $lowerMsg = strtolower($cleanMessage);
                    if (str_contains($lowerMsg, "don't miss your trip") || str_contains($lowerMsg, 'upcoming trip')) {
                        $cleanTitle = 'Upcoming Trip Reminder';
                    } elseif (str_contains($lowerMsg, "don't miss your ride")) {
                        $cleanTitle = "Don't Miss Your Ride!";
                    } elseif (str_contains($lowerMsg, 'still interested in')) {
                        $cleanTitle = 'Still Interested in Your Ride?';
                    } else {
                        $cleanTitle = 'Notification';
                    }
                }

                return [
                    'id' => (string) $notif->id,
                    'title' => $cleanTitle,
                    'message' => $cleanMessage,
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

        // Do not persist trivial toasts or UI action errors
        if (in_array($title, $this->excludedTitles)) {
            return response()->json([
                'success' => true,
                'data' => null,
            ], 200);
        }

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
        try {
            app(BookingController::class)->checkAndProcessExpirations($request->user()?->id);
        } catch (\Throwable $e) {
            // silent catch
        }

        $count = Notification::where('user_id', $request->user()->id)
            ->whereNotIn('title', $this->excludedTitles)
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
