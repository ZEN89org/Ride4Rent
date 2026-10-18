<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        $public = Storage::disk('public');
        $private = Storage::disk('local');
        foreach (['driver_licenses', 'operator_documents', 'operator-documents', 'secondary_driver_licenses'] as $directory) {
            foreach ($public->allFiles($directory) as $path) {
                $contents = $public->get($path);
                if (! $private->put($path, $contents) || hash('sha256', $private->get($path)) !== hash('sha256', $contents)) {
                    throw new RuntimeException('Could not safely move a verification document to private storage.');
                }
                $public->delete($path);
            }
        }
    }

    public function down(): void
    {
        // Keep verification documents private even when application schema is rolled back.
    }
};
