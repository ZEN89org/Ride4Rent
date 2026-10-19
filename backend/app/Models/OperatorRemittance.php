<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OperatorRemittance extends Model
{
    use HasFactory;

    protected $fillable = [
        'operator_id',
        'billing_month',
        'gross_revenue',
        'commission_rate',
        'commission_due',
        'completed_trips_count',
        'payment_method',
        'payment_reference',
        'receipt_image',
        'status',
        'grace_period_expires_at',
        'submitted_at',
        'verified_at',
        'verified_by',
        'admin_notes',
    ];

    protected $casts = [
        'gross_revenue' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'commission_due' => 'decimal:2',
        'completed_trips_count' => 'integer',
        'grace_period_expires_at' => 'datetime',
        'submitted_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function isGraceExpired(): bool
    {
        if (! $this->grace_period_expires_at) {
            return false;
        }

        return now()->greaterThan($this->grace_period_expires_at);
    }

    public function getGraceHoursRemainingAttribute(): int
    {
        if (! $this->grace_period_expires_at) {
            return 0;
        }

        return max(0, (int) now()->diffInHours($this->grace_period_expires_at, false));
    }

    public function getReceiptImageUrlAttribute(): ?string
    {
        return $this->receipt_image ? Vehicle::resolveStorageUrl($this->receipt_image) : null;
    }
}
