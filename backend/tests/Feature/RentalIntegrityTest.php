<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\BookingExpirationService;
use App\Services\DemandPricingService;
use App\Services\PrivateDocumentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RentalIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private User $renter;

    private User $operator;

    private Vehicle $vehicle;

    private Booking $booking;

    protected function setUp(): void
    {
        parent::setUp();
        $this->renter = $this->user('customer');
        $this->operator = $this->user('operator');
        $lookups = [];
        foreach (['vehicle_types', 'vehicle_brands', 'transmission_types', 'fuel_types'] as $table) {
            $lookups[$table] = DB::table($table)->insertGetId(['name' => 'Test', 'slug' => 'test', 'is_active' => true]);
        }
        $this->vehicle = Vehicle::create([
            'operator_id' => $this->operator->id, 'name' => 'Test Bike', 'model' => 'Test',
            'year_model' => 2025, 'plate_number' => 'TEST123',
            'vehicle_type_id' => $lookups['vehicle_types'], 'brand_id' => $lookups['vehicle_brands'],
            'transmission_type_id' => $lookups['transmission_types'], 'fuel_type_id' => $lookups['fuel_types'],
            'daily_rate' => 600, 'reservation_fee' => 200, 'quantity' => 1, 'available_units' => 1,
            'availability_status' => 'available', 'is_dynamic_pricing_enabled' => false,
        ]);
        $this->booking = Booking::create([
            'renter_id' => $this->renter->id, 'operator_id' => $this->operator->id, 'vehicle_id' => $this->vehicle->id,
            'start_date' => today(), 'end_date' => today()->addDays(2), 'total_days' => 2,
            'daily_rate' => 600, 'reservation_fee' => 200, 'total_price' => 1200,
            'status' => 'pending_verification', 'payment_status' => 'paid_reservation',
        ]);
    }

    public function test_operator_cannot_move_pickup_outside_oriental_mindoro(): void
    {
        $this->actingAs($this->operator, 'sanctum')->putJson('/api/v1/operator/vehicles/'.$this->vehicle->id, [
            'pickup_latitude' => 12.352, 'pickup_longitude' => 121.067,
        ])->assertUnprocessable()->assertJsonValidationErrors('pickup_latitude');
        $this->assertNull($this->vehicle->fresh()->pickup_latitude);
    }

    private function user(string $role): User
    {
        return User::create([
            'first_name' => 'Test', 'last_name' => 'Person', 'email' => $role.'@example.com',
            'date_of_birth' => '1990-01-01', 'sex' => 'Male', 'mobile_number' => '09171234567',
            'password' => 'password123', 'role' => $role, 'account_status' => 'active',
            'drivers_license_front' => 'driver_licenses/front.jpg', 'drivers_license_back' => 'driver_licenses/back.jpg',
            'license_verification_status' => 'approved',
        ]);
    }

    public function test_renter_cannot_approve_or_complete_their_booking(): void
    {
        foreach (['approved', 'completed', 'no_show', 'trip_in_progress'] as $status) {
            $this->actingAs($this->renter, 'sanctum')->patchJson('/api/v1/bookings/'.$this->booking->id.'/status', ['status' => $status])->assertForbidden();
            $this->assertSame('pending_verification', $this->booking->fresh()->status);
        }
    }

    public function test_operator_approval_preserves_license_verification(): void
    {
        $this->renter->update(['license_verification_status' => 'pending']);
        $this->actingAs($this->operator, 'sanctum')->postJson('/api/v1/bookings/'.$this->booking->id.'/confirm-payment')->assertUnprocessable();
        $this->assertSame('pending', $this->renter->fresh()->license_verification_status);
        $this->assertSame('pending_verification', $this->booking->fresh()->status);
    }

    public function test_completed_booking_cannot_be_reapproved(): void
    {
        $this->booking->update(['status' => 'completed']);
        $this->actingAs($this->operator, 'sanctum')->postJson('/api/v1/bookings/'.$this->booking->id.'/confirm-payment')->assertUnprocessable();
        $this->assertSame('completed', $this->booking->fresh()->status);
    }

    public function test_return_inspection_updates_maintenance_odometer(): void
    {
        $this->booking->update(['status' => 'trip_in_progress', 'start_mileage' => 1000]);
        $this->actingAs($this->operator, 'sanctum')->postJson('/api/v1/bookings/'.$this->booking->id.'/complete-trip', ['end_mileage' => 1200, 'end_fuel_level' => 90])->assertOk();
        $this->assertSame(1200, $this->vehicle->fresh()->current_odometer);
        $this->assertSame('completed', $this->booking->fresh()->status);
    }

    public function test_return_mileage_cannot_decrease(): void
    {
        $this->booking->update(['status' => 'trip_in_progress', 'start_mileage' => 1000]);
        $this->actingAs($this->operator, 'sanctum')->postJson('/api/v1/bookings/'.$this->booking->id.'/complete-trip', ['end_mileage' => 900, 'end_fuel_level' => 90])->assertUnprocessable();
        $this->assertSame('trip_in_progress', $this->booking->fresh()->status);
    }

    public function test_active_trip_consumes_inventory_during_payment_submission(): void
    {
        $other = $this->renter->replicate();
        $other->email = 'other@example.com';
        $other->save();
        $this->booking->update(['status' => 'trip_in_progress']);
        $competing = $this->booking->replicate();
        $competing->renter_id = $other->id;
        $competing->status = 'pending_payment';
        $competing->payment_status = 'unpaid';
        $competing->save();
        $this->actingAs($other, 'sanctum')->postJson('/api/v1/bookings/'.$competing->id.'/settle-payment', ['payment_method' => 'cash'])->assertUnprocessable();
        $this->assertSame('pending_payment', $competing->fresh()->status);
    }

    public function test_pending_extension_cannot_skip_host_approval(): void
    {
        $this->booking->update(['extension_status' => 'pending']);
        $this->actingAs($this->renter, 'sanctum')->postJson('/api/v1/bookings/'.$this->booking->id.'/settle-extension-payment', ['payment_method' => 'gcash', 'payment_reference' => '1234567890123'])->assertUnprocessable();
    }

    public function test_suspended_account_cannot_use_existing_token_or_login(): void
    {
        $token = $this->renter->createToken('test')->plainTextToken;
        $this->renter->update(['account_status' => 'suspended']);
        $this->withToken($token)->getJson('/api/v1/bookings')->assertForbidden();
        Auth::forgetGuards();
        $this->withHeader('Authorization', '')->postJson('/api/v1/login', ['email' => $this->renter->email, 'password' => 'password123'])->assertUnprocessable();
    }

    public function test_maintenance_setting_blocks_public_catalog_but_allows_admin(): void
    {
        PlatformSetting::set('maintenance_mode', '1');
        $this->getJson('/api/v1/vehicles')->assertServiceUnavailable();
        $this->actingAs($this->user('admin'), 'sanctum')->getJson('/api/v1/vehicles')->assertOk();
    }

    public function test_hidden_reviews_are_not_public(): void
    {
        $this->booking->update(['status' => 'completed', 'rating' => 1, 'review' => 'Hidden review']);
        DB::table('bookings')->where('id', $this->booking->id)->update(['is_review_hidden' => true]);
        $this->getJson('/api/v1/vehicles/'.$this->vehicle->id)->assertOk()->assertJsonCount(0, 'data.reviews');
    }

    public function test_private_documents_require_an_unexpired_signature(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('driver_licenses/test.jpg', 'private document');
        $this->get('/storage/driver_licenses/test.jpg')->assertForbidden();
        $this->get('/documents/driver_licenses/test.jpg')->assertForbidden();
        $url = PrivateDocumentService::url('driver_licenses/test.jpg');
        $this->get($url)->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        $this->travel(16)->minutes();
        $this->get($url)->assertForbidden();
    }

    public function test_static_price_uses_daily_rate(): void
    {
        $this->assertSame(600.0, DemandPricingService::calculateVehicleDemand($this->vehicle)['effective_price']);
    }

    public function test_extension_changes_dates_only_after_host_confirms_receipt(): void
    {
        $this->booking->update([
            'status' => 'trip_in_progress', 'extension_status' => 'payment_required',
            'extension_days' => 1, 'extension_price' => 600, 'extension_end_date' => today()->addDays(3),
        ]);
        $originalEnd = $this->booking->end_date->toDateString();
        $this->actingAs($this->renter, 'sanctum')->postJson('/api/v1/bookings/'.$this->booking->id.'/settle-extension-payment', ['payment_method' => 'cash'])->assertOk();
        $this->assertSame($originalEnd, $this->booking->fresh()->end_date->toDateString());
        $this->assertSame('pending_verification', $this->booking->fresh()->extension_status);
        $this->actingAs($this->renter, 'sanctum')->postJson('/api/v1/bookings/'.$this->booking->id.'/confirm-extension-payment')->assertNotFound();
        $this->actingAs($this->operator, 'sanctum')->postJson('/api/v1/bookings/'.$this->booking->id.'/confirm-extension-payment')->assertOk();
        $this->assertSame(today()->addDays(3)->toDateString(), $this->booking->fresh()->end_date->toDateString());
        $this->assertSame(1800.0, (float) $this->booking->fresh()->total_price);
        $this->assertSame(600.0, (float) $this->booking->fresh()->extension_paid_total);
        $this->actingAs($this->operator, 'sanctum')->postJson('/api/v1/bookings/'.$this->booking->id.'/confirm-extension-payment')->assertUnprocessable();
    }

    public function test_booking_price_matches_the_displayed_dynamic_rate(): void
    {
        $this->booking->delete();
        $this->vehicle->update(['is_dynamic_pricing_enabled' => true]);
        $price = DemandPricingService::calculateVehicleDemand($this->vehicle->fresh())['effective_price'];
        $response = $this->actingAs($this->renter, 'sanctum')->postJson('/api/v1/bookings', [
            'vehicle_id' => $this->vehicle->id, 'start_date' => today()->toDateString(), 'end_date' => today()->addDays(2)->toDateString(),
        ])->assertCreated();
        $this->assertSame((float) $price, (float) $response->json('data.daily_rate'));
        $this->assertSame((float) $price * 2, (float) $response->json('data.total_price'));
    }

    public function test_admin_advance_limit_and_kyc_are_enforced(): void
    {
        $this->booking->delete();
        $this->renter->update(['license_verification_status' => 'pending']);
        $payload = ['vehicle_id' => $this->vehicle->id, 'start_date' => today()->addDays(3)->toDateString(), 'end_date' => today()->addDays(4)->toDateString()];
        $this->actingAs($this->renter, 'sanctum')->postJson('/api/v1/bookings', $payload)->assertUnprocessable()->assertJsonPath('code', 'LICENSE_PENDING');
        PlatformSetting::set('require_kyc_for_booking', '0');
        PlatformSetting::set('max_advance_days', '2');
        $this->actingAs($this->renter, 'sanctum')->postJson('/api/v1/bookings', $payload)->assertUnprocessable();
        PlatformSetting::set('max_advance_days', '5');
        $this->actingAs($this->renter, 'sanctum')->postJson('/api/v1/bookings', $payload)->assertCreated();
    }

    public function test_expiration_is_idempotent_and_releases_inventory(): void
    {
        $this->booking->update(['expires_at' => now()->subMinute()]);
        $this->vehicle->update(['available_units' => 0, 'availability_status' => 'unavailable']);
        $service = app(BookingExpirationService::class);
        $service->expire();
        $service->expire();
        $this->assertSame('refund_pending', $this->booking->fresh()->payment_status);
        $this->assertSame(1, (int) $this->vehicle->fresh()->available_units);
        $this->assertDatabaseCount('notifications', 2);
    }

    public function test_review_moderation_updates_public_rating(): void
    {
        $this->booking->update(['status' => 'completed', 'rating' => 1, 'review' => 'Moderated review']);
        $this->actingAs($this->user('admin'))->post('/admin/reviews/'.$this->booking->id.'/toggle-visibility')->assertRedirect();
        $this->assertSame(0, (int) $this->vehicle->fresh()->rating_count);
        $this->getJson('/api/v1/vehicles/'.$this->vehicle->id)->assertJsonCount(0, 'data.reviews');
    }
}
