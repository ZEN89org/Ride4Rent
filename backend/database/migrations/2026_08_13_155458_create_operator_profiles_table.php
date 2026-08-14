<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operator_profiles', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->unique()
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('business_name');
            $table->string('business_email');
            $table->string('business_contact_number');

            $table->string('street_address');
            $table->string('barangay');
            $table->string('municipality');

            $table->string('government_id')->nullable();
            $table->string('business_permit')->nullable();
            $table->string('dti_sec_registration')->nullable();

            $table->json('accepted_payment_methods')->nullable();
            $table->string('account_name')->nullable();
            $table->string('account_number')->nullable();
            $table->string('qr_code')->nullable();

            $table->text('rejection_reason')->nullable();
            $table->timestamp('reviewed_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operator_profiles');
    }
};
