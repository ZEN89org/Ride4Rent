<?php

use App\Http\Controllers\AdminWebController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Fallback named route for authentication redirects
Route::get('/login', fn () => redirect()->route('admin.login'))->name('login');

Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/', fn () => redirect()->route('admin.dashboard'));
    Route::get('/login', [AdminWebController::class, 'loginForm'])->name('login');
    Route::post('/login', [AdminWebController::class, 'login'])->name('login.submit');

    Route::middleware(['auth', 'admin.web'])->group(function () {
        Route::get('/dashboard', [AdminWebController::class, 'dashboard'])->name('dashboard');
        Route::post('/operators/{user}/approve', [AdminWebController::class, 'approve'])->name('operators.approve');
        Route::post('/operators/{user}/reject', [AdminWebController::class, 'reject'])->name('operators.reject');

        Route::post('/licenses/{user}/approve', [AdminWebController::class, 'approveLicense'])->name('licenses.approve');
        Route::post('/licenses/{user}/reject', [AdminWebController::class, 'rejectLicense'])->name('licenses.reject');

        // Account Status Management (Admin Compliance & Moderation)
        Route::put('/users/{user}/status', [AdminWebController::class, 'updateAccountStatus'])->name('users.status');
        Route::post('/users/{user}/toggle-status', [AdminWebController::class, 'toggleUserStatus'])->name('users.toggle-status');
        Route::delete('/users/{user}', [AdminWebController::class, 'deleteUser'])->name('users.delete');

        // Platform Broadcast Announcements
        Route::post('/announcements/broadcast', [AdminWebController::class, 'broadcastAnnouncement'])->name('announcements.broadcast');

        // System Operational Settings
        Route::post('/settings', [AdminWebController::class, 'updateSettings'])->name('settings.update');

        // Review Moderation Desk
        Route::post('/reviews/{booking}/toggle-visibility', [AdminWebController::class, 'toggleReviewVisibility'])->name('reviews.toggle-visibility');

        // Trip Escalation & Dispute Resolution Memo
        Route::post('/disputes/{booking}/memo', [AdminWebController::class, 'saveDisputeMemo'])->name('disputes.memo');

        // Compliance CSV Data Exports
        Route::get('/exports/renters-kyc', [AdminWebController::class, 'exportRentersKYC'])->name('exports.renters-kyc');
        Route::get('/exports/operators', [AdminWebController::class, 'exportOperators'])->name('exports.operators');
        Route::get('/exports/audit-logs', [AdminWebController::class, 'exportAuditLogs'])->name('exports.audit-logs');

        Route::post('/logout', [AdminWebController::class, 'logout'])->name('logout');
    });
});
