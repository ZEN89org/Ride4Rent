<?php

use App\Http\Controllers\API\AdminController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')
    ->middleware(['auth:sanctum', 'admin'])
    ->group(function () {

        Route::get('/admin/test', [AdminController::class, 'test']);

    });
