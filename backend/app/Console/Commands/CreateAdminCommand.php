<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class CreateAdminCommand extends Command
{
    protected $signature = 'admin:create
        {email? : The administrator email address}
        {--first-name= : The administrator first name}
        {--last-name= : The administrator last name}
        {--date-of-birth= : The administrator date of birth (YYYY-MM-DD)}
        {--sex= : The administrator sex}';

    protected $description = 'Create an administrator account with a hidden password prompt';

    public function handle(): int
    {
        $email = $this->argument('email') ?: $this->ask('Administrator email');
        $firstName = $this->option('first-name') ?: $this->ask('First name');
        $lastName = $this->option('last-name') ?: $this->ask('Last name');
        $dateOfBirth = $this->option('date-of-birth') ?: $this->ask('Date of birth (YYYY-MM-DD)');
        $sex = $this->option('sex') ?: $this->choice('Sex', ['Male', 'Female', 'Prefer not to say']);

        $this->validateInput($email, $firstName, $lastName, $dateOfBirth);

        if (User::where('email', $email)->exists()) {
            $this->components->error('An account already exists with that email address.');

            return self::FAILURE;
        }

        $password = $this->secret('Password (input is hidden)');
        $confirmation = $this->secret('Confirm password (input is hidden)');

        if (! is_string($password) || strlen($password) < 12) {
            $this->components->error('The password must be at least 12 characters.');

            return self::FAILURE;
        }

        if (! hash_equals($password, (string) $confirmation)) {
            $this->components->error('The passwords do not match.');

            return self::FAILURE;
        }

        User::create([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'date_of_birth' => $dateOfBirth,
            'sex' => $sex,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'admin',
            'account_status' => 'active',
        ]);

        $this->components->info('Administrator account created.');

        return self::SUCCESS;
    }

    private function validateInput(?string $email, ?string $firstName, ?string $lastName, ?string $dateOfBirth): void
    {
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw ValidationException::withMessages([
                'email' => 'Enter a valid email address.',
            ]);
        }

        if (blank($firstName) || blank($lastName)) {
            throw ValidationException::withMessages([
                'name' => 'First name and last name are required.',
            ]);
        }

        $date = $dateOfBirth ? \DateTime::createFromFormat('Y-m-d', $dateOfBirth) : false;

        if (! $date || $date->format('Y-m-d') !== $dateOfBirth) {
            throw ValidationException::withMessages([
                'date_of_birth' => 'Date of birth must use the YYYY-MM-DD format.',
            ]);
        }
    }
}
