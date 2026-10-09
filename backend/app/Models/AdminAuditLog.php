<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminAuditLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'admin_id',
        'admin_name',
        'action',
        'target_type',
        'target_id',
        'target_name',
        'details',
        'ip_address',
    ];

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * Helper to log an administrative action
     */
    public static function record(string $action, ?string $targetType = null, ?int $targetId = null, ?string $targetName = null, ?string $details = null): self
    {
        $admin = auth()->user();

        return self::create([
            'admin_id' => $admin?->id,
            'admin_name' => $admin ? trim($admin->first_name . ' ' . $admin->last_name) : 'System Admin',
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'target_name' => $targetName,
            'details' => $details,
            'ip_address' => request()->ip(),
        ]);
    }
}
