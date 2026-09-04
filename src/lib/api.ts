import { GeocodingResult, OpenMeteoResponse, AirQualityData } from './types';

const GEO_BASE = 'https://geocoding-api.open-meteo.com/v1';
const WEATHER_BASE = 'https://api.open-meteo.com/v1';
const AIR_QUALITY_BASE = 'https://air-quality-api.open-meteo.com/v1';

export async function searchCity(query: string): Promise<GeocodingResult[]> {
  if (!query || query.length < 2) return [];
  
  const url = new URL(`${GEO_BASE}/search`);
  url.searchParams.append('name', query);
  url.searchParams.append('count', '8');
  url.searchParams.append('language', 'pl');
  url.searchParams.append('format', 'json');
  
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error('Failed to search city');
  }
  
  const data = await res.json();
  return data.results || [];
}

export async function fetchWeatherData(lat: number, lon: number): Promise<OpenMeteoResponse> {
  const url = new URL(`${WEATHER_BASE}/forecast`);
  
  url.searchParams.append('latitude', lat.toString());
  url.searchParams.append('longitude', lon.toString());
  url.searchParams.append(
    'hourly',
    'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weathercode,windspeed_10m,winddirection_10m,relativehumidity_2m,uv_index,visibility,surface_pressure,windgusts_10m,cloudcover,is_day'
  );
  url.searchParams.append(
    'daily',
    'weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,winddirection_10m_dominant,sunrise,sunset,uv_index_max'
  );
  url.searchParams.append('timezone', 'auto');
  url.searchParams.append('forecast_days', '15');
  url.searchParams.append('wind_speed_unit', 'kmh');
  
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error('Failed to fetch weather data');
  }
  
  return res.json();
}

export async function fetchAirQuality(lat: number, lon: number): Promise<AirQualityData | null> {
  try {
    const url = new URL(`${AIR_QUALITY_BASE}/air-quality`);
    url.searchParams.append('latitude', lat.toString());
    url.searchParams.append('longitude', lon.toString());
    url.searchParams.append('current', 'european_aqi,pm10,pm2_5');
    url.searchParams.append('hourly', 'european_aqi,pm10,pm2_5');
    url.searchParams.append('forecast_days', '2');
    url.searchParams.append('timezone', 'auto');

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = await res.json();
    if (data && data.current) {
      return {
        european_aqi: data.current.european_aqi,
        pm10: data.current.pm10,
        pm2_5: data.current.pm2_5,
        hourly: data.hourly
          ? {
              time: data.hourly.time || [],
              european_aqi: data.hourly.european_aqi || [],
              pm10: data.hourly.pm10 || [],
              pm2_5: data.hourly.pm2_5 || [],
            }
          : undefined,
      };
    }
    return null;
  } catch (err) {
    console.warn('Air quality fetch fallback:', err);
    return null;
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
    url.searchParams.append('latitude', lat.toString());
    url.searchParams.append('longitude', lon.toString());
    url.searchParams.append('localityLanguage', 'pl');
    
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || null;
  } catch (error) {
    console.warn('Reverse geocode fallback:', error);
    return null;
  }
}
