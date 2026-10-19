<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => [
                'required',
                'string',
                'max:100',
                'regex:/^[\p{L}\p{M} .’\x27-]+$/u',
            ],

            'middle_name' => [
                'nullable',
                'string',
                'max:100',
                'regex:/^[\p{L}\p{M} .’\x27-]+$/u',
            ],

            'last_name' => [
                'required',
                'string',
                'max:100',
                'regex:/^[\p{L}\p{M} .’\x27-]+$/u',
            ],

            'suffix' => [
                'nullable',
                'string',
                'max:20',
            ],

            'date_of_birth' => [
                'required',
                'date',
                'before_or_equal:' . now()->subYears(18)->toDateString(),
                'after:' . now()->subYears(100)->toDateString(),
            ],

            'sex' => [
                'required',
                'string',
                'in:Male,Female,Prefer not to say',
            ],

            'email' => [
                'required',
                'email',
                'max:254',
                'unique:users,email',
            ],

            'mobile_number' => [
                'required',
                'string',
                'regex:/^(09\d{9}|\+639\d{9})$/',
            ],

            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'date_of_birth.before_or_equal' => 'You must be at least 18 years old to create an account.',
            'date_of_birth.after' => 'Please select a valid date of birth.',
        ];
    }
}
