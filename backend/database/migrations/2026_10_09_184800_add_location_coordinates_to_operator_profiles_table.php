<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('operator_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('operator_profiles', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable()->after('municipality');
            }
            if (!Schema::hasColumn('operator_profiles', 'longitude')) {
                $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            }
        });
    }

    public function down(): void
    {
        Schema::table('operator_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('operator_profiles', 'latitude')) {
                $table->dropColumn('latitude');
            }
            if (Schema::hasColumn('operator_profiles', 'longitude')) {
                $table->dropColumn('longitude');
            }
        });
    }
};
