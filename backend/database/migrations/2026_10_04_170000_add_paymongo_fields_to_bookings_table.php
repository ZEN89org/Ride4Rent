<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'paymongo_checkout_id')) {
                $table->string('paymongo_checkout_id')->nullable()->after('payment_reference');
            }
            if (!Schema::hasColumn('bookings', 'paymongo_payment_intent_id')) {
                $table->string('paymongo_payment_intent_id')->nullable()->after('paymongo_checkout_id');
            }
            if (!Schema::hasColumn('bookings', 'paymongo_checkout_url')) {
                $table->text('paymongo_checkout_url')->nullable()->after('paymongo_payment_intent_id');
            }
            if (!Schema::hasColumn('bookings', 'paid_at')) {
                $table->timestamp('paid_at')->nullable()->after('paymongo_checkout_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'paymongo_checkout_id',
                'paymongo_payment_intent_id',
                'paymongo_checkout_url',
                'paid_at',
            ]);
        });
    }
};
