<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class PersistUploadedStorageFiles
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! empty($request->allFiles())) {
            try {
                if (Schema::hasTable('stored_files')) {
                    $disk = Storage::disk('public');
                    $now = time();

                    foreach ($disk->allFiles() as $filePath) {
                        if (str_starts_with(basename($filePath), '.')) {
                            continue;
                        }

                        $lastModified = $disk->lastModified($filePath);
                        if (($now - $lastModified) <= 120) {
                            $raw = $disk->get($filePath);
                            if ($raw !== null) {
                                $mime = $disk->mimeType($filePath) ?: 'image/jpeg';
                                DB::table('stored_files')->updateOrInsert(
                                    ['path' => $filePath],
                                    [
                                        'mime_type' => $mime,
                                        'content_base64' => base64_encode($raw),
                                        'updated_at' => now(),
                                        'created_at' => now(),
                                    ]
                                );
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Fail silently so upload response is never interrupted
            }
        }

        return $response;
    }
}
