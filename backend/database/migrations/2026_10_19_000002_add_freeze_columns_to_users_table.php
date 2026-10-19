<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_frozen')->default(false)->after('account_status')->index();
            $table->timestamp('frozen_at')->nullable()->after('is_frozen');
            $table->string('freeze_reason', 500)->nullable()->after('frozen_at');
        });

        // Migrate any previous suspended operators to active with is_frozen = true
        DB::table('users')
            ->where('account_status', 'suspended')
            ->where('role', 'operator')
            ->update([
                'account_status' => 'active',
                'is_frozen' => true,
                'frozen_at' => now(),
                'freeze_reason' => 'Automated migration: Unsettled platform commission statement',
            ]);

        // Restore any other suspended users to active
        DB::table('users')
            ->where('account_status', 'suspended')
            ->update([
                'account_status' => 'active',
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_frozen', 'frozen_at', 'freeze_reason']);
        });
    }
};
