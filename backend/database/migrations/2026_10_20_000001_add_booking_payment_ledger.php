<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->decimal('rental_paid_amount', 12, 2)->default(0);
            $table->timestamp('rental_balance_paid_at')->nullable();
            $table->decimal('return_collected_amount', 12, 2)->default(0);
            $table->timestamp('pickup_at')->nullable();
            $table->timestamp('return_at')->nullable();
            $table->timestamp('no_show_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', fn (Blueprint $table) => $table->dropColumn([
            'rental_paid_amount', 'rental_balance_paid_at', 'return_collected_amount',
            'pickup_at', 'return_at', 'no_show_at',
        ]));
    }
};
