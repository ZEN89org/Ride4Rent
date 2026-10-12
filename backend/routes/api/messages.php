<?php

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
});
