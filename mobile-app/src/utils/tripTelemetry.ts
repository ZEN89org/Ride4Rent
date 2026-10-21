/** Native GPS speed is metres/second. Suppress stationary drift under 2 km/h. */
export function gpsSpeedKmh(speed?: number | null): number {
  if (speed == null || !Number.isFinite(speed) || speed < 0) return 0;
  const kmh = speed * 3.6;
  return kmh < 2 ? 0 : Math.round(kmh);
}

export function displayTripSpeed(speed: unknown, live: boolean): string {
  if (!live) return "— km/h";
  const number = Number(speed);
  if (speed == null || !Number.isFinite(number) || number < 0) return "— km/h";
  return `${number < 2 ? 0 : Math.round(number)} km/h`;
}
