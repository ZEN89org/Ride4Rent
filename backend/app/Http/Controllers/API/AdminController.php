<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    public function test(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Administrator access granted.',
        ]);
    }
}
