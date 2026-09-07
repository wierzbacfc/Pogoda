'use client';

import { useState, useEffect, useCallback } from 'react';
import { reverseGeocode } from '@/lib/api';

const LAST_KNOWN_GPS_KEY = 'wpwa_last_known_gps';

export function useGeolocation(): {
  coords: { latitude: number; longitude: number } | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  cityName: string | null;
} {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LAST_KNOWN_GPS_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
            return parsed;
          }
        }
      } catch (_) {}
    }
    return { latitude: 52.4064, longitude: 16.9252 };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityName, setCityName] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('wpwa_last_known_gps_city');
        if (cached) return cached;
      } catch (_) {}
    }
    return 'Poznań';
  });

  const fetchCityName = async (lat: number, lon: number) => {
    try {
      const city = await reverseGeocode(lat, lon);
      setCityName(city);
      if (city) {
        try {
          localStorage.setItem('wpwa_last_known_gps_city', city);
        } catch (_) {}
      }
    } catch (err) {
      console.error('Failed to reverse geocode:', err);
    }
  };

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      // Brak GPS włączamy z cache, jeśli puste to Poznań jest już ustawiony
      const cached = localStorage.getItem(LAST_KNOWN_GPS_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setCoords(parsed);
          fetchCityName(parsed.latitude, parsed.longitude);
        } catch (e) {}
      }
      return;
    }

    // Nie ustawiamy setLoading(true) żeby nie blokować UI w razie wolnego GPS
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newCoords = { latitude, longitude };
        setCoords(newCoords);
        localStorage.setItem(LAST_KNOWN_GPS_KEY, JSON.stringify(newCoords));
        fetchCityName(latitude, longitude);
        setLoading(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        try {
          const cached = localStorage.getItem(LAST_KNOWN_GPS_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            setCoords(parsed);
            fetchCityName(parsed.latitude, parsed.longitude);
            setError('Używam ostatniej znanej lokalizacji.');
          } else {
            setCoords({ latitude: 52.4064, longitude: 16.9252 });
            fetchCityName(52.4064, 16.9252);
            setError('Brak uprawnień GPS. Używam domyślnej lokalizacji.');
          }
        } catch (e) {
          setCoords({ latitude: 52.4064, longitude: 16.9252 });
          fetchCityName(52.4064, 16.9252);
          setError('Brak uprawnień GPS.');
        }
        setLoading(false);
      },
      {
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { coords, loading, error, retry: requestLocation, cityName };
}
