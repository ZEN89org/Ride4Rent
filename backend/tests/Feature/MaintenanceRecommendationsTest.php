<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MaintenanceRecommendationsTest extends TestCase
{
    use RefreshDatabase;

    private function operator(string $email = 'operator@test.local'): User
    {
        return User::create(['first_name' => 'Test', 'last_name' => 'Operator', 'email' => $email, 'password' => 'password123', 'date_of_birth' => '1990-01-01', 'sex' => 'Male', 'role' => 'operator', 'account_status' => 'active']);
    }

    private function vehicle(User $operator): Vehicle
    {
        $ids = [];
        foreach (['vehicle_types', 'vehicle_brands', 'transmission_types', 'fuel_types'] as $table) {
            $ids[$table] = DB::table($table)->insertGetId(['name' => 'Test', 'slug' => 'test', 'is_active' => true]);
        }
        return Vehicle::create(['operator_id' => $operator->id, 'name' => 'Test Vehicle', 'model' => 'Test', 'year_model' => 2025, 'plate_number' => 'TEST123',
            'vehicle_type_id' => $ids['vehicle_types'], 'brand_id' => $ids['vehicle_brands'], 'transmission_type_id' => $ids['transmission_types'], 'fuel_type_id' => $ids['fuel_types'],
            'daily_rate' => 1000, 'quantity' => 1, 'available_units' => 1, 'current_odometer' => 12000, 'last_service_odometer' => 10000, 'service_interval_km' => 2000]);
    }

    public function test_custom_interval_boundaries_and_unknown_baseline_are_honest(): void
    {
        $operator = $this->operator(); $vehicle = $this->vehicle($operator);
        $this->actingAs($operator, 'sanctum')->getJson('/api/v1/operator/maintenance')->assertOk()->assertJsonPath('data.0.health_status', 'overdue');
        $vehicle->update(['current_odometer' => 11800]);
        $this->getJson('/api/v1/operator/maintenance')->assertJsonPath('data.0.health_status', 'due_soon');
        $vehicle->update(['current_odometer' => 11799]);
        $this->getJson('/api/v1/operator/maintenance')->assertJsonPath('data.0.health_status', 'good')->assertJsonCount(1, 'data.0.recommendations');
        $vehicle->update(['last_service_odometer' => 0]);
        $this->getJson('/api/v1/operator/maintenance')->assertJsonPath('data.0.health_status', 'unknown');
    }

    public function test_other_services_do_not_reset_routine_countdown_and_old_records_do_not_rewind_it(): void
    {
        $operator = $this->operator(); $vehicle = $this->vehicle($operator);
        $this->actingAs($operator, 'sanctum');
        $data = ['vehicle_id' => $vehicle->id, 'service_type' => 'Tire Replacement', 'mileage_at_service' => 12000, 'service_date' => today()->toDateString()];
        $this->postJson('/api/v1/operator/maintenance', $data)->assertCreated();
        $this->assertSame(10000, $vehicle->fresh()->last_service_odometer);
        $data['service_type'] = 'Oil & Filter Change';
        $this->postJson('/api/v1/operator/maintenance', $data)->assertCreated();
        $this->assertSame(12000, $vehicle->fresh()->last_service_odometer);
        $data['mileage_at_service'] = 11000;
        $this->postJson('/api/v1/operator/maintenance', $data)->assertCreated();
        $this->assertSame(12000, $vehicle->fresh()->last_service_odometer);
        $this->assertSame(12000, $vehicle->fresh()->current_odometer);
    }

    public function test_schedule_validation_and_fleet_ownership(): void
    {
        $operator = $this->operator(); $vehicle = $this->vehicle($operator);
        $url = '/api/v1/operator/maintenance/'.$vehicle->id.'/schedule';
        $data = ['current_odometer' => 12500, 'last_service_odometer' => 12000, 'service_interval_km' => 3000];
        $this->actingAs($operator, 'sanctum')->putJson($url, $data)->assertOk();
        $this->putJson($url, [...$data, 'last_service_odometer' => 13000])->assertUnprocessable();
        $this->putJson($url, [...$data, 'service_interval_km' => 0])->assertUnprocessable();
        $this->putJson($url, [...$data, 'current_odometer' => 12000])->assertUnprocessable();
        $other = $this->operator('other@test.local');
        $this->actingAs($other, 'sanctum')->putJson($url, $data)->assertNotFound();
        $this->getJson('/api/v1/operator/maintenance')->assertJsonCount(0, 'data');
        $other->update(['role' => 'customer']);
        $this->getJson('/api/v1/operator/maintenance')->assertForbidden();
    }

    public function test_assistant_knows_specific_current_flows_without_an_external_model(): void
    {
        $knowledge = new \App\Services\AssistantKnowledge();
        $this->assertStringContainsString('Only routine', $knowledge->answer('maintenance recommendations'));
        $this->assertStringContainsString('calculated rate', $knowledge->answer('demand based pricing'));
        $this->assertStringContainsString('not approved or paid', $knowledge->answer('extension payment'));
        $this->assertStringContainsString('Face-to-face', $knowledge->answer('chat receipts'));
        $this->assertStringContainsString('renter’s phone', $knowledge->answer('GPS location'));
        $this->assertStringContainsString('Expo Go', $knowledge->answer('voice call'));
    }
}
