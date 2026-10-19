<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\PrivateDocumentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class CheckLicenseStorage extends Command
{
    protected $signature = 'storage:check-licenses {--user= : Check one numeric user ID}';

    protected $description = 'Read-only license storage check without exposing document paths or contents';

    public function handle(): int
    {
        $userId = $this->option('user');
        if ($userId !== null && !ctype_digit((string) $userId)) {
            $this->error('Use a numeric user ID.');
            return self::FAILURE;
        }
        $this->line('Private document route: '.(\Illuminate\Support\Facades\Route::has('documents.show') ? 'registered' : 'MISSING'));
        $hasBackups = Schema::hasTable('stored_files');
        $this->line('Database backup table: '.($hasBackups ? 'present' : 'MISSING'));
        $rows = [];
        User::query()->when($userId !== null, fn ($query) => $query->whereKey($userId))
            ->where(fn ($query) => $query->whereNotNull('drivers_license_front')->orWhereNotNull('drivers_license_back'))
            ->each(function (User $user) use (&$rows, $hasBackups) {
                foreach (['front', 'back'] as $side) {
                    $path = $user->{'drivers_license_'.$side};
                    if (!$path) { $rows[] = [$user->id, $side, 'not uploaded']; continue; }
                    $path = preg_replace('#^.*?/storage/#', '', ltrim($path, '/'));
                    if (!PrivateDocumentService::isPrivate($path)) { $rows[] = [$user->id, $side, 'unrecognized stored path']; continue; }
                    $copies = [];
                    foreach (['local', 'public'] as $disk) {
                        if (Storage::disk($disk)->exists($path)) $copies[] = $disk === 'local' ? 'private disk' : 'legacy public disk';
                    }
                    $backup = $hasBackups ? DB::table('stored_files')->where('path', $path)->value('content_base64') : null;
                    if ($backup && base64_decode($backup, true) !== false) $copies[] = 'database backup';
                    $rows[] = [$user->id, $side, $copies ? implode(' + ', $copies) : 'MISSING: no stored copy'];
                }
            });
        $this->table(['User ID', 'Side', 'Storage status'], $rows);
        $this->line('Read-only: no files, account status or database records were changed.');
        return self::SUCCESS;
    }
}
