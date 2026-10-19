<?php

namespace Tests\Feature;

use App\Services\ServiceArea;
use App\Services\PrivateDocumentService;
use Illuminate\Http\UploadedFile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ServiceAreaStorageTest extends TestCase
{
    use RefreshDatabase;

    public function test_license_upload_has_a_durable_private_copy_before_container_files_are_lost(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        $file = UploadedFile::fake()->image('license.jpg');
        $path = PrivateDocumentService::storeLicense($file);
        $this->assertDatabaseHas('stored_files', ['path' => $path]);
        Storage::disk('local')->assertExists($path);
        Storage::disk('public')->assertMissing($path);
        Storage::disk('local')->delete($path);
        $this->get(PrivateDocumentService::url($path))->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg')
            ->assertHeader('Cache-Control', 'no-store, private');
        $this->get('/documents/'.$path)->assertForbidden();
    }

    public function test_license_storage_check_is_read_only(): void
    {
        $this->artisan('storage:check-licenses')->expectsOutputToContain('Private document route: registered')
            ->expectsOutputToContain('Database backup table: present')->assertSuccessful();
        $this->assertDatabaseCount('stored_files', 0);
    }

    public function test_province_polygon_accepts_local_towns_and_rejects_occidental_manila_and_sea(): void
    {
        foreach ([[13.4115, 121.1803], [13.0453, 121.4878], [13.5000, 120.9542], [12.5858, 121.5194]] as [$lat, $lng]) {
            $this->assertTrue(ServiceArea::contains($lat, $lng), "Expected {$lat}, {$lng} inside");
        }
        foreach ([[12.352, 121.067], [13.223, 120.596], [14.5995, 120.9842], [13.0, 122.0], [NAN, INF]] as [$lat, $lng]) {
            $this->assertFalse(ServiceArea::contains($lat, $lng));
        }
    }

    public function test_outside_pickup_is_rejected_with_a_validation_error(): void
    {
        $this->expectException(ValidationException::class);
        ServiceArea::validatePickup(12.352, 121.067);
    }

    public function test_recovery_backs_up_old_images_restores_missing_images_and_is_idempotent(): void
    {
        Storage::fake('public');
        $disk = Storage::disk('public');
        $disk->put('vehicles/old.jpg', 'old-original');
        $disk->put('vehicles/existing.jpg', 'newer-original');
        $disk->put('driver_licenses/private.jpg', 'private');
        foreach (['vehicles/missing.jpg' => 'recovered', 'vehicles/existing.jpg' => 'older', 'driver_licenses/missing.jpg' => 'private-backup'] as $path => $raw) {
            DB::table('stored_files')->insert(['path' => $path, 'content_base64' => base64_encode($raw), 'mime_type' => 'image/jpeg', 'created_at' => now(), 'updated_at' => now()]);
        }
        $this->artisan('storage:recover-public')->assertSuccessful();
        $this->assertSame('recovered', $disk->get('vehicles/missing.jpg'));
        $this->assertSame('newer-original', $disk->get('vehicles/existing.jpg'));
        $this->assertDatabaseHas('stored_files', ['path' => 'vehicles/old.jpg', 'content_base64' => base64_encode('old-original')]);
        $this->assertDatabaseMissing('stored_files', ['path' => 'driver_licenses/private.jpg']);
        $disk->assertMissing('driver_licenses/missing.jpg');
        $count = DB::table('stored_files')->count();
        $this->artisan('storage:recover-public')->assertSuccessful();
        $this->assertSame($count, DB::table('stored_files')->count());
    }
}
