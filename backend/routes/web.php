<?php

use App\Http\Controllers\AdminWebController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/login', [AdminWebController::class, 'loginForm'])->name('login');
    Route::post('/login', [AdminWebController::class, 'login'])->name('login.submit');

    Route::middleware(['auth', 'admin.web'])->group(function () {
        Route::get('/dashboard', [AdminWebController::class, 'dashboard'])->name('dashboard');
        Route::post('/operators/{user}/approve', [AdminWebController::class, 'approve'])->name('operators.approve');
        Route::post('/operators/{user}/reject', [AdminWebController::class, 'reject'])->name('operators.reject');
        Route::post('/logout', [AdminWebController::class, 'logout'])->name('logout');
    });
});
