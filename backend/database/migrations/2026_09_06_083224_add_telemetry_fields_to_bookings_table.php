<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'current_latitude')) {
                $table->decimal('current_latitude', 10, 7)->nullable()->after('actual_start_time');
            }
            if (!Schema::hasColumn('bookings', 'current_longitude')) {
                $table->decimal('current_longitude', 10, 7)->nullable()->after('current_latitude');
            }
            if (!Schema::hasColumn('bookings', 'current_speed')) {
                $table->float('current_speed')->nullable()->after('current_longitude'); // speed in km/h or m/s
            }
            if (!Schema::hasColumn('bookings', 'last_location_updated_at')) {
                $table->timestamp('last_location_updated_at')->nullable()->after('current_speed');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'current_latitude',
                'current_longitude',
                'current_speed',
                'last_location_updated_at',
            ]);
        });
    }
};
