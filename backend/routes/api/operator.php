<?php

use App\Http\Controllers\API\MaintenanceController;
use App\Http\Controllers\API\OperatorController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('/operator/status', [OperatorController::class, 'status']);
    Route::get('/operator/maintenance', [MaintenanceController::class, 'index']);
    Route::post('/operator/maintenance', [MaintenanceController::class, 'store']);
});
