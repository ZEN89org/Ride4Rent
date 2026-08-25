<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'first_name')) {
                $table->string('first_name', 100)->nullable()->after('id');
            }

            if (! Schema::hasColumn('users', 'middle_name')) {
                $table->string('middle_name', 100)->nullable()->after('first_name');
            }

            if (! Schema::hasColumn('users', 'last_name')) {
                $table->string('last_name', 100)->nullable()->after('middle_name');
            }

            if (! Schema::hasColumn('users', 'suffix')) {
                $table->string('suffix', 20)->nullable()->after('last_name');
            }

            if (! Schema::hasColumn('users', 'date_of_birth')) {
                $table->date('date_of_birth')->nullable()->after('suffix');
            }

            if (! Schema::hasColumn('users', 'sex')) {
                $table->string('sex', 20)->nullable()->after('date_of_birth');
            }

            if (! Schema::hasColumn('users', 'mobile_number')) {
                $table->string('mobile_number', 20)->nullable()->after('email');
            }

            if (! Schema::hasColumn('users', 'account_status')) {
                $table->string('account_status')->default('active')->after('role');
            }

            if (! Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('account_status');
            }
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
