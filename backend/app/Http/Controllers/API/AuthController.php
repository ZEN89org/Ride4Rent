<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Mail\PasswordResetOtpMail;
use App\Mail\VerificationOtpMail;
use App\Models\EmailVerificationOtp;
use App\Models\User;
use App\Services\AuthService;
use App\Services\MailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller
{
    public function __construct(
        private AuthService $authService
    ) {}

    public function sendOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower(trim($validated['email']));

        // Check if email already registered
        if (User::where('email', $email)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'This email is already registered.',
            ], 422);
        }

        // Generate secure 6-digit numeric OTP
        $otp = (string) random_int(100000, 999999);

        // Invalidate old unexpired OTPs for this email
        EmailVerificationOtp::where('email', $email)->delete();

        // Store OTP with 10-minute expiry
        EmailVerificationOtp::create([
            'email' => $email,
            'otp' => $otp,
            'expires_at' => now()->addMinutes(10),
            'is_used' => false,
        ]);

        // Dispatch Email
        $mailSent = MailService::sendVerificationOtp($email, $otp);

        if (!$mailSent) {
            return response()->json([
                'success' => false,
                'message' => "Could not deliver verification email to {$email}. Please check backend mail settings (BREVO_API_KEY required on Railway).",
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => "A 6-digit verification code has been sent to {$email}.",
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower(trim($validated['email']));
        $user = User::where('email', $email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'We could not find an account registered with that email address.',
            ], 404);
        }

        // Generate secure 6-digit numeric OTP
        $otp = (string) random_int(100000, 999999);

        // Invalidate old unexpired OTPs for this email
        EmailVerificationOtp::where('email', $email)->delete();

        // Store OTP with 10-minute expiry
        EmailVerificationOtp::create([
            'email' => $email,
            'otp' => $otp,
            'expires_at' => now()->addMinutes(10),
            'is_used' => false,
        ]);

        // Dispatch Password Reset Email
        $mailSent = MailService::sendPasswordResetOtp($email, $otp);

        if (!$mailSent) {
            return response()->json([
                'success' => false,
                'message' => "Could not deliver password reset email to {$email}. Please verify backend email configuration.",
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => "A 6-digit password reset code has been sent to {$email}.",
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'string', 'size:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email = strtolower(trim($validated['email']));
        $otp = trim($validated['otp']);

        $record = EmailVerificationOtp::where('email', $email)
            ->where('otp', $otp)
            ->where('is_used', false)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired reset code. Please check your Gmail or request a new code.',
            ], 422);
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User account not found.',
            ], 404);
        }

        // Update password
        $user->password = Hash::make($validated['password']);
        $user->save();

        // Mark OTP as used
        $record->update(['is_used' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully. You can now log in with your new password.',
        ]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'string', 'size:6'],
        ]);

        $email = strtolower(trim($validated['email']));
        $otp = trim($validated['otp']);

        $record = EmailVerificationOtp::where('email', $email)
            ->where('otp', $otp)
            ->where('is_used', false)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired confirmation code. Please check your Gmail or request a new code.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Gmail verified successfully.',
        ]);
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $email = strtolower(trim($validated['email']));
        $otp = $request->input('otp');

        if ($otp) {
            $record = EmailVerificationOtp::where('email', $email)
                ->where('otp', $otp)
                ->where('is_used', false)
                ->where('expires_at', '>', now())
                ->latest()
                ->first();

            if (!$record) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired verification code.',
                ], 422);
            }

            $record->update(['is_used' => true]);
        }

        $result = $this->authService->register($validated);

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
            'date_of_birth' => [
                'required',
                'date',
                'before_or_equal:' . now()->subYears(18)->toDateString(),
                'after:' . now()->subYears(100)->toDateString(),
            ],
            'sex' => ['required', 'string', 'max:30'],

            'business_name' => ['required', 'string', 'max:255'],
            'business_email' => ['required', 'email'],
            'business_contact_number' => ['required', 'string', 'max:20'],
            'street_address' => ['required', 'string', 'max:255'],
            'barangay' => ['required', 'string', 'max:100'],
            'municipality' => ['required', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],

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

            'dti_sec_registration' => ['nullable', 'string', 'max:100'],
            'accepted_payment_methods' => ['nullable', 'array'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $otp = $request->input('otp');
        if ($otp) {
            $record = EmailVerificationOtp::where('email', strtolower(trim($validated['email'])))
                ->where('otp', $otp)
                ->where('is_used', false)
                ->where('expires_at', '>', now())
                ->latest()
                ->first();

            if ($record) {
                $record->update(['is_used' => true]);
            }
        }

        $result = $this->authService->registerOperator($validated);
        $token = $result['user']->createToken('mobile-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Operator registration submitted successfully. Your account is pending administrator review.',
            'user' => new UserResource($result['user']),
            'operator_profile' => $result['operator_profile'],
            'token' => $token,
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
