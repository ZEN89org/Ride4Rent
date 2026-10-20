<?php

use App\Http\Controllers\API\BookingController;
use App\Http\Controllers\API\EarlyReturnController;
use App\Http\Middleware\SerializeBookingMutation;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware(['auth:sanctum', SerializeBookingMutation::class])->group(function () {
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::post('/bookings/batch-delete', [BookingController::class, 'batchDelete']);
    Route::post('/bookings/{id}/settle-payment', [BookingController::class, 'settlePayment']);
    Route::post('/bookings/{id}/confirm-payment', [BookingController::class, 'confirmPayment']);
    Route::post('/bookings/{id}/process-refund', [BookingController::class, 'processRefund']);
    Route::patch('/bookings/{id}/status', [BookingController::class, 'updateStatus']);
    Route::post('/bookings/{id}/start-trip', [BookingController::class, 'startTrip']);
    Route::post('/bookings/{id}/complete-trip', [BookingController::class, 'completeTrip']);
    Route::post('/bookings/{id}/early-return', [EarlyReturnController::class, 'request']);
    Route::post('/bookings/{id}/early-return/review', [EarlyReturnController::class, 'review']);
    Route::post('/bookings/{id}/early-return/withdraw', [EarlyReturnController::class, 'withdraw']);
    Route::post('/bookings/{id}/early-return/refund', [EarlyReturnController::class, 'refund']);
    Route::post('/bookings/{id}/early-return/refund/confirm', [EarlyReturnController::class, 'confirmRefund']);
    Route::post('/bookings/{id}/location', [BookingController::class, 'updateLocation']);
    Route::post('/bookings/{id}/location-sharing', [BookingController::class, 'updateLocationSharing']);
    Route::get('/bookings/{id}/location', [BookingController::class, 'getLocation']);
    Route::post('/bookings/{id}/review', [BookingController::class, 'submitReview']);
    Route::post('/bookings/{id}/request-extension', [BookingController::class, 'requestExtension']);
    Route::post('/bookings/{id}/approve-extension', [BookingController::class, 'approveExtension']);
    Route::post('/bookings/{id}/reject-extension', [BookingController::class, 'rejectExtension']);
    Route::post('/bookings/{id}/reject-extension-payment', [BookingController::class, 'rejectExtensionPayment']);
    Route::post('/bookings/{id}/confirm-extension-payment', [BookingController::class, 'confirmExtensionPayment']);
    Route::post('/bookings/{id}/settle-extension-payment', [BookingController::class, 'settleExtensionPayment']);
    Route::delete('/bookings/{id}', [BookingController::class, 'destroy']);
});
