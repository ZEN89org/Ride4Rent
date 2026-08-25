<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private AuthService $authService
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Registration successful.',
            'data' => [
                'user' => new UserResource($result['user']),
                'token' => $result['token'],
            ],
        ], 201);
    }

    public function registerOperator(Request $request): JsonResponse
    {

        if ($request->has('accepted_payment_methods')) {
            $request->merge([
                'accepted_payment_methods' => json_decode(
                    $request->input('accepted_payment_methods'),
                    true
                ),
            ]);
        }

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'suffix' => ['nullable', 'string', 'max:20'],
            'email' => ['required', 'email', 'unique:users,email'],
            'date_of_birth' => ['required', 'date'],
            'sex' => ['required', 'string', 'max:30'],

            'business_name' => ['required', 'string', 'max:255'],
            'business_email' => ['required', 'email'],
            'business_contact_number' => ['required', 'string', 'max:20'],
            'street_address' => ['required', 'string', 'max:255'],
            'barangay' => ['required', 'string', 'max:100'],
            'municipality' => ['required', 'string', 'max:100'],

            'government_id_front' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png',
                'max:5120',
            ],

            'government_id_back' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png',
                'max:5120',
            ],

            'business_permit_front' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png',
                'max:5120',
            ],

            'business_permit_back' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png',
                'max:5120',
            ],
            'dti_sec_registration' => ['nullable', 'string'],

            'accepted_payment_methods' => ['nullable', 'array'],
            'accepted_payment_methods.*' => ['string'],

            'account_name' => ['nullable', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:100'],
            'qr_code' => ['nullable', 'string'],

            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $result = $this->authService->registerOperator($validated);

        return response()->json([
            'success' => true,
            'message' => 'Operator registration submitted successfully. Your account is pending administrator review.',
            'user' => $result['user'],
            'operator_profile' => $result['operator_profile'],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'data' => [
                'user' => new UserResource($result['user']),
                'token' => $result['token'],
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new UserResource($request->user()),
        ]);
    }
}
