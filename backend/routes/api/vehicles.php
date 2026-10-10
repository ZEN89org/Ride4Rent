<?php

use App\Http\Controllers\API\VehicleController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
	Route::get('/vehicle-options', [VehicleController::class, 'options']);
	Route::get('/vehicles', [VehicleController::class, 'index']);
	Route::get('/vehicles/{id}', [VehicleController::class, 'show']);
	Route::get('/operator/{id}/vehicles', [VehicleController::class, 'byOperator'])->whereNumber('id');

	Route::middleware(['auth:sanctum'])->group(function () {
		Route::get('/operator/vehicles', [VehicleController::class, 'mine']);
	});

	Route::middleware(['auth:sanctum', 'active.operator'])->group(function () {
		Route::post('/operator/vehicles', [VehicleController::class, 'store']);
		Route::put('/operator/vehicles/{id}', [VehicleController::class, 'update']);
		Route::patch('/operator/vehicles/{id}', [VehicleController::class, 'update']);
		Route::delete('/operator/vehicles/{id}', [VehicleController::class, 'destroy']);
	});
});
