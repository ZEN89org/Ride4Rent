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
            // Start Trip & Handover Inspection
            if (!Schema::hasColumn('bookings', 'actual_start_time')) {
                $table->timestamp('actual_start_time')->nullable()->after('end_date');
            }
            if (!Schema::hasColumn('bookings', 'start_mileage')) {
                $table->unsignedInteger('start_mileage')->nullable()->after('actual_start_time');
            }
            if (!Schema::hasColumn('bookings', 'start_fuel_level')) {
                $table->unsignedTinyInteger('start_fuel_level')->nullable()->after('start_mileage'); // Percentage 0-100
            }
            if (!Schema::hasColumn('bookings', 'start_inspection_notes')) {
                $table->text('start_inspection_notes')->nullable()->after('start_fuel_level');
            }
            if (!Schema::hasColumn('bookings', 'start_inspection_photos')) {
                $table->json('start_inspection_photos')->nullable()->after('start_inspection_notes');
            }

            // Return Trip & Final Inspection
            if (!Schema::hasColumn('bookings', 'actual_end_time')) {
                $table->timestamp('actual_end_time')->nullable()->after('start_inspection_photos');
            }
            if (!Schema::hasColumn('bookings', 'end_mileage')) {
                $table->unsignedInteger('end_mileage')->nullable()->after('actual_end_time');
            }
            if (!Schema::hasColumn('bookings', 'end_fuel_level')) {
                $table->unsignedTinyInteger('end_fuel_level')->nullable()->after('end_mileage'); // Percentage 0-100
            }
            if (!Schema::hasColumn('bookings', 'distance_traveled')) {
                $table->unsignedInteger('distance_traveled')->nullable()->after('end_fuel_level'); // in km
            }
            if (!Schema::hasColumn('bookings', 'end_inspection_notes')) {
                $table->text('end_inspection_notes')->nullable()->after('distance_traveled');
            }
            if (!Schema::hasColumn('bookings', 'end_inspection_photos')) {
                $table->json('end_inspection_photos')->nullable()->after('end_inspection_notes');
            }

            // Additional Charges & Settlement
            if (!Schema::hasColumn('bookings', 'fuel_charge')) {
                $table->decimal('fuel_charge', 10, 2)->default(0)->after('end_inspection_photos');
            }
            if (!Schema::hasColumn('bookings', 'damage_charge')) {
                $table->decimal('damage_charge', 10, 2)->default(0)->after('fuel_charge');
            }
            if (!Schema::hasColumn('bookings', 'late_fee')) {
                $table->decimal('late_fee', 10, 2)->default(0)->after('damage_charge');
            }
            if (!Schema::hasColumn('bookings', 'other_charges')) {
                $table->decimal('other_charges', 10, 2)->default(0)->after('late_fee');
            }
            if (!Schema::hasColumn('bookings', 'final_amount_due')) {
                $table->decimal('final_amount_due', 10, 2)->nullable()->after('other_charges');
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
                'actual_start_time',
                'start_mileage',
                'start_fuel_level',
                'start_inspection_notes',
                'start_inspection_photos',
                'actual_end_time',
                'end_mileage',
                'end_fuel_level',
                'distance_traveled',
                'end_inspection_notes',
                'end_inspection_photos',
                'fuel_charge',
                'damage_charge',
                'late_fee',
                'other_charges',
                'final_amount_due',
            ]);
        });
    }
};
