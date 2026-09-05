<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $motorcycleBodyTypes = [
            'Scooter / Automatic',
            'Underbone / Moped',
            'Standard / Naked',
            'Cruiser',
            'Sport Bike',
            'Dual-Sport / Enduro',
            'Touring / Adventure',
            'Cafe Racer / Classic',
            'Maxi Scooter',
            'Electric Motorcycle',
        ];

        foreach ($motorcycleBodyTypes as $name) {
            DB::table('body_types')->insertOrIgnore([
                'name' => $name,
                'slug' => str($name)->slug(),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $motorcycleBrands = [
            'Yamaha',
            'Kawasaki',
            'Kymco',
            'Vespa',
            'Ducati',
            'BMW Motorrad',
            'Royal Enfield',
            'Harley-Davidson',
            'TVS',
            'Bajaj',
            'SYM',
            'Benelli',
            'CFMoto',
        ];

        foreach ($motorcycleBrands as $brand) {
            DB::table('vehicle_brands')->insertOrIgnore([
                'name' => $brand,
                'slug' => str($brand)->slug(),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
