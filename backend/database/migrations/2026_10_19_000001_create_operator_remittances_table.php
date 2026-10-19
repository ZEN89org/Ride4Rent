<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operator_remittances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('operator_id')->constrained('users')->cascadeOnDelete();
            $table->string('billing_month', 7); // Format: 'YYYY-MM'
            $table->decimal('gross_revenue', 12, 2)->default(0);
            $table->decimal('commission_rate', 5, 2)->default(10.00);
            $table->decimal('commission_due', 12, 2)->default(0);
            $table->unsignedInteger('completed_trips_count')->default(0);
            $table->string('payment_method')->nullable(); // gcash, maya, bank_transfer, cash
            $table->string('payment_reference')->nullable();
            $table->string('receipt_image')->nullable();
            $table->string('status')->default('pending'); // pending, submitted, verified, frozen, overdue
            $table->timestamp('grace_period_expires_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('admin_notes')->nullable();
            $table->timestamps();

            $table->unique(['operator_id', 'billing_month'], 'operator_monthly_remittance_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operator_remittances');
    }
};
