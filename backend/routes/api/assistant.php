<?php

use App\Http\Controllers\API\AssistantController;
use Illuminate\Support\Facades\Route;

Route::post('/assistant/chat', [AssistantController::class, 'chat']);

Route::prefix('v1')->group(function () {
    Route::post('/assistant/chat', [AssistantController::class, 'chat']);
});
