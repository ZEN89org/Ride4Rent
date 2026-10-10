<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('vehicles')) {
            return;
        }

        foreach ([
            'vehicle_types' => ['icon' => true],
            'vehicle_brands' => ['icon' => false],
            'body_types' => ['icon' => false],
            'transmission_types' => ['icon' => false],
            'fuel_types' => ['icon' => false],
        ] as $tableName => $options) {
            if (! Schema::hasTable($tableName)) {
                Schema::create($tableName, function (Blueprint $table) use ($options) {
                    $table->id();
                    $table->string('name');
                    $table->string('slug')->unique();
                    if ($options['icon']) {
                        $table->string('icon')->nullable();
                    }
                    $table->boolean('is_active')->default(true);
                    $table->timestamps();
                });
            }
        }

        foreach ([
            'vehicle_types' => ['Sedan', 'SUV', 'Van', 'Hatchback', 'Pickup Truck', 'MPV', 'Motorcycle'],
            'vehicle_brands' => ['Toyota', 'Honda', 'Mitsubishi', 'Nissan', 'Ford', 'Hyundai', 'Suzuki', 'Isuzu', 'Kia'],
            'body_types' => ['4-Door Sedan', 'Subcompact SUV / Crossover', 'Mid-Size SUV', 'Passenger Van', 'Double Cab Pickup', 'Compact Hatchback', 'Multi-Purpose Vehicle (MPV)'],
            'transmission_types' => ['Automatic', 'Manual', 'CVT'],
            'fuel_types' => ['Gasoline', 'Diesel', 'Hybrid', 'Electric'],
        ] as $tableName => $names) {
            foreach ($names as $name) {
                DB::table($tableName)->insertOrIgnore([
                    'name' => $name,
                    'slug' => str($name)->slug(),
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('operator_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->foreignId('vehicle_type_id')->constrained('vehicle_types');
            $table->foreignId('brand_id')->constrained('vehicle_brands');
            $table->string('model');
            $table->unsignedInteger('year_model');
            $table->string('plate_number');
            $table->foreignId('body_type_id')->nullable()->constrained('body_types');
            $table->foreignId('transmission_type_id')->constrained('transmission_types');
            $table->foreignId('fuel_type_id')->constrained('fuel_types');
            $table->unsignedInteger('seating_capacity')->default(5);
            $table->unsignedInteger('number_of_doors')->default(4);
            $table->unsignedInteger('mileage')->default(0);
            $table->string('interior_color')->nullable();
            $table->string('exterior_color')->nullable();
            $table->string('availability_status')->default('available');
            $table->date('available_from')->nullable();
            $table->date('available_until')->nullable();
            $table->decimal('daily_rate', 10, 2);
            $table->decimal('reservation_fee', 10, 2)->default(500);
            $table->text('description')->nullable();
            $table->string('cover_photo')->nullable();
            $table->unsignedInteger('min_driver_age')->default(21);
            $table->unsignedInteger('min_driving_experience')->default(1);
            $table->text('fuel_policy')->nullable();
            $table->text('late_return_policy')->nullable();
            $table->text('cancellation_policy')->nullable();
            $table->text('smoking_policy')->nullable();
            $table->text('pet_policy')->nullable();
            $table->text('additional_driver_policy')->nullable();
            $table->text('other_policies')->nullable();
            $table->decimal('rating', 3, 2)->default(5);
            $table->unsignedInteger('rating_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->string('pickup_address')->nullable();
            $table->decimal('pickup_latitude', 10, 7)->nullable();
            $table->decimal('pickup_longitude', 10, 7)->nullable();
            $table->timestamps();
        });

        if (! Schema::hasTable('vehicle_images')) {
            Schema::create('vehicle_images', function (Blueprint $table) {
                $table->id();
                $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
                $table->string('image_path');
                $table->boolean('is_cover')->default(false);
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_images');
        Schema::dropIfExists('vehicles');
    }
};
