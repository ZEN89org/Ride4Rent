<?php

namespace App\Services;

use Illuminate\Support\Facades\URL;

class PrivateDocumentService
{
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
