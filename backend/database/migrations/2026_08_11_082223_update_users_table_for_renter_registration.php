<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name', 100)
                ->nullable()
                ->after('id');

            $table->string('middle_name', 100)
                ->nullable()
                ->after('first_name');

            $table->string('last_name', 100)
                ->nullable()
                ->after('middle_name');

            $table->string('suffix', 20)
                ->nullable()
                ->after('last_name');

            $table->date('date_of_birth')
                ->nullable()
                ->after('suffix');

            $table->string('sex', 20)
                ->nullable()
                ->after('date_of_birth');

            $table->string('mobile_number', 20)
                ->nullable()
                ->after('email');

            $table->string('account_status')
                ->default('active')
                ->after('role');

            $table->timestamp('last_login_at')
                ->nullable()
                ->after('account_status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'first_name',
                'middle_name',
                'last_name',
                'suffix',
                'date_of_birth',
                'sex',
                'mobile_number',
                'account_status',
                'last_login_at',
            ]);
        });
    }
};
