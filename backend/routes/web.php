<?php

use App\Http\Controllers\AdminWebController;
use App\Http\Controllers\PrivateDocumentController;
use App\Services\PrivateDocumentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    $featuredVehicles = \App\Models\Vehicle::with(['brand', 'vehicleType', 'transmissionType', 'fuelType', 'images'])
        ->where('availability_status', 'available')
        ->whereHas('operator', function ($q) {
            $q->where('account_status', 'active')->where('is_frozen', false);
        })
        ->orderByDesc('rating')
        ->take(6)
        ->get();

    $stats = [
        'vehicles_count' => max(12, \App\Models\Vehicle::count()),
        'operators_count' => max(5, \App\Models\User::where('role', 'operator')->where('account_status', 'active')->count()),
        'trips_completed' => max(42, \App\Models\Booking::where('status', 'completed')->count()),
        'satisfaction_rate' => 99,
    ];

    return view('welcome', compact('featuredVehicles', 'stats'));
});

Route::get('/download-app', function () {
    $apkPath = public_path('downloads/Ride4Rent.apk');
    if (file_exists($apkPath)) {
        return response()->download($apkPath, 'Ride4Rent.apk');
    }
    return redirect('/#download');
})->name('app.download');

Route::get('/documents/{path}', [PrivateDocumentController::class, 'show'])->where('path', '.*')->name('documents.show');

// Fallback route to serve public storage files and auto-restore from PostgreSQL if the container redeployed
Route::get('/storage/{path}', function (string $path) {
    $cleanPath = ltrim(preg_replace('#^/?storage/#', '', $path), '/');
    abort_if(str_contains($cleanPath, '..') || str_contains($cleanPath, '\\') || PrivateDocumentService::isPrivate($cleanPath), 403);
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
    } catch (Throwable $e) {
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

        // Commission & Remittance Management (10% Platform Fee & 48-Hour Grace Auto-Freeze)
        Route::post('/remittances/{remittance}/verify', [AdminWebController::class, 'verifyRemittance'])->name('remittances.verify');
        Route::post('/remittances/{remittance}/reject', [AdminWebController::class, 'rejectRemittance'])->name('remittances.reject');
        Route::post('/remittances/sync', [AdminWebController::class, 'syncRemittances'])->name('remittances.sync');
        Route::post('/operators/{user}/toggle-freeze', [AdminWebController::class, 'toggleOperatorFreeze'])->name('operators.toggle-freeze');

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
