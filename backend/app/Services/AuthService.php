<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class AuthService
{
    public function register(array $data): array
    {
        $user = User::create([
            'first_name' => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name' => $data['last_name'],
            'suffix' => $data['suffix'] ?? null,
            'date_of_birth' => $data['date_of_birth'],
            'sex' => $data['sex'],
            'email' => $data['email'],
            'mobile_number' => $data['mobile_number'],
            'password' => Hash::make($data['password']),
            'role' => 'user',
            'account_status' => 'active',
        ]);

        $token = $user->createToken('mobile-token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    public function registerOperator(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'suffix' => $data['suffix'] ?? null,
                'date_of_birth' => $data['date_of_birth'],
                'sex' => $data['sex'],
                'email' => $data['email'],
                'mobile_number' => $data['business_contact_number'],
                'password' => Hash::make($data['password']),
                'role' => 'operator',
                'account_status' => 'pending',
            ]);

            $operatorProfile = $user->operatorProfile()->create([
                'business_name' => $data['business_name'],
                'business_email' => $data['business_email'],
                'business_contact_number' => $data['business_contact_number'],
                'street_address' => $data['street_address'],
                'barangay' => $data['barangay'] ?? null,
                'municipality' => $data['municipality'],

                'government_id' => $data['government_id'],
                'business_permit' => $data['business_permit'],
                'dti_sec_registration' => $data['dti_sec_registration'] ?? null,

                'accepted_payment_methods' =>
                    $data['accepted_payment_methods'],

                'account_name' => $data['account_name'],
                'account_number' => $data['account_number'],
                'qr_code' => $data['qr_code'] ?? null,
            ]);

            return [
                'user' => $user,
                'operator_profile' => $operatorProfile,
            ];
        });
    }

    public function login(array $data): array
    {
        $user = User::with('operatorProfile')
    ->where('email', $data['email'])
    ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        $user->update([
            'last_login_at' => now(),
        ]);

        $token = $user->createToken('mobile-token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token,
        ];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }
}
