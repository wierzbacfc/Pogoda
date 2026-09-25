import { HourlyData, AirQualityData } from './types';

export type CommuteVerdict = 'yes' | 'warning' | 'no';

export interface CommuteHourDetail {
  index: number;
  timeStr: string; // np. "06:00", "07:00"
  dateStr: string; // np. "2026-09-26"
  hourNum: number; // np. 6, 7, 8, 9
  temp: number;
  feelsLike: number;
  precipitation: number; // mm
  precipProb: number; // %
  weatherCode: number;
  windSpeed: number; // km/h
  windGusts: number; // km/h
  isDay: boolean;
  score: number; // 0 - 100
  isRain: boolean;
}

export type CommuteWindowType = 'morning' | 'afternoon';

export interface CommuteWindow {
  type: CommuteWindowType;
  title: string; // "Dojazd do pracy" lub "Powrót z pracy"
  timeRange: string; // "06:00 – 09:00" lub "14:00 – 17:00"
  hours: CommuteHourDetail[];

  // Agregaty
  totalPrecip: number;
  maxPrecipProb: number;
  maxRainHour: number;
  tempMin: number;
  tempMax: number;
  feelsMin: number;
  feelsMax: number;
  maxGusts: number;
  avgWind: number;

  // Ocena okna
  canRide: CommuteVerdict;
  verdictLabel: string;
  verdictDesc: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
}

export interface CommuteAnalysis {
  contextMode: 'today_both' | 'today_return' | 'tomorrow_both';
  contextTitle: string; // "Dojazdy dziś", "Powrót z pracy", "Dojazd jutro"
  targetDateStr: string; // "2026-09-26"
  targetDateFormatted: string; // np. "Jutro (26 września)"

  windows: CommuteWindow[]; // 1 lub 2 okna
  immediateHours: CommuteHourDetail[]; // 4 najbliższe godziny od teraz

  // Całościowa ocena
  canRideOverall: CommuteVerdict;
  overallScore: number;
  overallVerdict: string; // "Można jechać", "Ryzyko opadów", "Odradzamy rower"
  overallSummary: string; // krótki opis inline do kafelka
  detailedAdvice: string; // szczegółowy opis w dymku

  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

function formatCommuteDate(isoDate: string, prefix: string): string {
  try {
    const d = new Date(isoDate + 'T12:00:00Z');
    const months = [
      'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
      'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
    ];
    const dayNum = d.getUTCDate();
    const monthName = months[d.getUTCMonth()];
    return `${prefix}, ${dayNum} ${monthName}`;
  } catch {
    return prefix;
  }
}

function findHourIndex(hourlyData: HourlyData, dateStr: string, hour: number): number {
  const hourPadded = hour < 10 ? `0${hour}` : `${hour}`;
  const prefix = `${dateStr}T${hourPadded}`;
  const idx = hourlyData.time.findIndex((t) => t.startsWith(prefix));
  return idx;
}

function calculateHourDetail(
  hourlyData: HourlyData,
  idx: number,
  fallbackHour: number,
  fallbackDateStr: string,
  airQuality?: AirQualityData
): CommuteHourDetail {
  const rawTime = hourlyData.time[idx] || '';
  const timeStr = rawTime.length >= 16 ? rawTime.slice(11, 16) : `${fallbackHour < 10 ? '0' : ''}${fallbackHour}:00`;
  const dateStr = rawTime.length >= 10 ? rawTime.slice(0, 10) : fallbackDateStr;

  const temp = Math.round(hourlyData.temperature_2m[idx] ?? 15);
  const feelsLike = Math.round(hourlyData.apparent_temperature[idx] ?? temp);
  const precipitation = Number((hourlyData.precipitation[idx] ?? 0).toFixed(1));
  const precipProb = Math.round(hourlyData.precipitation_probability?.[idx] ?? 0);
  const weatherCode = hourlyData.weathercode[idx] ?? 0;
  const windSpeed = Math.round(hourlyData.windspeed_10m[idx] ?? 0);
  const windGusts = Math.round(hourlyData.windgusts_10m?.[idx] ?? windSpeed * 1.35);
  const isDay = (hourlyData.is_day?.[idx] ?? 1) === 1;
  const aqi = airQuality?.european_aqi ?? 25;

  let score = 100;
  let isRain = false;

  // 1. Deszcz i zjawiska niebezpieczne
  if (weatherCode >= 95) {
    score = 0;
    isRain = true;
  } else if ([56, 57, 66, 67, 71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    score = Math.min(score, 10);
    isRain = true;
  } else if (precipitation >= 1.5 || [65, 82].includes(weatherCode)) {
    score = Math.min(score, 10);
    isRain = true;
  } else if (precipitation >= 0.5 || [63, 81].includes(weatherCode)) {
    score = Math.min(score, 30);
    isRain = true;
  } else if (precipitation > 0.1 || [51, 53, 55, 61, 80].includes(weatherCode)) {
    score = Math.min(score, 50);
    isRain = true;
  } else if (precipProb >= 65) {
    score -= 25;
  } else if (precipProb >= 35) {
    score -= 10;
  }

  // 2. Wiatr
  if (windGusts >= 55 || windSpeed >= 38) {
    score = Math.min(score, 15);
  } else if (windGusts >= 42 || windSpeed >= 28) {
    score -= 25;
  } else if (windSpeed >= 18) {
    score -= 10;
  }

  // 3. Temperatura
  if (feelsLike < 0) {
    score = Math.min(score, 20);
  } else if (feelsLike <= 5) {
    score -= 20;
  } else if (feelsLike <= 10) {
    score -= 10;
  } else if (feelsLike > 32) {
    score -= 25;
  }

  // 4. Jakość powietrza
  if (aqi > 75) {
    score = Math.min(score, 30);
  } else if (aqi > 50) {
    score -= 12;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    index: idx,
    timeStr,
    dateStr,
    hourNum: fallbackHour,
    temp,
    feelsLike,
    precipitation,
    precipProb,
    weatherCode,
    windSpeed,
    windGusts,
    isDay,
    score,
    isRain,
  };
}

function calculateCommuteWindow(
  hourlyData: HourlyData,
  dateStr: string,
  type: CommuteWindowType,
  airQuality?: AirQualityData
): CommuteWindow {
  const hoursConfig = type === 'morning' ? [6, 7, 8, 9] : [14, 15, 16, 17];
  const title = type === 'morning' ? 'Dojazd do pracy' : 'Powrót z pracy';
  const timeRange = type === 'morning' ? '06:00 – 09:00' : '14:00 – 17:00';

  const hourDetails: CommuteHourDetail[] = [];

  for (const h of hoursConfig) {
    let idx = findHourIndex(hourlyData, dateStr, h);
    if (idx === -1) {
      // Fallback: jeśli z jakiegoś powodu brak dokładnie tej godziny w time
      idx = Math.max(0, Math.min(hourlyData.time.length - 1, h));
    }
    hourDetails.push(calculateHourDetail(hourlyData, idx, h, dateStr, airQuality));
  }

  // Obliczenie agregatów
  const totalPrecip = Number(hourDetails.reduce((sum, h) => sum + h.precipitation, 0).toFixed(1));
  const maxPrecipProb = Math.max(...hourDetails.map((h) => h.precipProb));
  const maxRainHour = Math.max(...hourDetails.map((h) => h.precipitation));
  const tempMin = Math.min(...hourDetails.map((h) => h.temp));
  const tempMax = Math.max(...hourDetails.map((h) => h.temp));
  const feelsMin = Math.min(...hourDetails.map((h) => h.feelsLike));
  const feelsMax = Math.max(...hourDetails.map((h) => h.feelsLike));
  const maxGusts = Math.max(...hourDetails.map((h) => h.windGusts));
  const avgWind = Math.round(hourDetails.reduce((sum, h) => sum + h.windSpeed, 0) / hourDetails.length);
  const anyStorm = hourDetails.some((h) => h.weatherCode >= 95);
  const anySnow = hourDetails.some((h) => [56, 57, 66, 67, 71, 73, 75, 77, 85, 86].includes(h.weatherCode));

  let canRide: CommuteVerdict = 'yes';
  let verdictLabel = 'Sucho i stabilnie';
  let verdictDesc = 'Brak opadów deszczu, umiarkowany wiatr – idealne warunki na trasie.';
  let badgeBg = 'bg-emerald-500/20';
  let badgeBorder = 'border-emerald-400/40';
  let badgeText = 'text-emerald-300';
  let dotColor = 'bg-emerald-400';

  // Weryfikacja przeszkód – priorytet: OPADY i BEZPIECZEŃSTWO
  if (totalPrecip >= 1.5 || maxRainHour >= 1.0 || anyStorm || anySnow || maxGusts >= 55) {
    canRide = 'no';
    badgeBg = 'bg-rose-500/20';
    badgeBorder = 'border-rose-400/40';
    badgeText = 'text-rose-300';
    dotColor = 'bg-rose-400';

    if (anyStorm) {
      verdictLabel = 'Burza z piorunami';
      verdictDesc = 'Zagrożenie wyładowaniami atmosferycznymi – odradzamy rower!';
    } else if (totalPrecip >= 1.5 || maxRainHour >= 1.0) {
      verdictLabel = `Ulewa (${totalPrecip.toFixed(1)} mm)`;
      verdictDesc = `Prognozowany intensywny deszcz (${totalPrecip.toFixed(1)} mm) – mocno zmokniesz.`;
    } else if (maxGusts >= 55) {
      verdictLabel = `Wichura (${maxGusts} km/h)`;
      verdictDesc = `Niebezpieczne porywy wiatru utrudniające panowanie nad rowerem.`;
    } else {
      verdictLabel = 'Śnieg / oblodzenie';
      verdictDesc = 'Śliska nawierzchnia – wysokie ryzyko upadku.';
    }
  } else if (totalPrecip > 0.1 || maxPrecipProb >= 40 || maxGusts >= 38 || feelsMin < 2) {
    canRide = 'warning';
    badgeBg = 'bg-amber-500/20';
    badgeBorder = 'border-amber-400/40';
    badgeText = 'text-amber-300';
    dotColor = 'bg-amber-400';

    if (totalPrecip > 0.1) {
      verdictLabel = `Deszcz (${totalPrecip.toFixed(1)} mm)`;
      verdictDesc = `Możliwe opady deszczu (${totalPrecip.toFixed(1)} mm) – przygotuj błotniki i pelerynę.`;
    } else if (maxPrecipProb >= 40) {
      verdictLabel = `Ryzyko opadów (${maxPrecipProb}%)`;
      verdictDesc = `Podwyższone ryzyko deszczu (${maxPrecipProb}%) – miej przy sobie kurtkę.`;
    } else if (maxGusts >= 38) {
      verdictLabel = `Porywy wiatru (${maxGusts} km/h)`;
      verdictDesc = `Odczuwalny opór wiatru na otwartych przestrzeniach.`;
    } else {
      verdictLabel = `Chłód (${feelsMin}°C)`;
      verdictDesc = `Niska temperatura odczuwalna – załóż cieplejsze rękawiczki.`;
    }
  }

  return {
    type,
    title,
    timeRange,
    hours: hourDetails,
    totalPrecip,
    maxPrecipProb,
    maxRainHour,
    tempMin,
    tempMax,
    feelsMin,
    feelsMax,
    maxGusts,
    avgWind,
    canRide,
    verdictLabel,
    verdictDesc,
    badgeBg,
    badgeBorder,
    badgeText,
    dotColor,
  };
}

export function getCommuteAnalysis(
  hourlyData: HourlyData,
  currentIdx: number,
  airQuality?: AirQualityData
): CommuteAnalysis {
  const currentTimeStr = hourlyData.time[currentIdx] || '';
  const currentDateStr = currentTimeStr ? currentTimeStr.split('T')[0] : new Date().toISOString().split('T')[0];
  let simulatedHour: number | null = null;
  if (typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const qHour = urlParams.get('commuteHour');
      if (qHour !== null) {
        simulatedHour = parseInt(qHour, 10);
      }
    } catch {}
  }

  const currentHour = simulatedHour !== null && !isNaN(simulatedHour)
    ? simulatedHour
    : (currentTimeStr ? parseInt(currentTimeStr.split('T')[1]?.slice(0, 2) || '12', 10) : new Date().getHours());

  // Obliczenie daty jutrzejszej (kolejny dzień kalendarzowy)
  const curDateObj = new Date(currentDateStr + 'T12:00:00Z');
  curDateObj.setUTCDate(curDateObj.getUTCDate() + 1);
  const tomorrowDateStr = curDateObj.toISOString().split('T')[0];

  let contextMode: 'today_both' | 'today_return' | 'tomorrow_both' = 'tomorrow_both';
  let contextTitle = 'Dojazd jutro';
  let targetDateStr = tomorrowDateStr;
  let targetDateFormatted = formatCommuteDate(tomorrowDateStr, 'Jutro');
  const windows: CommuteWindow[] = [];

  // Logika godzinowa użytkownika:
  // 1. Przed 10:00 rano -> sprawdzamy DZIŚ (oba okna: 6-9 oraz 14-17)
  // 2. Między 10:00 a 17:00 -> okno poranne minęło, podajemy TYLKO powrót z pracy (14-17 na DZIŚ)
  // 3. Po 17:00 -> oba okna minęły, sprawdzamy JUTRO (oba okna: 6-9 oraz 14-17)
  if (currentHour < 10) {
    contextMode = 'today_both';
    contextTitle = 'Dojazdy dziś';
    targetDateStr = currentDateStr;
    targetDateFormatted = formatCommuteDate(currentDateStr, 'Dziś');
    windows.push(calculateCommuteWindow(hourlyData, currentDateStr, 'morning', airQuality));
    windows.push(calculateCommuteWindow(hourlyData, currentDateStr, 'afternoon', airQuality));
  } else if (currentHour >= 10 && currentHour < 17) {
    contextMode = 'today_return';
    contextTitle = 'Powrót z pracy';
    targetDateStr = currentDateStr;
    targetDateFormatted = formatCommuteDate(currentDateStr, 'Dziś');
    windows.push(calculateCommuteWindow(hourlyData, currentDateStr, 'afternoon', airQuality));
  } else {
    contextMode = 'tomorrow_both';
    contextTitle = 'Dojazd jutro';
    targetDateStr = tomorrowDateStr;
    targetDateFormatted = formatCommuteDate(tomorrowDateStr, 'Jutro');
    windows.push(calculateCommuteWindow(hourlyData, tomorrowDateStr, 'morning', airQuality));
    windows.push(calculateCommuteWindow(hourlyData, tomorrowDateStr, 'afternoon', airQuality));
  }

  // Całościowy werdykt (agregacja okien)
  const hasNo = windows.some((w) => w.canRide === 'no');
  const hasWarning = windows.some((w) => w.canRide === 'warning');

  let canRideOverall: CommuteVerdict = 'yes';
  let overallVerdict = 'Można jechać';
  let badgeBg = 'bg-emerald-500/20';
  let badgeBorder = 'border-emerald-400/40';
  let badgeText = 'text-emerald-300';

  if (hasNo) {
    canRideOverall = 'no';
    overallVerdict = 'Odradzamy rower';
    badgeBg = 'bg-rose-500/20';
    badgeBorder = 'border-rose-400/40';
    badgeText = 'text-rose-300';
  } else if (hasWarning) {
    canRideOverall = 'warning';
    overallVerdict = 'Ryzyko opadów';
    badgeBg = 'bg-amber-500/20';
    badgeBorder = 'border-amber-400/40';
    badgeText = 'text-amber-300';
  }

  // Krótkie podsumowanie inline do kafelka
  let overallSummary = '';
  if (windows.length === 1) {
    const w = windows[0];
    overallSummary = `${w.timeRange}: ${w.tempMin}–${w.tempMax}° • ${w.totalPrecip > 0 ? w.totalPrecip.toFixed(1) + ' mm' : 'sucho'}`;
  } else {
    const m = windows[0];
    const a = windows[1];
    overallSummary = `Rano: ${m.totalPrecip > 0 ? m.totalPrecip.toFixed(1) + 'mm' : '0mm'} (${m.tempMin}–${m.tempMax}°) • Powrót: ${a.totalPrecip > 0 ? a.totalPrecip.toFixed(1) + 'mm' : '0mm'} (${a.tempMin}–${a.tempMax}°)`;
  }

  // Szczegółowy opis werdyktu do rozwiniętego dymka
  let detailedAdvice = '';
  if (canRideOverall === 'yes') {
    detailedAdvice = 'W prognozowanych oknach dojazdowych panują doskonałe, bezdeszczowe warunki. Sucha nawierzchnia i umiarkowany wiatr sprzyjają komfortowej jeździe rowerem.';
  } else if (canRideOverall === 'warning') {
    if (windows.length === 2 && windows[0].canRide === 'yes' && windows[1].canRide !== 'yes') {
      detailedAdvice = `Rano trasa bez opadów, lecz w oknie popołudniowym (powrót) spodziewane jest pogorszenie (${windows[1].verdictLabel.toLowerCase()}). Przygotuj odzież przeciwdeszczową na powrót.`;
    } else if (windows.length === 2 && windows[0].canRide !== 'yes' && windows[1].canRide === 'yes') {
      detailedAdvice = `W oknie porannym możliwe utrudnienia (${windows[0].verdictLabel.toLowerCase()}), natomiast na powrót warunki będą już dobre i suche.`;
    } else {
      detailedAdvice = 'Występuje podwyższone ryzyko przelotnych opadów deszczu lub odczuwalny wiatr. Trasa jest przejezdna, lecz zalecamy ostrożność i pelerynę.';
    }
  } else {
    detailedAdvice = 'W kluczowych godzinach dojazdu prognozowane są intensywne opady lub niebezpieczne warunki. Ze względu na komfort i bezpieczeństwo zalecamy wybór innego transportu.';
  }

  // 4 najbliższe godziny od teraz (bieżące warunki + kolejne 3h)
  const immediateHours: CommuteHourDetail[] = [];
  for (let i = 0; i < 4; i++) {
    const idx = currentIdx + i;
    if (idx < hourlyData.time.length) {
      const rawTime = hourlyData.time[idx] || '';
      const hourNum = rawTime.length >= 13 ? parseInt(rawTime.slice(11, 13), 10) : (currentHour + i) % 24;
      const dStr = rawTime.length >= 10 ? rawTime.slice(0, 10) : currentDateStr;
      const detail = calculateHourDetail(hourlyData, idx, hourNum, dStr, airQuality);
      if (i === 0) {
        detail.timeStr = 'Teraz';
      }
      immediateHours.push(detail);
    }
  }

  // Całościowy score
  const avgScore = Math.round(
    windows.reduce((sum, w) => sum + Math.round(w.hours.reduce((hSum, h) => hSum + h.score, 0) / w.hours.length), 0) /
      windows.length
  );

  return {
    contextMode,
    contextTitle,
    targetDateStr,
    targetDateFormatted,
    windows,
    immediateHours,
    canRideOverall,
    overallScore: avgScore,
    overallVerdict,
    overallSummary,
    detailedAdvice,
    badgeBg,
    badgeBorder,
    badgeText,
  };
}

// Kompatybilność wsteczna dla getCyclingAnalysis (jeśli gdzieś byłby odwołany)
export const getCyclingAnalysis = getCommuteAnalysis;
