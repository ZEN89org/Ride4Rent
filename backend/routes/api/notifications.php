<?php

use App\Http\Controllers\API\NotificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::post('/notifications/devices', [\App\Http\Controllers\API\NotificationDeviceController::class, 'store'])->middleware('throttle:10,1');
    Route::delete('/notifications/devices', [\App\Http\Controllers\API\NotificationDeviceController::class, 'destroy']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications', [NotificationController::class, 'store']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/clear-all', [NotificationController::class, 'clearAll']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
});
