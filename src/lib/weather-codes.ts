import { DailyData, HourlyData } from './types';

export const WEATHER_CODES: Record<number, { label: string }> = {
  0: { label: 'Czyste niebo' },
  1: { label: 'Głównie bezchmurnie' },
  2: { label: 'Częściowe zachmurzenie' },
  3: { label: 'Pochmurno' },
  45: { label: 'Mgła' },
  48: { label: 'Osadzająca się mgła' },
  51: { label: 'Lekka mżawka' },
  53: { label: 'Umiarkowana mżawka' },
  55: { label: 'Gęsta mżawka' },
  56: { label: 'Lekka marznąca mżawka' },
  57: { label: 'Gęsta marznąca mżawka' },
  61: { label: 'Lekki deszcz' },
  63: { label: 'Umiarkowany deszcz' },
  65: { label: 'Silny deszcz' },
  66: { label: 'Lekki marznący deszcz' },
  67: { label: 'Silny marznący deszcz' },
  71: { label: 'Lekkie opady śniegu' },
  73: { label: 'Umiarkowane opady śniegu' },
  75: { label: 'Silne opady śniegu' },
  77: { label: 'Ziarna śniegu' },
  80: { label: 'Lekkie przelotne deszcze' },
  81: { label: 'Umiarkowane przelotne deszcze' },
  82: { label: 'Gwałtowne przelotne deszcze' },
  85: { label: 'Lekkie przelotne opady śniegu' },
  86: { label: 'Silne przelotne opady śniegu' },
  95: { label: 'Burza' },
  96: { label: 'Burza z lekkim gradem' },
  99: { label: 'Burza z silnym gradem' }
};

export const BG_GRADIENTS: Record<string, string> = {
  // Słonecznie: soczysty lazur nieba ze złotą koroną słońca w prawym górnym rogu
  'sunny': 'radial-gradient(circle at 85% 12%, #ffe082 0%, #ffb300 18%, #1e88e5 52%, #1565c0 80%, #0d47a1 100%)',
  
  // Noc bezchmurna: głęboki kosmiczny granat z szafirowo-indygo poświatą
  'clear-night': 'radial-gradient(circle at 80% 15%, #283593 0%, #1a237e 30%, #0d133a 65%, #050819 100%)',
  
  // Częściowe zachmurzenie dzień: słoneczny lazur z ciepłą poświatą
  'partly': 'radial-gradient(circle at 80% 12%, #ffd54f 0%, #ffa726 16%, #29b6f6 45%, #0288d1 75%, #01579b 100%)',
  
  // Częściowe zachmurzenie noc: ciemny kobalt z miękką poświatą księżycową
  'partly-night': 'radial-gradient(circle at 75% 18%, #3949ab 0%, #1e2560 35%, #0f1433 70%, #070919 100%)',
  
  // Pochmurno dzień: nasycony stalowo-błękitny błękit z aksamitnym cieniowaniem
  'cloudy': 'radial-gradient(circle at 50% 15%, #546e7a 0%, #455a64 35%, #37474f 70%, #263238 100%)',
  
  // Pochmurno noc: głęboki antracyt z chłodnym akcentem
  'cloudy-night': 'radial-gradient(circle at 50% 20%, #263238 0%, #1b2327 45%, #10161a 100%)',
  
  // Mżawka: świeży turkusowo-morski błękit z mglistą głębią
  'drizzle': 'radial-gradient(circle at 65% 15%, #378da8 0%, #266b82 35%, #1b4f62 70%, #103340 100%)',
  
  // Deszcz: intensywny, głęboki oceaniczny deszcz z nasyconym granatem i cyjanem
  'rain': 'radial-gradient(circle at 70% 18%, #1e6091 0%, #16426d 35%, #0e2a47 70%, #08182b 100%)',
  
  // Burza: elektryzujący fiolet z ciemnym indygo i chmurą burzową
  'storm': 'radial-gradient(circle at 50% 12%, #5e35b1 0%, #391e6d 30%, #211242 65%, #0f0821 100%)',
  
  // Śnieg: krystaliczny, lodowy błękit z jasnymi refleksami mrozu
  'snow': 'radial-gradient(circle at 60% 12%, #64b5f6 0%, #42a5f5 25%, #1e88e5 60%, #1565c0 85%, #0d47a1 100%)',
  
  // Mgła: nastrojowa, srebrzysto-opalizująca mgła z chłodnym światłem
  'fog': 'radial-gradient(circle at 50% 20%, #78909c 0%, #607d8b 35%, #455a64 70%, #263238 100%)'
};

export function getWeatherInfo(code: number, isDay: number | boolean) {
  const day = Boolean(isDay);
  const info = WEATHER_CODES[code] || { label: 'Nieznana pogoda' };
  
  let iconType = 'HelpCircle';
  if (code === 0 || code === 1) iconType = day ? 'Sun' : 'Moon';
  else if (code === 2) iconType = day ? 'CloudSun' : 'CloudMoon';
  else if (code === 3) iconType = 'Cloud';
  else if ([45, 48].includes(code)) iconType = 'CloudFog';
  else if ([51, 53, 55, 56, 57].includes(code)) iconType = 'CloudDrizzle';
  else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) iconType = 'CloudRain';
  else if ([71, 73, 75, 77, 85, 86].includes(code)) iconType = 'Snowflake';
  else if ([95, 96, 99].includes(code)) iconType = 'CloudLightning';

  return { label: info.label, iconType };
}

export function getBgGradient(code: number, isDay: number | boolean) {
  const day = Boolean(isDay);
  
  if (code === 0 || code === 1) return day ? BG_GRADIENTS['sunny'] : BG_GRADIENTS['clear-night'];
  if (code === 2) return day ? BG_GRADIENTS['partly'] : BG_GRADIENTS['partly-night'];
  if (code === 3) return day ? BG_GRADIENTS['cloudy'] : BG_GRADIENTS['cloudy-night'];
  if ([45, 48].includes(code)) return BG_GRADIENTS['fog'];
  if ([51, 53, 55, 56, 57].includes(code)) return BG_GRADIENTS['drizzle'];
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return BG_GRADIENTS['rain'];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return BG_GRADIENTS['snow'];
  if ([95, 96, 99].includes(code)) return BG_GRADIENTS['storm'];
  
  return day ? BG_GRADIENTS['cloudy'] : BG_GRADIENTS['cloudy-night'];
}

export function getWeatherEffectType(code: number, isDay: number | boolean) {
  const day = Boolean(isDay);
  
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([51, 53, 55, 56, 57].includes(code)) return 'drizzle';
  if ([95, 96, 99].includes(code)) return 'storm';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([45, 48].includes(code)) return 'fog';
  if (code === 0 || code === 1) return day ? 'sunny' : 'starry';
  if (code === 2) return day ? 'partly' : 'partly-night';
  if (code === 3) return 'cloudy';
  
  return 'none';
}

export function isNightTheme(code: number, isDay: number | boolean) {
  return !Boolean(isDay);
}

/**
 * Wyznacza reprezentatywny, realistyczny kod pogody dla danego dnia w oparciu o przebieg godzinowy.
 *
 * Surowa zmienna `daily.weathercode` z Open-Meteo działa na zasadzie Math.max() ze wszystkich 24 godzin
 * doby (00:00 - 23:59). Przez to, jeśli w nocy o 2:00 pojawi się chwilowe zachmurzenie (kod 3), cały dzień
 * otrzymuje kod 3 (Pochmurno), nawet gdy przez 90% dnia świeci pełne słońce i nie ma ani jednej chmury.
 *
 * Poniższa funkcja analizuje godziny dzienne (aktywne, w których ludzie doświadczają aury),
 * biorąc pod uwagę poziom zachmurzenia, realne sumy opadów oraz priorytety zjawisk groźnych (burze, śnieg).
 */
export function getRepresentativeDailyWeatherCode(
  dayDate: string,
  dayIdx: number,
  dailyData: DailyData,
  hourlyData?: HourlyData
): number {
  if (!hourlyData || !hourlyData.time || hourlyData.time.length === 0) {
    return dailyData.weathercode?.[dayIdx] ?? 0;
  }

  const rawDailyCode = dailyData.weathercode?.[dayIdx] ?? 0;
  const precipSum = dailyData.precipitation_sum?.[dayIdx] ?? 0;
  const precipProbMax = dailyData.precipitation_probability_max?.[dayIdx] ?? 0;

  // Pobierz wszystkie godziny należące do daty danego dnia (np. "2026-10-16")
  const dayHours: {
    time: string;
    code: number;
    isDay: boolean;
    cloud: number;
    precip: number;
    prob: number;
  }[] = [];

  for (let h = 0; h < hourlyData.time.length; h++) {
    const t = hourlyData.time[h];
    if (t && t.startsWith(dayDate)) {
      const code = hourlyData.weathercode[h] ?? 0;
      dayHours.push({
        time: t,
        code,
        isDay: hourlyData.is_day[h] === 1,
        cloud:
          hourlyData.cloudcover?.[h] ??
          (code === 3 ? 100 : code === 2 ? 50 : code === 1 ? 25 : 0),
        precip: hourlyData.precipitation?.[h] ?? 0,
        prob: hourlyData.precipitation_probability?.[h] ?? 0,
      });
    }
  }

  if (dayHours.length === 0) {
    return rawDailyCode;
  }

  // Godziny dzienne (słońce nad horyzontem)
  let dayOnly = dayHours.filter((h) => h.isDay);
  if (dayOnly.length < 4) {
    // Okres zimowy / polarny: fallback do typowych godzin aktywności 08:00 - 18:00
    dayOnly = dayHours.filter((h) => {
      const hourNum = parseInt(h.time.split('T')[1]?.slice(0, 2) || '0', 10);
      return hourNum >= 8 && hourNum <= 18;
    });
  }
  if (dayOnly.length === 0) {
    dayOnly = dayHours;
  }

  // 1. Zjawiska burzowe (kody 95, 96, 99)
  const hasDayStorm = dayOnly.some((h) => h.code >= 95);
  const hasAnyStorm = dayHours.some((h) => h.code >= 95);
  if (hasDayStorm || (hasAnyStorm && precipProbMax >= 50 && precipSum >= 1.0)) {
    const storm = dayHours.find((h) => h.code >= 95);
    return storm ? storm.code : 95;
  }

  // 2. Opady śniegu i marznące (kody 56, 57, 66, 67, 71, 73, 75, 77, 85, 86)
  const snowCodes = [56, 57, 66, 67, 71, 73, 75, 77, 85, 86];
  const daySnowHours = dayOnly.filter((h) => snowCodes.includes(h.code));
  if (daySnowHours.length >= 2 || (daySnowHours.length >= 1 && precipSum >= 0.2)) {
    const snowCounts: Record<number, number> = {};
    daySnowHours.forEach((h) => {
      snowCounts[h.code] = (snowCounts[h.code] || 0) + 1;
    });
    const dominantSnow = Object.keys(snowCounts).sort((a, b) => snowCounts[Number(b)] - snowCounts[Number(a)])[0];
    return dominantSnow ? Number(dominantSnow) : 71;
  }

  // 3. Opady deszczu, przelotne, mżawka (51, 53, 55, 61, 63, 65, 80, 81, 82)
  const rainCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82];
  const dayRainHours = dayOnly.filter((h) => rainCodes.includes(h.code));
  const daytimePrecipSum = dayOnly.reduce((acc, h) => acc + h.precip, 0);
  const hasAnyRainCode = dayRainHours.length > 0 || (rawDailyCode && rainCodes.includes(rawDailyCode));

  if (hasAnyRainCode && (precipSum >= 0.2 || daytimePrecipSum >= 0.15)) {
    if (dayRainHours.length >= 2 || daytimePrecipSum >= 0.5) {
      const rainCounts: Record<number, number> = {};
      dayRainHours.forEach((h) => {
        if (rainCodes.includes(h.code)) {
          rainCounts[h.code] = (rainCounts[h.code] || 0) + 1;
        }
      });
      const dominant = Object.keys(rainCounts).sort((a, b) => rainCounts[Number(b)] - rainCounts[Number(a)])[0];
      if (dominant) return Number(dominant);
      if (rawDailyCode && rainCodes.includes(rawDailyCode)) return rawDailyCode;
      return 61;
    } else if (dayRainHours.length === 1 || daytimePrecipSum > 0) {
      const singleCode = dayRainHours[0]?.code;
      if (singleCode && [80, 81, 82].includes(singleCode)) return singleCode;
      if (singleCode && [51, 53, 55].includes(singleCode)) return singleCode;
      return 80; // Lekki przelotny deszcz (słońce z chmurą i deszczem)
    }
  }

  // 4. Mgła (kody 45, 48) - tylko jeśli utrzymuje się przez większość dnia
  const fogHours = dayOnly.filter((h) => h.code === 45 || h.code === 48);
  if (fogHours.length >= dayOnly.length * 0.5) {
    return 45;
  }

  // 5. Zachmurzenie i pogoda bezopadowa (kody 0, 1, 2, 3)
  const totalDayOnly = dayOnly.length;
  const avgCloud = dayOnly.reduce((acc, h) => acc + h.cloud, 0) / totalDayOnly;
  const clearHours = dayOnly.filter((h) => h.cloud <= 20 || h.code === 0).length;
  const mainlyClearHours = dayOnly.filter((h) => h.cloud <= 40 || h.code <= 1).length;
  const overcastHours = dayOnly.filter((h) => h.cloud >= 80 || h.code === 3).length;

  // Czyste niebo (Słonecznie): średnie zachmurzenie dzienne < 22% i co najmniej 55% godzin słonecznych
  if (avgCloud < 22 && clearHours >= totalDayOnly * 0.55) {
    return 0;
  }

  // Głównie bezchmurnie: średnie zachmurzenie < 40% i co najmniej 50% godzin z małym zachmurzeniem
  if (avgCloud < 40 && mainlyClearHours >= totalDayOnly * 0.5) {
    return 1;
  }

  // Pochmurno: przewaga gęstych chmur przez większość dnia
  if (avgCloud >= 75 && overcastHours >= totalDayOnly * 0.6) {
    return 3;
  }

  // Częściowe zachmurzenie (słońce z chmurami)
  return 2;
}

/**
 * Udoskonala tablicę kodów pogodowych dailyData na podstawie danych godzinowych.
 */
export function refineDailyWeatherCodes(hourly: HourlyData, daily: DailyData): number[] {
  if (!daily || !daily.time) return [];
  return daily.time.map((dateStr, idx) => {
    return getRepresentativeDailyWeatherCode(dateStr, idx, daily, hourly);
  });
}
