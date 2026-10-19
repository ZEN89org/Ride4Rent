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

    public function test_verified_renter_can_replace_license_and_requires_new_review(): void
    {
        Storage::fake('local');
        $this->renter->update(['is_drivers_license_verified' => true, 'license_verification_status' => 'approved']);
        $this->actingAs($this->renter, 'sanctum')->post('/api/v1/user/license', [
            'front_image' => \Illuminate\Http\UploadedFile::fake()->image('front.jpg'),
            'back_image' => \Illuminate\Http\UploadedFile::fake()->image('back.jpg'),
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('data.license_verification_status', 'pending');
        $updated = $this->renter->fresh();
        $this->assertFalse((bool) $updated->is_drivers_license_verified);
        $this->assertNotSame('driver_licenses/front.jpg', $updated->drivers_license_front);
        $this->assertDatabaseHas('stored_files', ['path' => $updated->drivers_license_front]);
        $this->assertDatabaseHas('stored_files', ['path' => $updated->drivers_license_back]);
    }

    public function test_license_update_without_both_photos_preserves_verification(): void
    {
        $this->renter->update(['is_drivers_license_verified' => true, 'license_verification_status' => 'approved']);
        $this->actingAs($this->renter, 'sanctum')->postJson('/api/v1/user/license', [])
            ->assertUnprocessable()->assertJsonValidationErrors(['front_image', 'back_image']);
        $this->assertSame('approved', $this->renter->fresh()->license_verification_status);
    }

    public function test_operator_can_review_pending_license_when_approving_booking(): void
    {
        $this->renter->update(['is_drivers_license_verified' => false, 'license_verification_status' => 'pending']);
        $this->actingAs($this->operator, 'sanctum')->postJson('/api/v1/bookings/'.$this->booking->id.'/confirm-payment')->assertOk();
        $this->assertSame('approved', $this->renter->fresh()->license_verification_status);
    }

    public function test_operator_can_request_replacement_license_photos(): void
    {
        $this->actingAs($this->operator, 'sanctum')->patchJson('/api/v1/bookings/'.$this->booking->id.'/status', [
            'status' => 'rejected', 'license_rejected' => true, 'rejection_reason' => 'License photo is unreadable.',
        ])->assertOk();
        $this->assertSame('rejected', $this->renter->fresh()->license_verification_status);
        $this->assertDatabaseHas('notifications', ['user_id' => $this->renter->id, 'action_url' => '/driver-license', 'title' => 'New License Photos Required']);
    }

    public function test_fleet_returns_only_the_authenticated_operators_vehicles(): void
    {
        $this->actingAs($this->operator, 'sanctum')->getJson('/api/v1/operator/vehicles')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $this->vehicle->id);
        $otherOperator = $this->operator->replicate();
        $otherOperator->email = 'other-operator@example.com';
        $otherOperator->save();
        $this->actingAs($otherOperator, 'sanctum')->getJson('/api/v1/operator/vehicles')
            ->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_vehicle_edit_rejects_invalid_details_without_saving(): void
    {
        $this->actingAs($this->operator, 'sanctum')->putJson('/api/v1/operator/vehicles/'.$this->vehicle->id, [
            'name' => '12345', 'model' => '!!!', 'year_model' => 9999,
            'plate_number' => 'random', 'daily_rate' => '1.234', 'quantity' => 1000,
        ])->assertUnprocessable()->assertJsonValidationErrors(['name', 'model', 'year_model', 'plate_number', 'daily_rate', 'quantity']);
        $this->assertSame('Test Bike', $this->vehicle->fresh()->name);
    }

    public function test_plate_is_normalized_before_duplicate_check(): void
    {
        $this->vehicle->update(['plate_number' => 'ABC1234']);
        $other = $this->vehicle->replicate();
        $other->plate_number = 'XYZ1234';
        $other->save();
        $this->actingAs($this->operator, 'sanctum')->putJson('/api/v1/operator/vehicles/'.$other->id, ['plate_number' => ' abc-1234 '])
            ->assertUnprocessable()->assertJsonValidationErrors('plate_number');
    }

    public function test_operator_cannot_move_pickup_outside_oriental_mindoro(): void
    {
        $this->actingAs($this->operator, 'sanctum')->putJson('/api/v1/operator/vehicles/'.$this->vehicle->id, [
            'pickup_latitude' => 12.352, 'pickup_longitude' => 121.067,
        ])->assertUnprocessable()->assertJsonValidationErrors('pickup_latitude');
        $this->assertNull($this->vehicle->fresh()->pickup_latitude);
    }

    public function test_handover_requires_collection_and_records_full_base_payment(): void
    {
        $this->booking->update(['status' => 'approved']);
        $url = '/api/v1/bookings/'.$this->booking->id.'/start-trip';
        $this->actingAs($this->operator, 'sanctum')->postJson($url, ['start_mileage' => 1, 'start_fuel_level' => 100])->assertUnprocessable();
        $this->postJson($url, ['start_mileage' => 1, 'start_fuel_level' => 100, 'rental_balance_collected' => true])->assertOk();
        $this->assertEquals(1200, $this->booking->fresh()->rental_paid_amount);
        $this->assertEquals(0, $this->booking->fresh()->balance_due);
    }

    public function test_new_booking_uses_five_percent_of_the_entire_rental(): void
    {
        $this->booking->update(['status' => 'cancelled']);
        $this->renter->update(['drivers_license_front' => 'driver_licenses/front.jpg', 'drivers_license_back' => 'driver_licenses/back.jpg', 'license_verification_status' => 'approved']);
        $this->actingAs($this->renter, 'sanctum')->postJson('/api/v1/bookings', [
            'vehicle_id' => $this->vehicle->id, 'start_date' => today()->addDay()->toDateString(),
            'end_date' => today()->addDays(6)->toDateString(), 'pickup_time' => '01:30 PM', 'return_time' => '01:30 PM',
        ])->assertCreated()->assertJsonPath('data.total_price', '3000.00')->assertJsonPath('data.reservation_fee', '150.00');
    }

    public function test_new_listing_accepts_an_uploaded_cover_image(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');
        $this->operator->operatorProfile()->create(['business_name' => 'Test Fleet', 'business_email' => 'fleet@example.com', 'business_contact_number' => '09171234567', 'street_address' => 'Test Street', 'barangay' => 'Test', 'municipality' => 'Calapan City', 'account_name' => 'Test Operator', 'account_number' => '09171234567', 'latitude' => 13.4108, 'longitude' => 121.1803]);
        $this->actingAs($this->operator, 'sanctum')->post('/api/v1/operator/vehicles', [
            'name' => 'New Car', 'vehicle_type_id' => $this->vehicle->vehicle_type_id,
            'brand_id' => $this->vehicle->brand_id, 'model' => 'Test Model', 'year_model' => 2025,
            'plate_number' => 'NEW1234', 'transmission_type_id' => $this->vehicle->transmission_type_id,
            'fuel_type_id' => $this->vehicle->fuel_type_id, 'seating_capacity' => 4, 'daily_rate' => 100,
            'pickup_latitude' => 13.4108, 'pickup_longitude' => 121.1803,
            'cover_photo' => \Illuminate\Http\UploadedFile::fake()->image('cover.jpg'),
        ], ['Accept' => 'application/json'])->assertCreated();
        $this->assertDatabaseHas('vehicles', ['plate_number' => 'NEW1234', 'operator_id' => $this->operator->id]);
    }

    public function test_device_tokens_cannot_be_deleted_by_another_account(): void
    {
        $payload = ['token' => 'ExpoPushToken[test_device_123]'];
        $this->actingAs($this->renter, 'sanctum')->postJson('/api/v1/notifications/devices', $payload)->assertOk();
        $this->actingAs($this->operator, 'sanctum')->deleteJson('/api/v1/notifications/devices', $payload)->assertOk();
        $this->assertDatabaseHas('notification_devices', ['token' => $payload['token'], 'user_id' => $this->renter->id]);
    }

    public function test_return_reminders_are_role_aware_and_not_repeated_on_every_run(): void
    {
        $this->booking->update(['status' => 'trip_in_progress', 'return_at' => now()->subHour(), 'last_location_updated_at' => now()]);
        app(\App\Services\BookingReminderService::class)->send();
        app(\App\Services\BookingReminderService::class)->send();
        $this->assertSame(2, \App\Models\Notification::where('title', 'Vehicle Return Overdue')->count());
        $this->assertSame(0, \App\Models\Notification::where('title', 'Pickup Reminder')->count());
    }

    public function test_no_show_is_cancelled_only_after_24_hours_and_keeps_fee(): void
    {
        $this->booking->update(['status' => 'awaiting_pickup', 'start_date' => today()->subDays(2), 'pickup_at' => now()->subHours(23)]);
        app(BookingExpirationService::class)->expire();
        $this->assertSame('awaiting_pickup', $this->booking->fresh()->status);
        $this->booking->update(['pickup_at' => now()->subHours(24)]);
        app(BookingExpirationService::class)->expire();
        $this->assertSame('no_show', $this->booking->fresh()->status);
        $this->assertSame('paid_reservation', $this->booking->fresh()->payment_status);
        $this->assertNull($this->booking->fresh()->refund_status);
        $this->assertEquals(1, $this->vehicle->fresh()->available_units);
    }

    public function test_return_does_not_charge_base_rental_twice(): void
    {
        $this->booking->update(['status' => 'trip_in_progress', 'rental_paid_amount' => 1200, 'start_mileage' => 100]);
        $this->actingAs($this->operator, 'sanctum')->postJson('/api/v1/bookings/'.$this->booking->id.'/complete-trip', [
            'end_mileage' => 200, 'end_fuel_level' => 100, 'settlement_confirmed' => true, 'damage_charge' => 50,
        ])->assertOk();
        $this->assertEquals(50, $this->booking->fresh()->return_collected_amount);
        $this->assertEquals(0, $this->booking->fresh()->final_amount_due);
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

    public function test_rejected_license_requires_new_upload_before_booking_approval(): void
    {
        $this->renter->update(['license_verification_status' => 'rejected']);
        $this->actingAs($this->operator, 'sanctum')->postJson('/api/v1/bookings/'.$this->booking->id.'/confirm-payment')->assertUnprocessable();
        $this->assertSame('rejected', $this->renter->fresh()->license_verification_status);
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
        $this->actingAs($this->operator, 'sanctum')->postJson('/api/v1/bookings/'.$this->booking->id.'/complete-trip', ['end_mileage' => 1200, 'end_fuel_level' => 90, 'settlement_confirmed' => true])->assertOk();
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
        $this->actingAs($this->renter, 'sanctum')->postJson('/api/v1/bookings/'.$this->booking->id.'/settle-extension-payment', ['payment_method' => 'gcash', 'payment_reference' => '1234567890123'])->assertOk();
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

    public function test_advance_limit_is_enforced_while_pending_license_can_be_reviewed_by_operator(): void
    {
        $this->booking->delete();
        $this->renter->update(['license_verification_status' => 'pending']);
        $payload = ['vehicle_id' => $this->vehicle->id, 'start_date' => today()->addDays(3)->toDateString(), 'end_date' => today()->addDays(4)->toDateString()];
        $this->actingAs($this->renter, 'sanctum');
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
