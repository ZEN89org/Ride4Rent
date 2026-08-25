<?php

use App\Http\Controllers\API\VehicleController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
	Route::get('/vehicle-options', [VehicleController::class, 'options']);
	Route::get('/vehicles', [VehicleController::class, 'index']);

	Route::middleware(['auth:sanctum', 'active.operator'])->group(function () {
		Route::get('/operator/vehicles', [VehicleController::class, 'mine']);
		Route::post('/operator/vehicles', [VehicleController::class, 'store']);
	});
});
