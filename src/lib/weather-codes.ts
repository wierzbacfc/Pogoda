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
