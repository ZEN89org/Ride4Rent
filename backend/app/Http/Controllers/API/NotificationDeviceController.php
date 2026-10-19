<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationDeviceController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate(['token' => ['required', 'string', 'max:255', 'regex:/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/']]);
        DB::table('notification_devices')->updateOrInsert(['token' => $data['token']], ['user_id' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        return response()->json(['success' => true]);
    }
    public function destroy(Request $request)
    {
        $data = $request->validate(['token' => ['required', 'string', 'max:255']]);
        DB::table('notification_devices')->where('user_id', $request->user()->id)->where('token', $data['token'])->delete();
        return response()->json(['success' => true]);
    }
}
