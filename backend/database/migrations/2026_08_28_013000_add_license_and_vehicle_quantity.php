<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'drivers_license_front')) {
                $table->string('drivers_license_front')->nullable()->after('profile_photo');
            }
            if (!Schema::hasColumn('users', 'drivers_license_back')) {
                $table->string('drivers_license_back')->nullable()->after('drivers_license_front');
            }
            if (!Schema::hasColumn('users', 'is_drivers_license_verified')) {
                $table->boolean('is_drivers_license_verified')->default(false)->after('drivers_license_back');
            }
        });

        Schema::table('vehicles', function (Blueprint $table) {
            if (!Schema::hasColumn('vehicles', 'quantity')) {
                $table->unsignedInteger('quantity')->default(1)->after('seating_capacity');
            }
            if (!Schema::hasColumn('vehicles', 'available_units')) {
                $table->unsignedInteger('available_units')->default(1)->after('quantity');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['drivers_license_front', 'drivers_license_back', 'is_drivers_license_verified']);
        });

        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn(['quantity', 'available_units']);
        });
    }
};
