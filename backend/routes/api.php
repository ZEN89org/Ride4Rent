<?php

require __DIR__.'/api/auth.php';
require __DIR__.'/api/operator.php';
require __DIR__.'/api/admin.php';
require __DIR__.'/api/vehicles.php';
require __DIR__.'/api/bookings.php';
require __DIR__.'/api/messages.php';
require __DIR__.'/api/notifications.php';
require __DIR__.'/api/assistant.php';

use Illuminate\Support\Facades\Route;

Route::get('/v1/db-test', function () {
    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        $tables = \Illuminate\Support\Facades\DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        return response()->json([
            'status' => 'connected',
            'database' => \Illuminate\Support\Facades\DB::connection()->getDatabaseName(),
            'tables_count' => count($tables),
            'tables' => array_map(fn($t) => $t->table_name, $tables),
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'database_url_set' => !empty(env('DATABASE_URL')),
            'db_connection' => config('database.default'),
            'host' => config('database.connections.pgsql.host'),
            'database' => config('database.connections.pgsql.database'),
        ], 500);
    }
});

Route::get('/v1/run-migrations', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        return response()->json([
            'status' => 'migrated',
            'output' => \Illuminate\Support\Facades\Artisan::output(),
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
        ], 500);
    }
});
