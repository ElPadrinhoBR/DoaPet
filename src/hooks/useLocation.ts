/**
 * Hook de geolocalização com expo-location
 */
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

import type { GeoPointLiteral } from '@/types';

interface UseLocationResult {
  location: GeoPointLiteral | null;
  errorMsg: string | null;
  loading: boolean;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<GeoPointLiteral | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) {
          setErrorMsg('Permissão de localização negada.');
          setLoading(false);
        }
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      if (!cancelled) {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { location, errorMsg, loading };
}