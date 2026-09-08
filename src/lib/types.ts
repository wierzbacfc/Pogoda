export interface City {
  id: number | 'gps';
  name: string;
  country_code?: string;
  admin1?: string;
  latitude: number | null;
  longitude: number | null;
  isGps: boolean;
  order?: number;
  subtitle?: string;
}

export interface WeatherCache {
  fetchedAt: number;
  lat: number;
  lon: number;
  data: OpenMeteoResponse;
  airQuality?: AirQualityData;
}

export interface OpenMeteoResponse {
  hourly: HourlyData;
  daily: DailyData;
  timezone: string;
  utc_offset_seconds: number;
}

export interface AirQualityHourly {
  time: string[];
  european_aqi: number[];
  pm10: number[];
  pm2_5: number[];
}

export interface AirQualityData {
  european_aqi?: number;
  pm10?: number;
  pm2_5?: number;
  hourly?: AirQualityHourly;
}

export interface HourlyData {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  precipitation: number[];
  weathercode: number[];
  windspeed_10m: number[];
  winddirection_10m: number[];
  relativehumidity_2m: number[];
  uv_index: number[];
  visibility: number[];
  surface_pressure?: number[];
  windgusts_10m?: number[];
  cloudcover?: number[];
  cloud_cover_low?: number[];
  cloud_cover_high?: number[];
  is_day: number[];
}

export interface DailyData {
  time: string[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  apparent_temperature_max: number[];
  apparent_temperature_min: number[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  windspeed_10m_max: number[];
  winddirection_10m_dominant: number[];
  sunrise: string[];
  sunset: string[];
  uv_index_max: number[];
}

export interface WeatherResult {
  hourly: HourlyData;
  daily: DailyData;
  timezone: string;
  utc_offset_seconds: number;
  airQuality?: AirQualityData;
  meta: {
    fetchedAt: number;
    fromCache: boolean;
    isFallback?: boolean;
    lat: number;
    lon: number;
  };
}

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country_code: string;
  country: string;
  admin1: string;
}

export type TemperatureUnit = 'C' | 'F';
export type ViewName = 'dashboard' | 'cities' | 'settings';
