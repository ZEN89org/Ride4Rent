<?php

namespace App\Http\Middleware;

use App\Services\PrivateDocumentService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
                    $now = time();
                    foreach (['public', 'local'] as $diskName) {
                        $disk = Storage::disk($diskName);

                        foreach ($disk->allFiles() as $filePath) {
                            if (($diskName === 'local' && ! PrivateDocumentService::isPrivate($filePath)) || str_starts_with(basename($filePath), '.')) {
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
                }
            } catch (\Throwable $e) {
                Log::warning('Upload storage backup failed', ['exception' => $e->getMessage()]);
            }
        }

        return $response;
    }
}
