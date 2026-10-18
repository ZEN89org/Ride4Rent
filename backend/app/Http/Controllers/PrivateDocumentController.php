<?php

namespace App\Http\Controllers;

use App\Services\PrivateDocumentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PrivateDocumentController extends Controller
{
    public function show(Request $request, string $path)
    {
        abort_unless($request->hasValidSignature() && PrivateDocumentService::isPrivate($path), 403);
        abort_if(str_contains($path, '..') || str_contains($path, '\\'), 403);

        foreach (['local', 'public'] as $diskName) {
            $disk = Storage::disk($diskName);
            if ($disk->exists($path)) {
                return $disk->response($path, null, ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
            }
        }

        $record = DB::table('stored_files')->where('path', $path)->first();
        $binary = $record ? base64_decode($record->content_base64, true) : false;
        abort_if($binary === false, 404);

        return response($binary, 200, [
            'Content-Type' => $record->mime_type ?: 'application/octet-stream',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
