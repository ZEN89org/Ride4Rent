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
        // 1. Immutable Administrative Audit Logs
        Schema::create('admin_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('admin_name')->nullable();
            $table->string('action'); // e.g. license_approved, license_rejected, operator_approved, status_updated, announcement_broadcast, settings_updated, review_moderated
            $table->string('target_type')->nullable(); // User, Booking, System
            $table->unsignedBigInteger('target_id')->nullable();
            $table->string('target_name')->nullable();
            $table->text('details')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamps();
        });

        // 2. Platform-wide Operational Settings
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('group')->default('general');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        // 3. Admin Intervention Fields on Bookings
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'admin_memo')) {
                $table->text('admin_memo')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('bookings', 'is_review_hidden')) {
                $table->boolean('is_review_hidden')->default(false)->after('review');
            }
            if (!Schema::hasColumn('bookings', 'review_moderation_note')) {
                $table->string('review_moderation_note')->nullable()->after('is_review_hidden');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['admin_memo', 'is_review_hidden', 'review_moderation_note']);
        });

        Schema::dropIfExists('platform_settings');
        Schema::dropIfExists('admin_audit_logs');
    }
};
