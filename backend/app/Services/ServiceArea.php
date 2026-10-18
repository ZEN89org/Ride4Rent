<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

class ServiceArea
{
    public static function contains(float $latitude, float $longitude): bool
    {
        if (! is_finite($latitude) || ! is_finite($longitude)) {
            return false;
        }
        $feature = json_decode(file_get_contents(resource_path('geo/oriental-mindoro.geojson')), true, flags: JSON_THROW_ON_ERROR);
        $geometry = $feature['geometry'];
        $polygons = $geometry['type'] === 'MultiPolygon' ? $geometry['coordinates'] : [$geometry['coordinates']];
        foreach ($polygons as $rings) {
            if (! self::inRing($longitude, $latitude, $rings[0])) {
                continue;
            }
            foreach (array_slice($rings, 1) as $hole) {
                if (self::inRing($longitude, $latitude, $hole)) {
                    continue 2;
                }
            }

            return true;
        }

        return false;
    }

    private static function inRing(float $lng, float $lat, array $ring): bool
    {
        $inside = false;
        for ($i = 0, $j = count($ring) - 1; $i < count($ring); $j = $i++) {
            [$x, $y] = $ring[$i];
            [$px, $py] = $ring[$j];
            $cross = ($lng - $x) * ($py - $y) - ($lat - $y) * ($px - $x);
            if (abs($cross) < 1e-10 && $lng >= min($x, $px) && $lng <= max($x, $px) && $lat >= min($y, $py) && $lat <= max($y, $py)) {
                return true;
            }
            if (($y > $lat) !== ($py > $lat) && $lng < ($px - $x) * ($lat - $y) / ($py - $y) + $x) {
                $inside = ! $inside;
            }
        }

        return $inside;
    }

    public static function validatePickup(float $latitude, float $longitude): void
    {
        if (! self::contains($latitude, $longitude)) {
            throw ValidationException::withMessages(['pickup_latitude' => 'Pickup places must be within Oriental Mindoro.']);
        }
    }
}
