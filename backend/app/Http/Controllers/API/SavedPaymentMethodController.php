<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SavedPaymentMethodController extends Controller
{
    private function owner(Request $request): int
    {
        abort_unless(in_array($request->user()->role, ['customer', 'renter'], true), 403);
        return $request->user()->id;
    }

    public function show(Request $request): JsonResponse
    {
        $method = DB::table('user_payment_methods')->where('user_id', $this->owner($request))
            ->first(['account_name', 'account_number']);
        return response()->json(['data' => $method]);
    }

    public function update(Request $request): JsonResponse
    {
        $owner = $this->owner($request);
        $request->merge([
            'account_name' => is_string($request->account_name) ? trim(preg_replace('/\s+/u', ' ', $request->account_name)) : $request->account_name,
            'account_number' => is_string($request->account_number) ? preg_replace('/^\+63/', '0', trim($request->account_number)) : $request->account_number,
        ]);
        $data = $request->validate([
            'account_name' => ['required', 'string', 'min:2', 'max:100', 'regex:/^[\pL\pM][\pL\pM .\x{2019}\x{0027}-]*$/u'],
            'account_number' => ['required', 'string', 'regex:/^09\d{9}$/'],
        ], [
            'account_name.regex' => 'Enter the name registered to your GCash account.',
            'account_number.regex' => 'Enter an 11-digit Philippine mobile number starting with 09.',
        ]);
        DB::table('user_payment_methods')->upsert([
            [...$data, 'user_id' => $owner, 'created_at' => now(), 'updated_at' => now()],
        ], ['user_id'], ['account_name', 'account_number', 'updated_at']);
        return response()->json(['data' => $data, 'message' => 'Payment method saved.']);
    }

    public function destroy(Request $request): JsonResponse
    {
        DB::table('user_payment_methods')->where('user_id', $this->owner($request))->delete();
        return response()->json(['message' => 'Payment method removed.']);
    }
}
