<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('messages', fn (Blueprint $table) => $table->string('receipt_event_key', 64)->nullable()->unique());
        Schema::table('bookings', function (Blueprint $table) {
            $table->text('extension_decision_note')->nullable();
            $table->text('extension_payment_review_note')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropUnique(['receipt_event_key']);
            $table->dropColumn('receipt_event_key');
        });
        Schema::table('bookings', fn (Blueprint $table) => $table->dropColumn(['extension_decision_note', 'extension_payment_review_note']));
    }
};
