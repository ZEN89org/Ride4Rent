<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE users
            DROP CONSTRAINT IF EXISTS users_sex_check
        ");

        DB::statement("
            ALTER TABLE users
            ADD CONSTRAINT users_sex_check
            CHECK (sex IN ('Male', 'Female', 'Prefer not to say'))
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE users
            DROP CONSTRAINT IF EXISTS users_sex_check
        ");

        DB::statement("
            ALTER TABLE users
            ADD CONSTRAINT users_sex_check
            CHECK (sex IN ('Male', 'Female'))
        ");
    }
};
