<?php

use App\Http\Controllers\AdminWebController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

// Fallback route to serve public storage files and auto-restore from PostgreSQL if the container redeployed
Route::get('/storage/{path}', function (string $path) {
    $cleanPath = ltrim(preg_replace('#^/?storage/#', '', $path), '/');
    $disk = Storage::disk('public');

    if ($disk->exists($cleanPath)) {
        return $disk->response($cleanPath, null, [
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    try {
        if (Schema::hasTable('stored_files')) {
            $record = DB::table('stored_files')->where('path', $cleanPath)->first();
            if ($record && ! empty($record->content_base64)) {
                $binary = base64_decode($record->content_base64, true);
                if ($binary !== false) {
                    $disk->put($cleanPath, $binary);

                    return response($binary, 200, [
                        'Content-Type' => $record->mime_type ?: 'image/jpeg',
                        'Cache-Control' => 'public, max-age=86400',
                    ]);
                }
            }
        }
    } catch (\Throwable $e) {
        // Ignore DB lookup errors and fall through to 404
    }

    abort(404);
})->where('path', '.*');

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
