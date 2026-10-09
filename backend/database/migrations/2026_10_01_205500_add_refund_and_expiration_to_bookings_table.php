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
            if (!Schema::hasColumn('bookings', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('status');
            }
            if (!Schema::hasColumn('bookings', 'renter_refund_method')) {
                $table->string('renter_refund_method')->nullable()->after('payment_reference');
            }
            if (!Schema::hasColumn('bookings', 'renter_refund_account_name')) {
                $table->string('renter_refund_account_name')->nullable()->after('renter_refund_method');
            }
            if (!Schema::hasColumn('bookings', 'renter_refund_account_number')) {
                $table->string('renter_refund_account_number')->nullable()->after('renter_refund_account_name');
            }
            if (!Schema::hasColumn('bookings', 'refund_amount')) {
                $table->decimal('refund_amount', 10, 2)->default(0)->after('renter_refund_account_number');
            }
            if (!Schema::hasColumn('bookings', 'refund_status')) {
                $table->string('refund_status')->nullable()->after('refund_amount'); // pending, refunded, rejected
            }
            if (!Schema::hasColumn('bookings', 'refund_reference')) {
                $table->string('refund_reference')->nullable()->after('refund_status');
            }
            if (!Schema::hasColumn('bookings', 'refund_notes')) {
                $table->text('refund_notes')->nullable()->after('refund_reference');
            }
            if (!Schema::hasColumn('bookings', 'refunded_at')) {
                $table->timestamp('refunded_at')->nullable()->after('refund_notes');
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
                'expires_at',
                'renter_refund_method',
                'renter_refund_account_name',
                'renter_refund_account_number',
                'refund_amount',
                'refund_status',
                'refund_reference',
                'refund_notes',
                'refunded_at',
            ]);
        });
    }
};
