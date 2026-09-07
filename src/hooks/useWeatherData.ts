'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWeatherData, fetchAirQuality } from '@/lib/api';
import { gpsDistance } from '@/lib/utils';
import type { City, WeatherResult } from '@/lib/types';

const CACHE_TTL = 600_000; // 10 minutes

function loadInitialWeatherCache(cities: City[]): Map<string | number, WeatherResult> {
  const map = new Map<string | number, WeatherResult>();
  if (typeof window === 'undefined') return map;

  try {
    for (const city of cities) {
      if (city.latitude === null || city.longitude === null) continue;
      const cacheKey = `wpwa_weather_${city.id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.data && parsed.data.hourly?.time?.length > 0) {
          map.set(city.id, {
            hourly: parsed.data.hourly,
            daily: parsed.data.daily,
            timezone: parsed.data.timezone,
            utc_offset_seconds: parsed.data.utc_offset_seconds,
            airQuality: parsed.airQuality || undefined,
            meta: {
              fetchedAt: parsed.timestamp || Date.now(),
              fromCache: true,
              lat: city.latitude,
              lon: city.longitude,
            },
          });
        }
      }
    }
  } catch (e) {
    console.warn('Initial cache load error:', e);
  }

  return map;
}

export function useWeatherData(cities: City[], gpsCoordsReady: boolean) {
  const [weatherMap, setWeatherMap] = useState<Map<string | number, WeatherResult>>(() =>
    loadInitialWeatherCache(cities)
  );
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const initialCache = loadInitialWeatherCache(cities);
    return initialCache.size === 0;
  });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const isFetchingRef = useRef(false);

  const fetchForCity = useCallback(async (city: City) => {
    if (city.latitude === null || city.longitude === null) return;

    const cacheKey = `wpwa_weather_${city.id}`;

    // 1. Check cache (Stale-While-Revalidate)
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Zawsze pokazujemy dane z cache od razu, by przyspieszyć start aplikacji
        if (parsed.data && parsed.data.hourly?.time?.length > 0) {
          const result: WeatherResult = {
            hourly: parsed.data.hourly,
            daily: parsed.data.daily,
            timezone: parsed.data.timezone,
            utc_offset_seconds: parsed.data.utc_offset_seconds,
            airQuality: parsed.airQuality || undefined,
            meta: {
              fetchedAt: parsed.timestamp || Date.now(),
              fromCache: true,
              lat: city.latitude,
              lon: city.longitude,
            },
          };
          setWeatherMap(prev => new Map(prev).set(city.id, result));
          // Nie blokujemy (brak return) - aplikacja załaduje najnowsze dane w tle
        }
      }
    } catch (e) {
      console.warn('Cache read error for', city.id, e);
    }

    // 2. Fetch fresh data
    try {
      const [data, airQuality] = await Promise.all([
        fetchWeatherData(city.latitude, city.longitude),
        fetchAirQuality(city.latitude, city.longitude),
      ]);

      const result: WeatherResult = {
        hourly: data.hourly,
        daily: data.daily,
        timezone: data.timezone,
        utc_offset_seconds: data.utc_offset_seconds,
        airQuality: airQuality || undefined,
        meta: {
          fetchedAt: Date.now(),
          fromCache: false,
          lat: city.latitude,
          lon: city.longitude,
        },
      };

      // Save to cache
      try {
        const cachePayload = {
          data,
          airQuality: airQuality || undefined,
          timestamp: Date.now(),
          coords: city.isGps ? { latitude: city.latitude, longitude: city.longitude } : undefined,
        };
        localStorage.setItem(cacheKey, JSON.stringify(cachePayload));
      } catch (e) {
        console.warn('Cache write error', e);
      }

      setWeatherMap(prev => new Map(prev).set(city.id, result));
      setFetchError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Błąd pobierania danych';
      console.error('Fetch failed for', city.id, err);
      setFetchError(message);

      // 3. Fallback to expired cache if available
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.data && parsed.data.hourly?.time?.length > 0) {
            const result: WeatherResult = {
              hourly: parsed.data.hourly,
              daily: parsed.data.daily,
              timezone: parsed.data.timezone,
              utc_offset_seconds: parsed.data.utc_offset_seconds,
              meta: {
                fetchedAt: parsed.timestamp || 0,
                fromCache: true,
                isFallback: true,
                lat: city.latitude,
                lon: city.longitude,
              },
            };
            setWeatherMap(prev => new Map(prev).set(city.id, result));
          }
        }
      } catch (fallbackErr) {
        console.warn('Failed to load fallback cache for', city.id);
      }
    }
  }, []);

  const refreshAll = useCallback(async (currentCities: City[]) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    lastRefreshTimeRef.current = Date.now();

    try {
      const validCities = currentCities.filter(c => c.latitude !== null && c.longitude !== null);
      await Promise.allSettled(validCities.map(city => fetchForCity(city)));
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [fetchForCity]);

  // Stable dependency key
  const citiesKey = cities.map(c => `${c.id}:${c.latitude}:${c.longitude}`).join('|');

  // Immediately hydrate any unpopulated city from cache when cities change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setWeatherMap(prev => {
      const nextMap = new Map(prev);
      let changed = false;
      for (const city of cities) {
        if (city.latitude === null || city.longitude === null) continue;
        if (!nextMap.has(city.id)) {
          const cacheKey = `wpwa_weather_${city.id}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed.data?.hourly?.time?.length > 0) {
                nextMap.set(city.id, {
                  hourly: parsed.data.hourly,
                  daily: parsed.data.daily,
                  timezone: parsed.data.timezone,
                  utc_offset_seconds: parsed.data.utc_offset_seconds,
                  airQuality: parsed.airQuality || undefined,
                  meta: {
                    fetchedAt: parsed.timestamp || Date.now(),
                    fromCache: true,
                    lat: city.latitude,
                    lon: city.longitude,
                  },
                });
                changed = true;
              }
            } catch (_) {}
          }
        }
      }
      return changed ? nextMap : prev;
    });
  }, [cities]);

  useEffect(() => {
    if (!gpsCoordsReady) return;
    refreshAll(cities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citiesKey, gpsCoordsReady]);

  // Auto-refresh on reconnect or tab focus
  useEffect(() => {
    const handleOnline = () => {
      refreshAll(cities);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastRefreshTimeRef.current;
        if (elapsed > 300_000) {
          refreshAll(cities);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citiesKey]);

  const refreshAllPublic = useCallback(async () => {
    await refreshAll(cities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citiesKey, refreshAll]);

  return { weatherMap, loading, error: fetchError, refreshAll: refreshAllPublic, fetchForCity };
}
