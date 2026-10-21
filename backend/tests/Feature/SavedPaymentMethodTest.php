<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavedPaymentMethodTest extends TestCase
{
    use RefreshDatabase;

    private function person(string $email, string $role = 'customer'): User
    {
        return User::create(['first_name' => 'Test', 'last_name' => 'Person', 'date_of_birth' => '1990-01-01',
            'sex' => 'Female', 'email' => $email, 'password' => 'password', 'role' => $role]);
    }

    public function test_saved_account_is_private_can_be_updated_and_removed(): void
    {
        $renter = $this->person('one@example.com');
        $other = $this->person('two@example.com');
        $url = '/api/v1/user/payment-method';
        $this->getJson($url)->assertUnauthorized();
        $this->actingAs($renter, 'sanctum')->putJson($url, [
            'account_name' => '  Maria   Santos ', 'account_number' => '+639171234567', 'user_id' => $other->id,
        ])->assertOk()->assertJsonPath('data.account_name', 'Maria Santos')->assertJsonPath('data.account_number', '09171234567');
        $this->assertDatabaseHas('user_payment_methods', ['user_id' => $renter->id, 'account_number' => '09171234567']);
        $this->actingAs($other, 'sanctum')->getJson($url)->assertOk()->assertJsonPath('data', null);
        $this->deleteJson($url)->assertOk();
        $this->assertDatabaseCount('user_payment_methods', 1);
        $this->actingAs($renter, 'sanctum')->putJson($url, ['account_name' => 'Maria Santos', 'account_number' => '09991234567'])->assertOk();
        $this->assertDatabaseCount('user_payment_methods', 1);
        $this->getJson($url)->assertOk()->assertJsonPath('data.account_number', '09991234567');
        $this->deleteJson($url)->assertOk();
        $this->assertDatabaseCount('user_payment_methods', 0);
    }

    public function test_invalid_details_and_operator_access_are_rejected(): void
    {
        $renter = $this->person('renter@example.com');
        $this->actingAs($renter, 'sanctum')->putJson('/api/v1/user/payment-method', [
            'account_name' => '1234', 'account_number' => '123456',
        ])->assertUnprocessable()->assertJsonValidationErrors(['account_name', 'account_number']);
        $operator = $this->person('operator@example.com', 'operator');
        $this->actingAs($operator, 'sanctum')->getJson('/api/v1/user/payment-method')->assertForbidden();
        $this->putJson('/api/v1/user/payment-method', ['account_name' => 'Test Person', 'account_number' => '09171234567'])->assertForbidden();
        $this->deleteJson('/api/v1/user/payment-method')->assertForbidden();
    }

    public function test_operator_profile_view_requires_relationship_and_returns_contact_details(): void
    {
        $renter = $this->person('renter@example.com');
        $renter->update(['mobile_number' => '09171234567', 'drivers_license_front' => 'driver_licenses/front.jpg', 'drivers_license_back' => 'driver_licenses/back.jpg']);
        $operator = $this->person('operator@example.com', 'operator');
        $url = "/api/v1/operator/renters/{$renter->id}";
        $this->actingAs($renter, 'sanctum')->getJson($url)->assertForbidden();
        $this->actingAs($operator, 'sanctum')->getJson($url)->assertNotFound();
        Message::create(['sender_id' => $renter->id, 'receiver_id' => $operator->id, 'message' => 'Hello']);
        $response = $this->getJson($url)->assertOk()->assertJsonPath('data.can_review_license', true)
            ->assertJsonPath('data.email', 'renter@example.com')->assertJsonPath('data.mobile_number', '09171234567')
            ->assertJsonStructure(['data' => ['drivers_license_front_url', 'drivers_license_back_url']])->assertJsonPath('data.date_of_birth', null)
            ->assertJsonMissingPath('data.password')->assertJsonMissingPath('data.drivers_license_front');
        $this->assertStringContainsString('signature=', $response->json('data.drivers_license_front_url'));
        $this->assertStringContainsString('signature=', $response->json('data.drivers_license_back_url'));
    }
}
