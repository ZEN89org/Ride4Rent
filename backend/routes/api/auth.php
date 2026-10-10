<?php

use App\Http\Controllers\API\AuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::post('/auth/send-otp', [AuthController::class, 'sendOtp']);
    Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

    Route::post('/operator/register', [AuthController::class, 'registerOperator']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);
        Route::post('/user/photo', [\App\Http\Controllers\API\ProfileController::class, 'uploadPhoto']);
        Route::post('/user/license', [\App\Http\Controllers\API\LicenseController::class, 'upload']);
        Route::post('/operator/payment', [\App\Http\Controllers\API\ProfileController::class, 'updateOperatorPayment']);
    });

});
