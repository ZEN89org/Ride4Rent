<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->timestamp('booked_return_at')->nullable();
            $table->string('early_return_status', 20)->nullable();
            $table->timestamp('early_return_requested_for')->nullable();
            $table->timestamp('early_return_requested_at')->nullable();
            $table->text('early_return_reason')->nullable();
            $table->timestamp('early_return_reviewed_at')->nullable();
            $table->text('early_return_response')->nullable();
            $table->boolean('returned_early')->default(false);
            $table->decimal('early_return_refund_amount', 12, 2)->nullable();
            $table->string('early_return_refund_method', 30)->nullable();
            $table->string('early_return_refund_reference')->nullable();
            $table->text('early_return_refund_reason')->nullable();
            $table->timestamp('early_return_refund_recorded_at')->nullable();
            $table->timestamp('early_return_refund_received_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bookings', fn (Blueprint $table) => $table->dropColumn([
            'booked_return_at', 'early_return_status', 'early_return_requested_for', 'early_return_requested_at',
            'early_return_reason', 'early_return_reviewed_at', 'early_return_response', 'returned_early',
            'early_return_refund_amount', 'early_return_refund_method', 'early_return_refund_reference',
            'early_return_refund_reason', 'early_return_refund_recorded_at', 'early_return_refund_received_at',
        ]));
    }
};
