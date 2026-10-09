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
        Schema::create('vehicle_maintenances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained('vehicles')->onDelete('cascade');
            $table->foreignId('operator_id')->constrained('users')->onDelete('cascade');
            $table->string('service_type'); // e.g. Oil Change, Brake Inspection, Tire Rotation, General Tune-up, Battery Replacement
            $table->integer('mileage_at_service');
            $table->decimal('cost', 10, 2)->default(0.00);
            $table->date('service_date');
            $table->integer('next_service_mileage')->nullable();
            $table->string('status')->default('completed'); // completed, scheduled, recommended
            $table->string('performed_by')->nullable(); // shop name or technician
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicle_maintenances');
    }
};
