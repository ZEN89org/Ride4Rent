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
        Schema::table('users', function (Blueprint $table) {
            $table->string('license_verification_status')->default('unverified')->after('is_drivers_license_verified');
            // Statuses: 'unverified', 'pending', 'approved', 'rejected'
            $table->text('license_rejection_reason')->nullable()->after('license_verification_status');
            $table->timestamp('license_submitted_at')->nullable()->after('license_rejection_reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'license_verification_status',
                'license_rejection_reason',
                'license_submitted_at',
            ]);
        });
    }
};
