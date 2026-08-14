<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('operator_profiles', function (Blueprint $table) {
            $table->renameColumn(
                'government_id',
                'government_id_front'
            );

            $table->renameColumn(
                'business_permit',
                'business_permit_front'
            );

            $table->string('government_id_back')
                ->nullable()
                ->after('government_id_front');

            $table->string('business_permit_back')
                ->nullable()
                ->after('business_permit_front');
        });
    }

    public function down(): void
    {
        Schema::table('operator_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'government_id_back',
                'business_permit_back',
            ]);

            $table->renameColumn(
                'government_id_front',
                'government_id'
            );

            $table->renameColumn(
                'business_permit_front',
                'business_permit'
            );
        });
    }
};
