<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->text('extension_notes')->nullable();
            $table->timestamp('extension_paid_at')->nullable();
            $table->decimal('extension_paid_total', 10, 2)->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('bookings', fn (Blueprint $table) => $table->dropColumn(['extension_notes', 'extension_paid_at', 'extension_paid_total']));
    }
};
