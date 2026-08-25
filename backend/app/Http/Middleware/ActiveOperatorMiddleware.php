<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ActiveOperatorMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== 'operator') {
            return response()->json(['success' => false, 'message' => 'Operator access required.'], 403);
        }

        if ($user->account_status !== 'active') {
            return response()->json(['success' => false, 'message' => 'An active operator account is required.'], 403);
        }

        return $next($request);
    }
}
