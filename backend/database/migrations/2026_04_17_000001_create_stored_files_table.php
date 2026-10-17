<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stored_files')) {
            Schema::create('stored_files', function (Blueprint $table) {
                $table->id();
                $table->string('path')->unique();
                $table->string('mime_type')->nullable();
                $table->longText('content_base64');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('stored_files');
    }
};
