/**
 * Open-Meteo API wrapper and Weather Data Cache Manager.
 */

const API = {
  GEO_BASE:     'https://geocoding-api.open-meteo.com/v1',
  WEATHER_BASE: 'https://api.open-meteo.com/v1',
  CACHE_TTL:    600000, // 10 minutes in milliseconds

  /**
   * Search for cities by query.
   * Returns: Promise<Array<City>>
   */
  async searchCity(query) {
    const normalizedQuery = (query || '').trim().replace(/\s+/g, ' ');
    if (normalizedQuery.length < 2) {
      return [];
    }
    const url = `${this.GEO_BASE}/search?name=${encodeURIComponent(normalizedQuery)}&count=8&language=pl&format=json`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Wyszukiwanie nie powiodło się: ${response.status}`);
      }
      const data = await response.json();
      return data.results || [];
    } catch (e) {
      console.error('Błąd wyszukiwania geokodowania:', e);
      throw e;
    }
  },

  /**
   * Fetch weather forecast for a single city.
   * Handles caching and coordinates displacement check for GPS.
   */
  async fetchWeather(city) {
    if (city.latitude === null || city.longitude === null) {
      throw new Error(`Brak współrzędnych dla lokalizacji: ${city.name}`);
    }

    const cacheKey = `wpwa_weather_${city.id}`;
    const cached = Storage.get(cacheKey);

    if (cached && cached.fetchedAt && cached.data) {
      const timeDiff = Date.now() - cached.fetchedAt;
      const isCacheFresh = timeDiff < this.CACHE_TTL;

      if (isCacheFresh) {
        if (city.isGps) {
          // If GPS, check if current position has changed significantly (> 1 km)
          const distance = Geo.gpsDistance(city.latitude, city.longitude, cached.lat, cached.lon);
          if (distance < 1.0) {
            console.log('GPS Cache hit (distance < 1km, age < 10m)');
            return {
              hourly: cached.data.hourly,
              daily: cached.data.daily,
              timezone: cached.data.timezone,
              utc_offset_seconds: cached.data.utc_offset_seconds,
              meta: {
                fetchedAt: cached.fetchedAt,
                fromCache: true,
                lat: cached.lat,
                lon: cached.lon
              }
            };
          } else {
            console.log(`GPS location shifted by ${distance.toFixed(2)} km. Bypassing cache.`);
          }
        } else {
          console.log(`Cache hit for ${city.name}`);
          return {
            hourly: cached.data.hourly,
            daily: cached.data.daily,
            timezone: cached.data.timezone,
            utc_offset_seconds: cached.data.utc_offset_seconds,
            meta: {
              fetchedAt: cached.fetchedAt,
              fromCache: true,
              lat: cached.lat,
              lon: cached.lon
            }
          };
        }
      }
    }

    // Cache miss or expired -> Fetch fresh data
    const url = `${this.WEATHER_BASE}/forecast` +
      `?latitude=${city.latitude}` +
      `&longitude=${city.longitude}` +
      `&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weathercode,windspeed_10m,winddirection_10m,relativehumidity_2m,uv_index,visibility,is_day` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,sunrise,sunset,uv_index_max` +
      `&timezone=auto` +
      `&forecast_days=15` +
      `&wind_speed_unit=kmh`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Błąd API pogodowego: ${response.status}`);
      }
      const data = await response.json();

      // Save to cache
      const cacheData = {
        fetchedAt: Date.now(),
        lat: city.latitude,
        lon: city.longitude,
        data: data
      };
      Storage.set(cacheKey, cacheData);

      console.log(`Fetched fresh weather data for ${city.name}`);
      return {
        hourly: data.hourly,
        daily: data.daily,
        timezone: data.timezone,
        utc_offset_seconds: data.utc_offset_seconds,
        meta: {
          fetchedAt: cacheData.fetchedAt,
          fromCache: false,
          lat: city.latitude,
          lon: city.longitude
        }
      };
    } catch (e) {
      console.error(`Błąd podczas pobierania pogody dla ${city.name}:`, e);
      // If offline or request fails, return cached data as a fallback (even if expired)
      if (cached && cached.data) {
        console.warn(`Returning expired cache for ${city.name} due to fetch failure.`);
        return {
          hourly: cached.data.hourly,
          daily: cached.data.daily,
          timezone: cached.data.timezone,
          utc_offset_seconds: cached.data.utc_offset_seconds,
          meta: {
            fetchedAt: cached.fetchedAt,
            fromCache: true,
            isFallback: true,
            lat: cached.lat,
            lon: cached.lon
          }
        };
      }
      throw e;
    }
  },

  /**
   * Fetch weather for all cities in parallel.
   * Returns: Promise<Map<cityId, weatherData | {error}>>
   */
  async fetchAllCities(cities) {
    const weatherMap = new Map();
    if (!cities || cities.length === 0) return weatherMap;

    const promises = cities.map(async (city) => {
      try {
        const data = await this.fetchWeather(city);
        return { id: city.id, success: true, data };
      } catch (err) {
        return { id: city.id, success: false, error: err };
      }
    });

    const results = await Promise.allSettled(promises);
    results.forEach(res => {
      if (res.status === 'fulfilled') {
        const value = res.value;
        if (value.success) {
          weatherMap.set(value.id, value.data);
        } else {
          weatherMap.set(value.id, { error: value.error });
        }
      }
    });

    return weatherMap;
  }
};
