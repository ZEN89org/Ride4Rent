<?php

namespace App\Services;

use App\Models\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DevicePushService
{
    public function send(Notification $notification): void
    {
        foreach (DB::table('notification_devices')->where('user_id', $notification->user_id)->pluck('token') as $token) {
            try {
                $client = Http::timeout(5)->acceptJson();
                if (config('services.expo.access_token')) $client = $client->withToken(config('services.expo.access_token'));
                $response = $client->post('https://exp.host/--/api/v2/push/send', [
                    'to' => $token, 'title' => $notification->title, 'body' => $notification->message,
                    'sound' => 'default', 'channelId' => 'ride4rent_alerts',
                    'data' => ['id' => (string) $notification->id, 'action_url' => $notification->action_url],
                ]);
                if ($response->json('data.details.error') === 'DeviceNotRegistered') DB::table('notification_devices')->where('token', $token)->delete();
                elseif (!$response->successful() || $response->json('data.status') === 'error') Log::warning('Reminder push delivery failed', ['notification_id' => $notification->id, 'status' => $response->status(), 'error' => $response->json('data.details.error')]);
            } catch (\Throwable $error) {
                Log::warning('Reminder push delivery unavailable', ['notification_id' => $notification->id, 'error' => $error->getMessage()]);
            }
        }
    }
}
