<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('vehicles')) {
            return;
        }

        Schema::table('vehicles', function (Blueprint $table) {
            if (! Schema::hasColumn('vehicles', 'pickup_address')) {
                $table->string('pickup_address')->nullable();
            }

            if (! Schema::hasColumn('vehicles', 'pickup_latitude')) {
                $table->decimal('pickup_latitude', 10, 7)->nullable();
            }

            if (! Schema::hasColumn('vehicles', 'pickup_longitude')) {
                $table->decimal('pickup_longitude', 10, 7)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('vehicles')) {
            return;
        }

        Schema::table('vehicles', function (Blueprint $table) {
            $columns = array_filter([
                Schema::hasColumn('vehicles', 'pickup_address') ? 'pickup_address' : null,
                Schema::hasColumn('vehicles', 'pickup_latitude') ? 'pickup_latitude' : null,
                Schema::hasColumn('vehicles', 'pickup_longitude') ? 'pickup_longitude' : null,
            ]);

            if ($columns) {
                $table->dropColumn($columns);
            }
        });
    }
};
