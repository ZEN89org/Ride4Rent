<?php

use App\Http\Controllers\API\AuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::get('/auth/test-mail', function () {
        try {
            $mailer = config('mail.default');
            $host = config("mail.mailers.{$mailer}.host");
            $port = config("mail.mailers.{$mailer}.port");
            $username = config("mail.mailers.{$mailer}.username");
            $hasPassword = !empty(config("mail.mailers.{$mailer}.password"));

            $results = [];
            foreach ([587, 465, 2525] as $p) {
                $t0 = microtime(true);
                $fp = @fsockopen('smtp.gmail.com', $p, $errNo, $errStr, 3);
                $results["port_{$p}"] = [
                    'connected' => $fp !== false,
                    'error' => $errStr,
                    'time' => round(microtime(true) - $t0, 3),
                ];
                if ($fp) fclose($fp);
            }

            return response()->json([
                'sockets' => $results,
                'mailer' => config('mail.default'),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
                'class' => get_class($e),
                'mailer' => config('mail.default'),
                'host' => config('mail.mailers.smtp.host'),
                'port' => config('mail.mailers.smtp.port'),
                'username' => config('mail.mailers.smtp.username'),
                'has_password' => !empty(config('mail.mailers.smtp.password')),
            ], 500);
        }
    });

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
