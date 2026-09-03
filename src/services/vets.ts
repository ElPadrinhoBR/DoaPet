/**
 * Serviço de Emergência Veterinária (SOS Vet)
 *
 * Coleta clínicas e hospitais veterinários reais a partir dos dados do mapa
 * em torno da localização do usuário.
 */
import type { VetClinic, GeoPointLiteral } from '@/types';
import { haversineDistanceKm } from '@/utils/geo';

interface NominatimResult {
  place_id: number;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
}

/** Cache em memória para evitar requisições repetidas ao mover o mapa */
let cachedClinics: Array<VetClinic & { distanceKm: number }> = [];
let lastFetchedLocation: GeoPointLiteral | null = null;

/**
 * Busca clínicas veterinárias reais ao redor das coordenadas fornecidas
 * utilizando dados abertos de mapa (OpenStreetMap / Nominatim)
 */
export async function listNearbyClinics(
  userLocation: GeoPointLiteral,
): Promise<Array<VetClinic & { distanceKm: number }>> {
  // Se já buscou perto desta localização (menos de 3km de diferença), usa cache
  if (
    lastFetchedLocation &&
    cachedClinics.length > 0 &&
    haversineDistanceKm(userLocation, lastFetchedLocation) < 3
  ) {
    return cachedClinics
      .map((c) => ({
        ...c,
        distanceKm: haversineDistanceKm(userLocation, c.location),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  try {
    const lat = userLocation.latitude;
    const lng = userLocation.longitude;
    const delta = 0.25; // Raio aproximado de 25 km
    const viewbox = `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=veterinaria&viewbox=${viewbox}&bounded=1&limit=20`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DoaPetApp/1.0',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return cachedClinics;
    }

    const data: NominatimResult[] = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return cachedClinics;
    }

    const clinics: Array<VetClinic & { distanceKm: number }> = data.map((item) => {
      const parts = item.display_name.split(',');
      const clinicName = item.name && item.name.length > 2 ? item.name : parts[0].trim();
      const clinicAddress = parts.slice(1, 4).join(',').trim();
      const coords: GeoPointLiteral = {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      };

      return {
        id: `clinic_osm_${item.place_id}`,
        name: clinicName,
        address: clinicAddress || 'Endereço registrado no mapa',
        phone: 'Informação no local',
        isOpen24h: clinicName.toLowerCase().includes('24h') || clinicName.toLowerCase().includes('24 horas'),
        location: coords,
        distanceKm: haversineDistanceKm(userLocation, coords),
      };
    });

    const sorted = clinics.sort((a, b) => a.distanceKm - b.distanceKm);
    cachedClinics = sorted;
    lastFetchedLocation = userLocation;

    return sorted;
  } catch {
    return cachedClinics;
  }
}