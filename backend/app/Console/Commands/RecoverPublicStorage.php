<?php

namespace App\Console\Commands;

use App\Services\PrivateDocumentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

class RecoverPublicStorage extends Command
{
    protected $signature = 'storage:recover-public';

    protected $description = 'Back up existing public images and restore missing images without replacing newer uploads';

    public function handle(): int
    {
        $disk = Storage::disk('public');
        $restored = 0;
        DB::table('stored_files')->orderBy('id')->chunkById(100, function ($records) use ($disk, &$restored) {
            foreach ($records as $record) {
                if (! $this->safeImage($record->path) || $disk->exists($record->path)) {
                    continue;
                }
                $raw = base64_decode($record->content_base64, true);
                if ($raw !== false && $disk->put($record->path, $raw)) {
                    $restored++;
                }
            }
        });
        $packaged = 0;
        $legacy = resource_path('legacy-public');
        // Build-time copies survive even when a Railway volume hides storage/app.
        if (is_dir($legacy)) {
            foreach (File::allFiles($legacy) as $file) {
                $path = str_replace('\\', '/', $file->getRelativePathname());
                if ($this->safeImage($path) && ! $disk->exists($path)) {
                    if (! $disk->put($path, $file->getContents())) {
                        throw new \RuntimeException('Could not restore '.$path);
                    }
                    $packaged++;
                }
            }
        }

        $backedUp = 0;
        foreach ($disk->allFiles() as $path) {
            if (! $this->safeImage($path) || DB::table('stored_files')->where('path', $path)->exists()) {
                continue;
            }
            $raw = $disk->get($path);
            if ($raw === null) {
                continue;
            }
            $backedUp += DB::table('stored_files')->insertOrIgnore([
                'path' => $path, 'mime_type' => $disk->mimeType($path) ?: 'image/jpeg',
                'content_base64' => base64_encode($raw), 'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        $this->info("Public images: {$backedUp} backed up, {$restored} restored from database, {$packaged} restored from packaged originals.");

        return self::SUCCESS;
    }

    private function safeImage(string $path): bool
    {
        return ! str_contains($path, '..') && ! str_contains($path, '\\') && ! str_starts_with($path, '/')
            && ! PrivateDocumentService::isPrivate($path)
            && (bool) preg_match('/\.(jpe?g|png|webp|gif|heic)$/i', $path);
    }
}
