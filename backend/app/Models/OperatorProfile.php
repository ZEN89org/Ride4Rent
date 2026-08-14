<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'user_id',
    'business_name',
    'business_email',
    'business_contact_number',
    'street_address',
    'barangay',
    'municipality',
    'government_id',
    'business_permit',
    'dti_sec_registration',
    'accepted_payment_methods',
    'account_name',
    'account_number',
    'qr_code',
    'rejection_reason',
    'reviewed_at',
])]
class OperatorProfile extends Model
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

        protected function casts(): array
        {
            return [
                'accepted_payment_methods' => 'array',
                'reviewed_at' => 'datetime',
            ];
        }
}
