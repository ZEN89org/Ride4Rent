<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_renter_registration_uses_the_customer_role_and_current_user_fields(): void
    {
        $response = $this->postJson('/api/v1/register', [
            'first_name' => 'Rina',
            'last_name' => 'Santos',
            'date_of_birth' => '1995-04-12',
            'sex' => 'Female',
            'email' => 'rina@example.com',
            'mobile_number' => '09171234567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.user.role', 'customer')
            ->assertJsonPath('data.user.mobile_number', '09171234567')
            ->assertJsonMissingPath('data.user.phone_number')
            ->assertJsonMissingPath('data.user.profile_photo');

        $this->assertDatabaseHas('users', [
            'email' => 'rina@example.com',
            'role' => 'customer',
        ]);
    }

    public function test_authenticated_user_endpoint_returns_the_current_user_contract(): void
    {
        $registration = $this->postJson('/api/v1/register', [
            'first_name' => 'Marco',
            'last_name' => 'Reyes',
            'date_of_birth' => '1992-09-18',
            'sex' => 'Male',
            'email' => 'marco@example.com',
            'mobile_number' => '09179876543',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $token = $registration->json('data.token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/user')
            ->assertOk()
            ->assertJsonPath('data.role', 'customer')
            ->assertJsonPath('data.mobile_number', '09179876543')
            ->assertJsonMissingPath('data.last_login');
    }

    public function test_operator_registration_persists_the_current_profile_document_fields(): void
    {
        $response = $this->post('/api/v1/operator/register', [
            'first_name' => 'Omar',
            'last_name' => 'Cruz',
            'date_of_birth' => '1988-02-20',
            'sex' => 'Male',
            'email' => 'omar@example.com',
            'business_name' => 'Cruz Car Rentals',
            'business_email' => 'business@example.com',
            'business_contact_number' => '09175551234',
            'street_address' => '12 Main Street',
            'barangay' => 'San Isidro',
            'municipality' => 'Cebu City',
            'accepted_payment_methods' => json_encode(['cash', 'gcash']),
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('operator_profiles', [
            'business_name' => 'Cruz Car Rentals',
            'barangay' => 'San Isidro',
            'government_id_front' => null,
            'government_id_back' => null,
            'business_permit_front' => null,
            'business_permit_back' => null,
        ]);
    }

    public function test_only_admins_can_review_pending_operators(): void
    {
        $operator = $this->createOperator('pending@example.com');
        $customer = $this->createUser('customer@example.com', 'customer');

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/v1/admin/operators/pending')
            ->assertForbidden();

        $admin = $this->createUser('admin@example.com', 'admin');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/operators/pending')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user.email', $operator->email);
    }

    public function test_admin_can_approve_and_reject_operator_accounts(): void
    {
        $approvedOperator = $this->createOperator('approved@example.com');
        $rejectedOperator = $this->createOperator('rejected@example.com');
        $admin = $this->createUser('reviewer@example.com', 'admin');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/admin/operators/{$approvedOperator->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.user.account_status', 'active');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/admin/operators/{$rejectedOperator->id}/reject", [
                'rejection_reason' => 'Please provide a clearer business permit.',
            ])
            ->assertOk()
            ->assertJsonPath('data.user.account_status', 'rejected')
            ->assertJsonPath(
                'data.operator_profile.rejection_reason',
                'Please provide a clearer business permit.'
            );

        $this->assertDatabaseHas('users', [
            'id' => $approvedOperator->id,
            'account_status' => 'active',
        ]);
        $this->assertDatabaseHas('operator_profiles', [
            'user_id' => $rejectedOperator->id,
            'rejection_reason' => 'Please provide a clearer business permit.',
        ]);
    }

    public function test_active_operator_can_list_a_vehicle_for_renters(): void
    {
        $this->seedVehicleLookups();
        $operator = $this->createOperator('vehicle-owner@example.com');
        $operator->update(['account_status' => 'active']);

        $response = $this->actingAs($operator, 'sanctum')
            ->postJson('/api/v1/operator/vehicles', [
                'name' => 'City sedan',
                'model' => 'Vios',
                'year_model' => 2024,
                'plate_number' => 'ABC-1234',
                'vehicle_type_id' => 1,
                'brand_id' => 1,
                'transmission_type_id' => 1,
                'fuel_type_id' => 1,
                'seating_capacity' => 5,
                'number_of_doors' => 4,
                'mileage' => 12000,
                'daily_rate' => 1500,
                'reservation_fee' => 500,
                'min_driver_age' => 21,
                'min_driving_experience' => 1,
                'pickup_latitude' => 10.3157,
                'pickup_longitude' => 123.8854,
                'description' => 'Clean and comfortable city car.',
            ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.name', 'City sedan')
            ->assertJsonPath('data.brand', 'Toyota')
            ->assertJsonPath('data.pickup_address', '1 Test Street, Test Barangay, Test City')
            ->assertJsonPath('data.operator.business_name', 'Test Rentals');

        $this->getJson('/api/v1/vehicles')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'City sedan')
            ->assertJsonPath('data.0.is_available', true);

        $this->getJson('/api/v1/vehicles?latitude=10.3157&longitude=123.8854&radius=1')
            ->assertOk()
            ->assertJsonPath('data.0.distance_km', 0);
    }

    public function test_pending_operator_cannot_list_a_vehicle(): void
    {
        $operator = $this->createOperator('pending-vehicle-owner@example.com');

        $this->actingAs($operator, 'sanctum')
            ->postJson('/api/v1/operator/vehicles', [
                'name' => 'Unavailable Car',
                'vehicle_type' => 'Sedan',
                'price_per_day' => 1000,
                'location' => 'Cebu City',
            ])
            ->assertForbidden();
    }

    private function createUser(string $email, string $role): User
    {
        return User::create([
            'first_name' => 'Test',
            'last_name' => 'User',
            'date_of_birth' => '1990-01-01',
            'sex' => 'Prefer not to say',
            'email' => $email,
            'mobile_number' => '09170000000',
            'password' => Hash::make('password123'),
            'role' => $role,
            'account_status' => $role === 'operator' ? 'pending' : 'active',
        ]);
    }

    private function seedVehicleLookups(): void
    {
        DB::table('vehicle_types')->insertOrIgnore(['name' => 'Sedan', 'slug' => 'sedan', 'is_active' => true]);
        DB::table('vehicle_brands')->insertOrIgnore(['name' => 'Toyota', 'slug' => 'toyota', 'is_active' => true]);
        DB::table('transmission_types')->insertOrIgnore(['name' => 'Automatic', 'slug' => 'automatic', 'is_active' => true]);
        DB::table('fuel_types')->insertOrIgnore(['name' => 'Gasoline', 'slug' => 'gasoline', 'is_active' => true]);
    }

    private function createOperator(string $email): User
    {
        $operator = $this->createUser($email, 'operator');

        $operator->operatorProfile()->create([
            'business_name' => 'Test Rentals',
            'business_email' => "business-{$email}",
            'business_contact_number' => '09171111111',
            'street_address' => '1 Test Street',
            'barangay' => 'Test Barangay',
            'municipality' => 'Test City',
        ]);

        return $operator;
    }
}
