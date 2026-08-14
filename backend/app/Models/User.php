<?php

namespace App\Models;

use App\Models\OperatorProfile;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;


#[Fillable([
    'first_name',
    'middle_name',
    'last_name',
    'suffix',
    'date_of_birth',
    'sex',
    'mobile_number',
    'email',
    'password',
    'role',
    'account_status',
    'last_login_at',
])]
#[Hidden([
    'password',
    'remember_token',
])]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function operatorProfile(): HasOne
    {
        return $this->hasOne(OperatorProfile::class);
    }

}
