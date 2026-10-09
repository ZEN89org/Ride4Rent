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
            if (!Schema::hasColumn('bookings', 'is_multi_vehicle_rental')) {
                $table->boolean('is_multi_vehicle_rental')->default(false)->after('status');
            }
            if (!Schema::hasColumn('bookings', 'secondary_driver_name')) {
                $table->string('secondary_driver_name')->nullable()->after('is_multi_vehicle_rental');
            }
            if (!Schema::hasColumn('bookings', 'secondary_driver_phone')) {
                $table->string('secondary_driver_phone')->nullable()->after('secondary_driver_name');
            }
            if (!Schema::hasColumn('bookings', 'secondary_driver_license_front')) {
                $table->string('secondary_driver_license_front')->nullable()->after('secondary_driver_phone');
            }
            if (!Schema::hasColumn('bookings', 'secondary_driver_license_back')) {
                $table->string('secondary_driver_license_back')->nullable()->after('secondary_driver_license_front');
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
                'is_multi_vehicle_rental',
                'secondary_driver_name',
                'secondary_driver_phone',
                'secondary_driver_license_front',
                'secondary_driver_license_back',
            ]);
        });
    }
};
