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
        Schema::table('vehicles', function (Blueprint $table) {
            $table->decimal('base_price_per_day', 10, 2)->nullable()->after('price_per_day');
            $table->decimal('demand_multiplier', 4, 2)->default(1.00)->after('base_price_per_day');
            $table->boolean('is_dynamic_pricing_enabled')->default(true)->after('demand_multiplier');
            $table->integer('current_odometer')->default(0)->after('is_dynamic_pricing_enabled');
            $table->integer('last_service_odometer')->default(0)->after('current_odometer');
            $table->integer('service_interval_km')->default(5000)->after('last_service_odometer');
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->integer('extension_days')->nullable()->after('expires_at');
            $table->date('extension_end_date')->nullable()->after('extension_days');
            $table->decimal('extension_price', 10, 2)->nullable()->after('extension_end_date');
            $table->string('extension_status')->nullable()->after('extension_price'); // pending, approved, rejected
            $table->string('extension_payment_method')->nullable()->after('extension_status');
            $table->string('extension_payment_reference')->nullable()->after('extension_payment_method');
            $table->timestamp('extension_requested_at')->nullable()->after('extension_payment_reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn([
                'base_price_per_day',
                'demand_multiplier',
                'is_dynamic_pricing_enabled',
                'current_odometer',
                'last_service_odometer',
                'service_interval_km',
            ]);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'extension_days',
                'extension_end_date',
                'extension_price',
                'extension_status',
                'extension_payment_method',
                'extension_payment_reference',
                'extension_requested_at',
            ]);
        });
    }
};
