<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleMaintenance extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'operator_id',
        'service_type',
        'mileage_at_service',
        'cost',
        'service_date',
        'next_service_mileage',
        'status',
        'performed_by',
        'notes',
    ];

    protected $casts = [
        'service_date' => 'date',
        'cost' => 'decimal:2',
        'mileage_at_service' => 'integer',
        'next_service_mileage' => 'integer',
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }
}
