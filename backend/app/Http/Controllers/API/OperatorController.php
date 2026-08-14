<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OperatorController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $user = $request->user()->load('operatorProfile');

        return response()->json([
            'success' => true,
            'data' => [
                'role' => $user->role,
                'account_status' => $user->account_status,
                'operator_profile' => $user->operatorProfile,
            ],
        ]);
    }
}
