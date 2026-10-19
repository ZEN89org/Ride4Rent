<?php

namespace App\Services;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;

class PrivateDocumentService
{
    public static function storeLicense(UploadedFile $file): string
    {
        $path = 'driver_licenses/'.$file->hashName();
        $contents = $file->get();
        if ($contents === false || $contents === '') {
            throw new \RuntimeException('Unable to read the license upload.');
        }
        // The private directory is not covered by the public uploads volume.
        // Commit a durable copy before the user record references this file.
        DB::table('stored_files')->updateOrInsert(['path' => $path], [
            'mime_type' => $file->getMimeType() ?: 'image/jpeg',
            'content_base64' => base64_encode($contents),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Storage::disk('local')->put($path, $contents);

        return $path;
    }

    public static function isPrivate(string $path): bool
    {
        return preg_match('#^(driver_licenses|operator_documents|operator-documents|secondary_driver_licenses)/#', $path) === 1;
    }

    public static function url(?string $path): ?string
    {
        if (! $path) {
            return null;
        }
        $path = preg_replace('#^.*?/storage/#', '', $path);

        return URL::temporarySignedRoute('documents.show', now()->addMinutes(15), ['path' => ltrim($path, '/')]);
    }
}
