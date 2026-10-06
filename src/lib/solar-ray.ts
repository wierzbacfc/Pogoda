/**
 * Moduł obliczeń astronomicznych i optycznego śledzenia promienia słońca (Atmospheric Solar Ray Tracer)
 * Pozwala sprawdzić, czy słońce w danej chwili (lub przed zachodem) jest widoczne, czy też promienie
 * zostaną zablokowane przez odległe chmury na horyzoncie wzdłuż wektora azymutu słońca.
 */

export interface SolarPosition {
  elevation: number; // Wysokość nad horyzontem w stopniach (-90 do +90)
  azimuth: number; // Azymut w stopniach (0 = N, 90 = E, 180 = S, 270 = W)
  isDay: boolean;
  isGoldenHour: boolean; // 0° < elevation <= 6°
  isBlueHour: boolean; // -4° < elevation <= 0°
}

export interface WaypointSample {
  distanceKm: number;
  latitude: number;
  longitude: number;
  rayAltitudeKm: number; // Wysokość promienia nad ziemią w tym punkcie
  cloudCoverTotal: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  weatherCode?: number;
  visibilityKm?: number;
  interceptedLayer: 'none' | 'low' | 'mid' | 'high' | 'exited';
  isObstructed: boolean;
  obstructionSeverity: number; // 0 - 100%
}

export type SolarRayVerdictType =
  | 'CLEAR_DIRECT' // Pełne słońce, brak przeszkód
  | 'GOLDEN_WINDOW' // Złote okno: chmury nad głową, ale czysty horyzont wpuszcza światło od spodu!
  | 'HORIZON_BLOCKED' // Blokada horyzontu: czysto nad głową, ale chmury X km stąd gaszą słońce
  | 'OVERCAST_BLOCKED' // Pełne zachmurzenie (lokalnie i na horyzoncie)
  | 'BELOW_HORIZON'; // Słońce poniżej horyzontu (noc / zmierzch)

export interface SolarRayAnalysis {
  timestamp: number;
  solarPos: SolarPosition;
  verdict: SolarRayVerdictType;
  verdictTitle: string;
  verdictDescription: string;
  collisionDistanceKm: number | null;
  collisionAltitudeKm: number | null;
  collisionLayer: string | null;
  overallSunshineConfidence: number; // 0 - 100%
  waypoints: WaypointSample[];
  sunsetTime: string | null;
  sunriseTime: string | null;
  minutesToSunset: number | null;
}

export interface MultiLocationSolarResponse {
  analysis: SolarRayAnalysis;
  hourlyProjections: {
    time: string;
    solarPos: SolarPosition;
    verdict: SolarRayVerdictType;
    confidence: number;
  }[];
}

/**
 * Precyzyjny algorytm astronomiczny obliczający położenie słońca (PSA / NOAA)
 */
export function calculateSolarPosition(lat: number, lon: number, date: Date = new Date()): SolarPosition {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  const time = date.getTime();
  const jd = time / 86400000 + 2440587.5;
  const d = jd - 2451545.0; // Dni od epoki J2000.0

  // Anomalia średnia słońca
  const g = (357.529 + 0.98560028 * d) % 360;
  // Średnia długość słońca
  const q = (280.459 + 0.98564736 * d) % 360;
  // Długość ekliptyczna słońca
  const L = (q + 1.915 * Math.sin(g * rad) + 0.02 * Math.sin(2 * g * rad)) % 360;

  // Nachylenie ekliptyki
  const e = 23.439 - 0.00000036 * d;

  const sinL = Math.sin(L * rad);
  const cosL = Math.cos(L * rad);
  const sinE = Math.sin(e * rad);
  const cosE = Math.cos(e * rad);

  const ra = Math.atan2(cosE * sinL, cosL) * deg;
  const dec = Math.asin(sinE * sinL) * deg;

  // Czas gwiazdowy w Greenwich (GMST)
  const gmst = (280.46061837 + 360.98564736629 * d) % 360;
  // Lokalny kąt godzinny
  const lmst = (gmst + lon) % 360;
  const H = (lmst - ra) % 360;

  // Kąt elewacji (wysokość nad horyzontem)
  const sinAlt =
    Math.sin(lat * rad) * Math.sin(dec * rad) +
    Math.cos(lat * rad) * Math.cos(dec * rad) * Math.cos(H * rad);
  const alt = Math.asin(sinAlt) * deg;

  // Azymut
  const cosAz =
    (Math.sin(dec * rad) - Math.sin(lat * rad) * sinAlt) /
    (Math.cos(lat * rad) * Math.cos(alt * rad));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * deg;
  if (Math.sin(H * rad) > 0) az = 360 - az;

  return {
    elevation: Math.round(alt * 100) / 100,
    azimuth: Math.round(az * 10) / 10,
    isDay: alt > 0,
    isGoldenHour: alt > 0 && alt <= 6,
    isBlueHour: alt <= 0 && alt >= -4,
  };
}

/**
 * Oblicza współrzędne punktu docelowego w odległości distanceKm i azymucie bearingDeg
 * zgodnie z geodezyjną formułą ortodromy (WGS84 spherical model)
 */
export function getDestinationPoint(
  lat: number,
  lon: number,
  distanceKm: number,
  bearingDeg: number
): { lat: number; lon: number } {
  if (distanceKm === 0) return { lat, lon };

  const R = 6371; // Średni promień Ziemi w km
  const δ = distanceKm / R;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;

  const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * Math.sin(δ) * Math.cos(φ1);
  const x = Math.cos(δ) - Math.sin(φ1) * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  return {
    lat: Math.round(((φ2 * 180) / Math.PI) * 10000) / 10000,
    lon: Math.round((((((λ2 * 180) / Math.PI + 540) % 360) - 180)) * 10000) / 10000,
  };
}

/**
 * Wyznacza wysokość promienia słonecznego w kilometrach na odległości d km od obserwatora,
 * z uwzględnieniem krzywizny Ziemi.
 */
export function calculateRayAltitude(distanceKm: number, elevationDeg: number): number {
  if (distanceKm === 0) return 0;
  const rad = (elevationDeg * Math.PI) / 180;
  const R = 6371; // km
  // Wzór: d * tan(elewacja) + poprawka na krzywiznę ziemi (d^2 / 2R)
  // Gdy Ziemia się zakrzywia "w dół", promień biegnący prosto wznosi się relatywnie wyżej nad poziom gruntu
  const geomAlt = distanceKm * Math.tan(rad);
  const curvatureLift = (distanceKm * distanceKm) / (2 * R);
  return Math.max(0, geomAlt + curvatureLift);
}

/**
 * Dystanse próbkowania wzdłuż wektora azymutu słońca
 */
export const SAMPLE_DISTANCES_KM = [0, 15, 35, 65, 100];

/**
 * Główna funkcja pobierająca dane pogodowe wzdłuż promienia słońca i analizująca kolizje
 */
export async function analyzeSolarRay(
  lat: number,
  lon: number,
  targetDate: Date = new Date()
): Promise<SolarRayAnalysis> {
  const solarPos = calculateSolarPosition(lat, lon, targetDate);

  // Kąt elewacji dla wektora śledzenia chmur:
  // Jeśli słońce jest lekko pod horyzontem (np. tuż po zachodzie), bierzemy kąt tuż przed zachodem (np. 1°)
  // aby pokazać, dlaczego/gdzie zaszło lub kiedy pojawi się jutro
  const activeElevation = Math.max(0.2, solarPos.elevation);

  // Oblicz punkty docelowe na horyzoncie
  const waypointsGeo = SAMPLE_DISTANCES_KM.map(dist => {
    const coords = getDestinationPoint(lat, lon, dist, solarPos.azimuth);
    const rayAlt = calculateRayAltitude(dist, activeElevation);
    return {
      distanceKm: dist,
      lat: coords.lat,
      lon: coords.lon,
      rayAltitudeKm: Math.round(rayAlt * 100) / 100,
    };
  });

  // Przygotuj zbiorcze zapytanie Open-Meteo dla wszystkich 5 punktów
  const latsStr = waypointsGeo.map(p => p.lat).join(',');
  const lonsStr = waypointsGeo.map(p => p.lon).join(',');

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.append('latitude', latsStr);
  url.searchParams.append('longitude', lonsStr);
  url.searchParams.append(
    'current',
    'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,weather_code,visibility'
  );
  url.searchParams.append(
    'hourly',
    'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,is_day,direct_normal_irradiance'
  );
  url.searchParams.append('daily', 'sunrise,sunset');
  url.searchParams.append('forecast_days', '2');
  url.searchParams.append('timezone', 'auto');

  let rawResults: any[] = [];
  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    rawResults = Array.isArray(data) ? data : [data];
  } catch (err) {
    console.warn('Solar ray API fetch fallback:', err);
    // Bezpieczny fallback przy braku sieci
    rawResults = waypointsGeo.map(() => ({
      current: {
        cloud_cover: 30,
        cloud_cover_low: 15,
        cloud_cover_mid: 20,
        cloud_cover_high: 10,
        weather_code: 1,
        visibility: 25000,
      },
      daily: {
        sunrise: ['06:45'],
        sunset: ['18:15'],
      },
    }));
  }

  // Wypełnij próbki waypointów danymi
  const waypoints: WaypointSample[] = waypointsGeo.map((wp, idx) => {
    const raw = rawResults[idx] || rawResults[0] || {};
    const curr = raw.current || {};
    const total = curr.cloud_cover ?? 0;
    const low = curr.cloud_cover_low ?? 0;
    const mid = curr.cloud_cover_mid ?? 0;
    const high = curr.cloud_cover_high ?? 0;
    const weatherCode = curr.weather_code ?? 0;
    const visibilityKm = curr.visibility ? Math.round(curr.visibility / 1000) : 25;

    // Ustal, przez jaką warstwę atmosfery przechodzi promień na danej wysokości
    // Niskie chmury: 0.2 - 2.5 km
    // Średnie chmury: 2.5 - 6.0 km
    // Wysokie chmury: 6.0 - 11.0 km
    // Powyżej 11 km: poza troposferą (czysta przestrzeń)
    const rayAlt = wp.rayAltitudeKm;
    let interceptedLayer: WaypointSample['interceptedLayer'] = 'none';
    let isObstructed = false;
    let severity = 0;

    if (rayAlt <= 2.5) {
      interceptedLayer = 'low';
      severity = low;
      isObstructed = low >= 55;
    } else if (rayAlt <= 6.0) {
      interceptedLayer = 'mid';
      severity = mid;
      isObstructed = mid >= 60;
    } else if (rayAlt <= 11.0) {
      interceptedLayer = 'high';
      severity = high;
      isObstructed = high >= 75; // Wysokie chmury często są cienkie (cirrus)
    } else {
      interceptedLayer = 'exited';
      severity = 0;
      isObstructed = false;
    }

    return {
      distanceKm: wp.distanceKm,
      latitude: wp.lat,
      longitude: wp.lon,
      rayAltitudeKm: wp.rayAltitudeKm,
      cloudCoverTotal: total,
      cloudCoverLow: low,
      cloudCoverMid: mid,
      cloudCoverHigh: high,
      weatherCode,
      visibilityKm,
      interceptedLayer,
      isObstructed,
      obstructionSeverity: severity,
    };
  });

  // Wyszukaj pierwszą kolizję wzdłuż promienia
  let collisionDistanceKm: number | null = null;
  let collisionAltitudeKm: number | null = null;
  let collisionLayer: string | null = null;

  for (const wp of waypoints) {
    if (wp.isObstructed) {
      collisionDistanceKm = wp.distanceKm;
      collisionAltitudeKm = wp.rayAltitudeKm;
      collisionLayer =
        wp.interceptedLayer === 'low'
          ? 'Niskie chmury (Stratus / Cumulus)'
          : wp.interceptedLayer === 'mid'
          ? 'Średnie chmury (Altostratus)'
          : 'Wysokie chmury (Cirrus)';
      break;
    }
  }

  // Oblicz ogólną pewność bezpośredniego słońca (0 - 100%)
  const localClouds = waypoints[0]?.cloudCoverTotal ?? 0;
  const horizonObstructionMax = Math.max(...waypoints.slice(1).map(w => w.obstructionSeverity));

  let confidence = 100;
  if (collisionDistanceKm !== null) {
    confidence = Math.max(0, 100 - (collisionDistanceKm === 0 ? localClouds : horizonObstructionMax));
  } else {
    confidence = Math.max(10, 100 - (localClouds * 0.4 + horizonObstructionMax * 0.6));
  }

  // Informacje o zachodzie i wschodzie z pierwszego punktu
  const daily = rawResults[0]?.daily;
  const sunriseTime = daily?.sunrise?.[0] ? daily.sunrise[0].split('T')[1]?.slice(0, 5) : null;
  const sunsetTime = daily?.sunset?.[0] ? daily.sunset[0].split('T')[1]?.slice(0, 5) : null;

  let minutesToSunset: number | null = null;
  if (daily?.sunset?.[0]) {
    try {
      const sunsetDate = new Date(daily.sunset[0]);
      minutesToSunset = Math.round((sunsetDate.getTime() - targetDate.getTime()) / 60000);
    } catch {}
  }

  // Klasyfikacja werdyktu optycznego
  let verdict: SolarRayVerdictType = 'CLEAR_DIRECT';
  let verdictTitle = '';
  let verdictDescription = '';

  if (!solarPos.isDay && solarPos.elevation < -1) {
    verdict = 'BELOW_HORIZON';
    verdictTitle = 'Słońce poniżej horyzontu';
    verdictDescription =
      sunsetTime
        ? `Słońce już zaszło (zachód o ${sunsetTime}). Kolejny wschód słońca spodziewany o ${sunriseTime || 'świcie'}.`
        : 'Słońce znajduje się obecnie poniżej linii horyzontu.';
  } else {
    const isLocalCloudy = (waypoints[0]?.cloudCoverLow ?? 0) > 55 || (waypoints[0]?.cloudCoverTotal ?? 0) > 75;
    const isHorizonClear = !waypoints.slice(1).some(w => w.isObstructed);

    if (isLocalCloudy && isHorizonClear && solarPos.elevation > 0 && solarPos.elevation <= 18) {
      // Magiczny scenariusz: złote okno pod chmurami!
      verdict = 'GOLDEN_WINDOW';
      verdictTitle = 'Złote okno pod chmurami!';
      verdictDescription = `Nad Twoją lokalizacją wisi zachmurzenie, ale linia horyzontu ku słońcu (${solarPos.azimuth}° ${getCardinalName(
        solarPos.azimuth
      )}) na dystansie 15–65 km jest czysta! Promienie wpadną pod podstawę chmur i rozświetlą niebo.`;
    } else if (!isLocalCloudy && collisionDistanceKm !== null && collisionDistanceKm > 0) {
      // Scenariusz horyzontalny: czysto nad głową, ale blokada na horyzoncie
      verdict = 'HORIZON_BLOCKED';
      verdictTitle = `Blokada chmur na horyzoncie (${collisionDistanceKm} km)`;
      verdictDescription = `Mimo że nad Twoją głową jest pogodnie, promień słońca przecina gęstą warstwę chmur oddaloną o ok. ${collisionDistanceKm} km w kierunku słońca. Słońce schowa się w chmurach przed faktycznym zachodem.`;
    } else if (isLocalCloudy && !isHorizonClear) {
      // Pełne zachmurzenie
      verdict = 'OVERCAST_BLOCKED';
      verdictTitle = 'Całkowita blokada chmurowa';
      verdictDescription = `Zarówno nad Twoją lokalizacją, jak i wzdłuż całej linii wzroku ku słońcu występuje gęste zachmurzenie. Bezpośrednie promienie słońca są całkowicie zablokowane.`;
    } else {
      // Czysty promień słońca
      verdict = 'CLEAR_DIRECT';
      verdictTitle = solarPos.isGoldenHour ? 'Złota Godzina – czyste słońce!' : 'Czysty promień – pełne słońce';
      verdictDescription = `Wektor promienia słonecznego (kąt ${solarPos.elevation}°, azymut ${solarPos.azimuth}°) dociera bez kolizji z chmurami na pełnym dystansie ponad 65 km. Czyste niebo gwarantuje pełne nasłonecznienie.`;
    }
  }

  return {
    timestamp: targetDate.getTime(),
    solarPos,
    verdict,
    verdictTitle,
    verdictDescription,
    collisionDistanceKm,
    collisionAltitudeKm,
    collisionLayer,
    overallSunshineConfidence: Math.round(confidence),
    waypoints,
    sunsetTime,
    sunriseTime,
    minutesToSunset,
  };
}

/**
 * Zwraca polską nazwę kierunku kardynalnego dla zadanego azymutu
 */
export function getCardinalName(azimuthDeg: number): string {
  const directions = [
    { name: 'Północ (N)', code: 'N' },
    { name: 'Północny Wschód (NE)', code: 'NE' },
    { name: 'Wschód (E)', code: 'E' },
    { name: 'Południowy Wschód (SE)', code: 'SE' },
    { name: 'Południe (S)', code: 'S' },
    { name: 'Południowy Zachód (SW)', code: 'SW' },
    { name: 'Zachód (W)', code: 'W' },
    { name: 'Północny Zachód (NW)', code: 'NW' },
  ];
  const idx = Math.round(azimuthDeg / 45) % 8;
  return directions[idx].code;
}

export interface SunshineInterval {
  time: string; // "18:15"
  isoTime: string;
  minutesFromNow: number; // 0, 15, 30, ...
  probability: number; // 0 - 100%
  sunshineMinutes: number; // np. 12 min
  cloudCover: number; // 0 - 100%
  cloudCoverLow: number;
  cloudCoverMid: number;
  dni: number; // W/m2
  isDay: boolean;
  elevation: number;
  status: 'sunny' | 'partly' | 'cloudy' | 'night';
  statusText: string;
}

export interface TwoHourSunshineNowcast {
  timestamp: number;
  currentProbability: number;
  totalSunshineMinutes: number; // Łączny czas słońca w minutach w 2h (max 120)
  bestWindow: string | null; // np. "18:30 - 19:15"
  summaryTitle: string;
  summaryDescription: string;
  intervals: SunshineInterval[];
  solarPos: SolarPosition;
  sunsetTime: string | null;
  sunriseTime: string | null;
  minutesToSunset: number | null;
}

/**
 * Pobiera i oblicza 2-godzinny nowcasting prawdopodobieństwa słońca (krok co 15 minut)
 * w punkcie obserwatora.
 */
export async function getTwoHourSunshineNowcast(
  lat: number,
  lon: number,
  startDate: Date = new Date()
): Promise<TwoHourSunshineNowcast> {
  const solarPos = calculateSolarPosition(lat, lon, startDate);

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.append('latitude', lat.toString());
  url.searchParams.append('longitude', lon.toString());
  url.searchParams.append(
    'minutely_15',
    'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,direct_normal_irradiance,sunshine_duration,is_day'
  );
  url.searchParams.append('daily', 'sunrise,sunset');
  url.searchParams.append('forecast_days', '2');
  url.searchParams.append('timezone', 'auto');

  let rawData: any = null;
  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    rawData = await res.json();
  } catch (err) {
    console.warn('Fallback in getTwoHourSunshineNowcast:', err);
    // Bezpieczny fallback w trybie offline
    const fallbackIntervals: SunshineInterval[] = [];
    for (let i = 0; i < 9; i++) {
      const d = new Date(startDate.getTime() + i * 15 * 60000);
      const pos = calculateSolarPosition(lat, lon, d);
      const isUp = pos.elevation > 0;
      fallbackIntervals.push({
        time: d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        isoTime: d.toISOString(),
        minutesFromNow: i * 15,
        probability: isUp ? 50 : 0,
        sunshineMinutes: isUp ? 7.5 : 0,
        cloudCover: isUp ? 50 : 100,
        cloudCoverLow: 30,
        cloudCoverMid: 20,
        dni: isUp ? 300 : 0,
        isDay: isUp,
        elevation: pos.elevation,
        status: isUp ? 'partly' : 'night',
        statusText: isUp ? 'Przejaśnienia' : 'Noc',
      });
    }
    return {
      timestamp: startDate.getTime(),
      currentProbability: fallbackIntervals[0].probability,
      totalSunshineMinutes: fallbackIntervals.reduce((acc, it) => acc + it.sunshineMinutes, 0),
      bestWindow: null,
      summaryTitle: 'Prognoza orientacyjna (offline)',
      summaryDescription: 'Brak aktywnego połączenia z siecią.',
      intervals: fallbackIntervals,
      solarPos,
      sunsetTime: null,
      sunriseTime: null,
      minutesToSunset: null,
    };
  }

  const m = rawData.minutely_15 || {};
  const times: string[] = m.time || [];
  const currentSlotTime = new Date(Math.floor(startDate.getTime() / (15 * 60000)) * (15 * 60000));
  let startIdx = times.findIndex(t => new Date(t) >= currentSlotTime);
  if (startIdx === -1) startIdx = 0;

  const intervals: SunshineInterval[] = [];
  let totalMinutes = 0;
  let sunnyRunStart: string | null = null;
  let sunnyRunEnd: string | null = null;
  let maxRunMinutes = 0;

  for (let i = 0; i < 9; i++) {
    const idx = startIdx + i;
    if (idx >= times.length) break;

    const t = times[idx];
    const durSec = m.sunshine_duration?.[idx] ?? 0;
    const isDay = m.is_day?.[idx] ?? 0;
    const clouds = m.cloud_cover?.[idx] ?? 0;
    const low = m.cloud_cover_low?.[idx] ?? 0;
    const mid = m.cloud_cover_mid?.[idx] ?? 0;
    const dni = m.direct_normal_irradiance?.[idx] ?? 0;

    const timeDate = new Date(t);
    const pos = calculateSolarPosition(lat, lon, timeDate);

    let prob = 0;
    let status: SunshineInterval['status'] = 'night';
    let statusText = 'Noc';

    if (pos.elevation > 0 && isDay === 1) {
      if (durSec > 0) {
        prob = Math.min(100, Math.round((durSec / 900) * 100));
      } else {
        prob = Math.max(0, Math.min(100, Math.round(100 - clouds)));
        if (dni === 0 && clouds > 60) prob = 0;
      }

      if (prob >= 75) {
        status = 'sunny';
        statusText = 'Pełne słońce';
      } else if (prob >= 35) {
        status = 'partly';
        statusText = 'Przejaśnienia';
      } else {
        status = 'cloudy';
        statusText = 'Gęste chmury';
      }
    } else {
      prob = 0;
      status = 'night';
      statusText = pos.elevation <= -0.5 ? 'Po zachodzie słońca' : 'Słońce na horyzoncie';
    }

    const sunshineMin = Math.round((prob / 100) * 15 * 10) / 10;
    totalMinutes += sunshineMin;

    const displayTime = t.split('T')[1]?.slice(0, 5) || t;

    if (prob >= 40) {
      if (!sunnyRunStart) sunnyRunStart = displayTime;
      sunnyRunEnd = displayTime;
    }

    intervals.push({
      time: displayTime,
      isoTime: t,
      minutesFromNow: i * 15,
      probability: prob,
      sunshineMinutes: sunshineMin,
      cloudCover: clouds,
      cloudCoverLow: low,
      cloudCoverMid: mid,
      dni,
      isDay: isDay === 1 && pos.elevation > 0,
      elevation: pos.elevation,
      status,
      statusText,
    });
  }

  // Obliczenia zachodu słońca
  const daily = rawData.daily || {};
  const sunsetStr = daily.sunset?.[0];
  const sunriseStr = daily.sunrise?.[0];
  const sunsetTime = sunsetStr ? sunsetStr.split('T')[1]?.slice(0, 5) : null;
  const sunriseTime = sunriseStr ? sunriseStr.split('T')[1]?.slice(0, 5) : null;

  let minutesToSunset: number | null = null;
  if (sunsetStr) {
    try {
      const sDate = new Date(sunsetStr);
      minutesToSunset = Math.round((sDate.getTime() - startDate.getTime()) / 60000);
    } catch {}
  }

  const bestWindow = sunnyRunStart && sunnyRunEnd ? `${sunnyRunStart} – ${sunnyRunEnd}` : null;
  const currentProbability = intervals[0]?.probability ?? 0;
  const roundedTotalMinutes = Math.min(120, Math.round(totalMinutes));

  let summaryTitle = '';
  let summaryDescription = '';

  if (solarPos.elevation <= 0) {
    summaryTitle = 'Słońce poniżej horyzontu';
    summaryDescription = sunsetTime
      ? `Słońce zaszło (o ${sunsetTime}). Kolejne bezpośrednie słońce pojawi się o świcie (ok. ${sunriseTime || '06:30'}).`
      : 'Brak bezpośredniego słońca w najbliższych 2 godzinach (noc).';
  } else if (roundedTotalMinutes >= 70) {
    summaryTitle = `Dużo słońca: ok. ${roundedTotalMinutes} min w 2h`;
    summaryDescription = `W Twojej lokalizacji dominować będą bardzo dobre warunki słoneczne (szansa do ${Math.max(
      ...intervals.map(it => it.probability)
    )}%).`;
  } else if (roundedTotalMinutes >= 20) {
    summaryTitle = `Okresowe słońce: łącznie ~${roundedTotalMinutes} min`;
    summaryDescription = bestWindow
      ? `Największa szansa na bezpośrednie słońce wystąpi w oknie ${bestWindow}.`
      : 'Słońce będzie okresowo wyglądać zza chmur w ciągu najbliższych 2 godzin.';
  } else if (minutesToSunset !== null && minutesToSunset > 0 && minutesToSunset <= 120) {
    summaryTitle = `Słońce zachodzi za ${minutesToSunset} min`;
    summaryDescription = `Zachód słońca o ${sunsetTime}. Przed zachodem szansa na bezpośrednie promienie wynosi ${currentProbability}%.`;
  } else {
    summaryTitle = 'Brak lub znikome słońce (<15 min)';
    summaryDescription = 'Przewidywane jest gęste zachmurzenie blokujące bezpośrednie promienie słoneczne.';
  }

  return {
    timestamp: startDate.getTime(),
    currentProbability,
    totalSunshineMinutes: roundedTotalMinutes,
    bestWindow,
    summaryTitle,
    summaryDescription,
    intervals,
    solarPos,
    sunsetTime,
    sunriseTime,
    minutesToSunset,
  };
}
