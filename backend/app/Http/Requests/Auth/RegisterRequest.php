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
            ],

            'middle_name' => [
                'nullable',
                'string',
                'max:100',
            ],

            'last_name' => [
                'required',
                'string',
                'max:100',
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
                'unique:users,email',
            ],

            'mobile_number' => [
                'required',
                'string',
                'max:20',
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
