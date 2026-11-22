import { FAST_MIN, MAX_FLIGHT_MIN, MIN_FLIGHT_MIN, NORMAL_KMH } from './config';

export interface LatLon { lat: number; lon: number }

/** Great-circle distance in km. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const R = 6371, d = Math.PI / 180;
  const dLat = (b.lat - a.lat) * d, dLon = (b.lon - a.lon) * d;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

/** Flight duration in minutes for a pigeon over `km`. */
export function flightMinutes(km: number, fast: boolean): number {
  if (fast) return FAST_MIN;
  return Math.max(MIN_FLIGHT_MIN, Math.min(MAX_FLIGHT_MIN, Math.round((km / NORMAL_KMH) * 60)));
}

/** City-level precision (about 10 km) so exact homes are never stored. */
export const coarse = (x: number) => Math.round(x * 10) / 10;

export function validLatLon(v: unknown): v is LatLon {
  const o = v as LatLon;
  return !!o && typeof o.lat === 'number' && typeof o.lon === 'number' &&
    Math.abs(o.lat) <= 90 && Math.abs(o.lon) <= 180 && Number.isFinite(o.lat) && Number.isFinite(o.lon);
}
