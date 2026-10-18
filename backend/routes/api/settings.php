<?php

use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Route;

Route::get('/v1/platform-settings', fn () => response()->json(['data' => [
    'support_email' => PlatformSetting::get('support_email', 'support@ride4rent.ph'),
    'support_phone' => PlatformSetting::get('support_phone', '+63 917 123 4567'),
    'max_advance_days' => (int) PlatformSetting::get('max_advance_days', '30'),
    'require_kyc_for_booking' => PlatformSetting::get('require_kyc_for_booking', '1') === '1',
    'maintenance_mode' => PlatformSetting::get('maintenance_mode', '0') === '1',
]]));
