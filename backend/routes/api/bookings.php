<?php

use App\Http\Controllers\API\BookingController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::post('/bookings/batch-delete', [BookingController::class, 'batchDelete']);
    Route::post('/bookings/{id}/settle-payment', [BookingController::class, 'settlePayment']);
    Route::post('/bookings/{id}/confirm-payment', [BookingController::class, 'confirmPayment']);
    Route::post('/bookings/{id}/process-refund', [BookingController::class, 'processRefund']);
    Route::patch('/bookings/{id}/status', [BookingController::class, 'updateStatus']);
    Route::post('/bookings/{id}/start-trip', [BookingController::class, 'startTrip']);
    Route::post('/bookings/{id}/complete-trip', [BookingController::class, 'completeTrip']);
    Route::post('/bookings/{id}/location', [BookingController::class, 'updateLocation']);
    Route::get('/bookings/{id}/location', [BookingController::class, 'getLocation']);
    Route::post('/bookings/{id}/review', [BookingController::class, 'submitReview']);
    Route::post('/bookings/{id}/request-extension', [BookingController::class, 'requestExtension']);
    Route::post('/bookings/{id}/approve-extension', [BookingController::class, 'approveExtension']);
    Route::post('/bookings/{id}/reject-extension', [BookingController::class, 'rejectExtension']);
    Route::post('/bookings/{id}/settle-extension-payment', [BookingController::class, 'settleExtensionPayment']);
    Route::delete('/bookings/{id}', [BookingController::class, 'destroy']);
});