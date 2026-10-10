<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ProductionDataSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data_dump.json');
        if (! file_exists($path)) {
            $this->command->error("data_dump.json not found at {$path}");
            return;
        }

        $data = json_decode(file_get_contents($path), true);
        if (! is_array($data)) {
            $this->command->error("Invalid JSON in {$path}");
            return;
        }

        $driver = DB::connection()->getDriverName();

        // Tables to truncate and re-populate (in order of dependencies)
        $tables = [
            'vehicle_types',
            'vehicle_brands',
            'body_types',
            'transmission_types',
            'fuel_types',
            'vehicle_features',
            'maintenance_types',
            'payment_method_types',
            'rental_policy_templates',
            'verification_requirements',
            'users',
            'operator_profiles',
            'vehicles',
            'vehicle_images',
            'vehicle_maintenances',
            'bookings',
            'messages',
            'notifications',
            'admin_audit_logs',
        ];

        $existingTables = array_filter($tables, fn($t) => Schema::hasTable($t));

        if ($driver === 'pgsql') {
            if (!empty($existingTables)) {
                $truncateList = implode(', ', $existingTables);
                DB::statement("TRUNCATE TABLE {$truncateList} RESTART IDENTITY CASCADE");
            }
        } else {
            Schema::disableForeignKeyConstraints();
            foreach ($existingTables as $table) {
                DB::table($table)->truncate();
            }
            Schema::enableForeignKeyConstraints();
        }

        foreach ($tables as $table) {
            if (empty($data[$table]) || ! Schema::hasTable($table)) {
                continue;
            }

            $columns = Schema::getColumnListing($table);
            $columnMap = array_flip($columns);
            $filteredRows = array_map(function ($row) use ($columnMap) {
                return array_intersect_key($row, $columnMap);
            }, $data[$table]);

            foreach (array_chunk($filteredRows, 100) as $chunk) {
                DB::table($table)->insert($chunk);
            }

            // Sync PostgreSQL sequences
            if ($driver === 'pgsql') {
                try {
                    DB::statement("SELECT setval(pg_get_serial_sequence('{$table}', 'id'), coalesce(max(id), 1)) FROM {$table}");
                } catch (\Throwable $e) {
                    // Ignore if table has no serial id
                }
            }
        }
    }
}
