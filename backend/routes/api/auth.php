<?php

use App\Http\Controllers\API\AuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {


    Route::post('/operator/register', [AuthController::class, 'registerOperator']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {

        Route::get('/operator/status', [AuthController::class, 'operatorStatus']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);

    });

});
