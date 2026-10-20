<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('location_sharing_status', 20)->nullable();
            $table->string('location_sharing_reason', 50)->nullable();
            $table->timestamp('location_sharing_changed_at')->nullable();
            $table->boolean('outside_service_area')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', fn (Blueprint $table) => $table->dropColumn([
            'location_sharing_status', 'location_sharing_reason', 'location_sharing_changed_at', 'outside_service_area',
        ]));
    }
};
