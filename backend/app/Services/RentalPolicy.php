<?php

namespace App\Services;

class RentalPolicy
{
    public const RESERVATION_PERCENT = 5;
    public const NO_SHOW_HOURS = 24;

    public static function reservationFee(float $rentalTotal): float
    {
        return round($rentalTotal * self::RESERVATION_PERCENT / 100, 2);
    }
}
