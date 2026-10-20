<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('bookings:check-expirations')->everyMinute()->withoutOverlapping();
Schedule::call(fn () => app(\App\Services\TripLocationMonitor::class)->sweep())
    ->name('trip-location-monitor')->everyMinute()->withoutOverlapping();
Schedule::call(fn () => app(\App\Services\BookingReminderService::class)->send())
    ->name('booking-reminders')->everyFiveMinutes()->withoutOverlapping();
