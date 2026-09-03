/**
 * Utilitários de geolocalização
 */
import type { GeoPointLiteral } from '@/types';

const EARTH_RADIUS_KM = 6371;

/**
 * Calcula a distância em km entre dois pontos usando a fórmula de Haversine.
 */
export function haversineDistanceKm(
  from: GeoPointLiteral,
  to: GeoPointLiteral,
): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Limites do raio de busca definidos no README (5 km a 30 km) */
export const MIN_RADIUS_KM = 5;
export const MAX_RADIUS_KM = 30;

export function clampRadiusKm(radiusKm: number): number {
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, radiusKm));
}