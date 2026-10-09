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
            if (!Schema::hasColumn('bookings', 'current_street')) {
                $table->string('current_street')->nullable()->after('current_speed');
            }
            if (!Schema::hasColumn('bookings', 'current_barangay')) {
                $table->string('current_barangay')->nullable()->after('current_street');
            }
            if (!Schema::hasColumn('bookings', 'current_city')) {
                $table->string('current_city')->nullable()->after('current_barangay'); // municipality / city
            }
            if (!Schema::hasColumn('bookings', 'current_location_address')) {
                $table->text('current_location_address')->nullable()->after('current_city');
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
                'current_street',
                'current_barangay',
                'current_city',
                'current_location_address',
            ]);
        });
    }
};
