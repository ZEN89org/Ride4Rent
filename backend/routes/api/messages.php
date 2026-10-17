<?php

use App\Http\Controllers\API\CallController;
use App\Http\Controllers\API\MessageController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware('auth:sanctum')->group(function () {
    Route::get('/messages/conversations', [MessageController::class, 'conversations']);
    Route::post('/messages/conversations/{userId}/archive', [MessageController::class, 'archiveConversation'])->whereNumber('userId');
    Route::delete('/messages/conversations/{userId}/archive', [MessageController::class, 'restoreConversation'])->whereNumber('userId');
    Route::delete('/messages/conversations/{userId}', [MessageController::class, 'deleteConversation'])->whereNumber('userId');
    Route::get('/messages/thread/{userId}', [MessageController::class, 'thread'])->whereNumber('userId');
    Route::post('/messages/send', [MessageController::class, 'send']);
    Route::delete('/messages/{id}', [MessageController::class, 'destroy'])->whereNumber('id');

    // In-App Voice Calling
    Route::post('/calls/initiate', [CallController::class, 'initiate']);
    Route::get('/calls/active', [CallController::class, 'active']);
    Route::post('/calls/{id}/answer', [CallController::class, 'answer'])->whereNumber('id');
    Route::post('/calls/{id}/decline', [CallController::class, 'decline'])->whereNumber('id');
    Route::post('/calls/{id}/end', [CallController::class, 'end'])->whereNumber('id');
});
