/**
 * WMO Weather Codes and Dynamic Gradient Mapping.
 */

const BG_GRADIENTS = {
  // Day gradients
  sunny_day:      'linear-gradient(160deg, #fef9c3 0%, #fde68a 40%, #fed7aa 100%)',
  partly_day:     'linear-gradient(160deg, #e0f2fe 0%, #bae6fd 50%, #e0e7ff 100%)',
  cloudy_day:     'linear-gradient(160deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)',
  rainy_day:      'linear-gradient(160deg, #dbeafe 0%, #bfdbfe 50%, #c7d2fe 100%)',
  stormy_day:     'linear-gradient(160deg, #e2e8f0 0%, #cbd5e1 40%, #94a3b8 100%)',
  snow_day:       'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 50%, #e8f4fd 100%)',
  fog_day:        'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',

  // Sunset transition gradient
  sunset:         'linear-gradient(160deg, #fed7aa 0%, #fca5a5 40%, #c4b5fd 100%)',

  // Night gradients (darker variants)
  clear_night:    'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #1e3a5f 100%)',
  cloudy_night:   'linear-gradient(160deg, #1e293b 0%, #334155 50%, #475569 100%)',
  rainy_night:    'linear-gradient(160deg, #1e293b 0%, #1e3a5f 50%, #1e2d45 100%)'
};

const WEATHER_CODES = {
  0:  { label: 'Bezchmurnie' },
  1:  { label: 'Przeważnie słonecznie' },
  2:  { label: 'Częściowe zachmurzenie' },
  3:  { label: 'Zachmurzenie' },
  45: { label: 'Mgła' },
  48: { label: 'Mgła szronowa' },
  51: { label: 'Lekka mżawka' },
  53: { label: 'Umiarkowana mżawka' },
  55: { label: 'Intensywna mżawka' },
  61: { label: 'Lekki deszcz' },
  63: { label: 'Umiarkowany deszcz' },
  65: { label: 'Intensywny deszcz' },
  71: { label: 'Lekkie opady śniegu' },
  73: { label: 'Umiarkowane opady śniegu' },
  75: { label: 'Intensywne opady śniegu' },
  77: { label: 'Ziarna śniegu' },
  80: { label: 'Przelotne opady' },
  81: { label: 'Umiarkowane przelotne opady' },
  82: { label: 'Intensywne przelotne opady' },
  85: { label: 'Przelotne opady śniegu' },
  86: { label: 'Intensywne przelotne opady śniegu' },
  95: { label: 'Burza' },
  96: { label: 'Burza z gradem' },
  99: { label: 'Burza z silnym gradem' }
};

/**
 * Returns weather icon markup and translated description label.
 */
function getWeatherInfo(code, isDay = true) {
  const info = WEATHER_CODES[code] || { label: 'Nieznane' };
  const type = getWeatherIconType(code, isDay);
  return {
    icon: getWeatherIconMarkup(type),
    type,
    label: info.label
  };
}

function getWeatherIconType(code, isDay = true) {
  if (!isDay) {
    if (code <= 1) return 'clear-night';
    if (code <= 2) return 'partly-night';
  }
  if (code === 0) return 'sunny';
  if ([1, 2].includes(code)) return 'partly';
  if (code === 3) return 'cloudy';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53, 80].includes(code)) return 'drizzle';
  if ([55, 61, 63, 65, 81].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([82, 95, 96, 99].includes(code)) return 'storm';
  return 'unknown';
}

function getWeatherIconMarkup(type) {
  return `<svg class="weather-flat-icon weather-flat-icon-${type}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${WEATHER_ICON_PATHS[type] || WEATHER_ICON_PATHS.unknown}</svg>`;
}

const WEATHER_ICON_PATHS = {
  sunny: '<g class="sun-rays"><path d="M32 6v8M32 50v8M6 32h8M50 32h8M13.6 13.6l5.7 5.7M44.7 44.7l5.7 5.7M50.4 13.6l-5.7 5.7M19.3 44.7l-5.7 5.7"/></g><circle class="sun-core" cx="32" cy="32" r="13"/>',
  'clear-night': '<path class="moon-core" d="M43.6 48.2A20 20 0 0 1 26.1 13.4 19.4 19.4 0 1 0 50.7 38a20 20 0 0 1-7.1 10.2Z"/><circle class="star-dot" cx="46" cy="17" r="2.2"/><circle class="star-dot" cx="53" cy="27" r="1.6"/>',
  partly: '<g class="sun-rays small"><path d="M24 8v6M24 34v6M7 24h6M35 24h6M12 12l4.5 4.5M35.5 35.5 40 40M40 12l-4.5 4.5"/></g><circle class="sun-core" cx="24" cy="24" r="10"/><path class="cloud-main" d="M20 48h27.5a10 10 0 0 0 1-19.9 15.5 15.5 0 0 0-29.2 5.4A7.3 7.3 0 0 0 20 48Z"/><path class="cloud-soft" d="M18 48h26.5a8 8 0 0 0 0-16 12.5 12.5 0 0 0-24-2.7A9.2 9.2 0 0 0 18 48Z"/>',
  'partly-night': '<path class="moon-core" d="M29.5 30.5a15 15 0 0 1 11-20.6 14.7 14.7 0 1 0 10 20.3 15 15 0 0 1-21 .3Z"/><path class="cloud-main" d="M18 49h29.5a9.5 9.5 0 0 0 .8-19 15 15 0 0 0-28.1 5.2A7.8 7.8 0 0 0 18 49Z"/><path class="cloud-soft" d="M18 49h27a7.6 7.6 0 0 0 0-15.2 12 12 0 0 0-23-2.5A9 9 0 0 0 18 49Z"/>',
  cloudy: '<path class="cloud-main" d="M17 47h31a10 10 0 0 0 1.1-19.9 16 16 0 0 0-30.4 5.5A8 8 0 0 0 17 47Z"/><path class="cloud-soft" d="M16 47h29.5a8.4 8.4 0 0 0 0-16.8 13.7 13.7 0 0 0-26.2-3A10.2 10.2 0 0 0 16 47Z"/>',
  drizzle: '<path class="cloud-main" d="M17 38h31a9.5 9.5 0 0 0 1-18.9 15 15 0 0 0-28.4 5.2A8 8 0 0 0 17 38Z"/><path class="cloud-soft" d="M16 38h29.5a8 8 0 0 0 0-16 13 13 0 0 0-25-2.8A9.5 9.5 0 0 0 16 38Z"/><path class="rain-drop" d="M24 45v7M34 43v8M44 45v7"/>',
  rain: '<path class="cloud-main" d="M16 36h32a10 10 0 0 0 1.1-19.9 15.8 15.8 0 0 0-30 5.3A8.5 8.5 0 0 0 16 36Z"/><path class="cloud-soft" d="M15 36h30.5a8.4 8.4 0 0 0 0-16.8 13.6 13.6 0 0 0-26-3A10.4 10.4 0 0 0 15 36Z"/><path class="rain-drop" d="M22 43v10M32 41v12M42 43v10"/>',
  storm: '<path class="cloud-main storm-cloud" d="M16 35h32a10 10 0 0 0 1.1-19.9 15.8 15.8 0 0 0-30 5.3A8.5 8.5 0 0 0 16 35Z"/><path class="cloud-soft" d="M15 35h30.5a8.4 8.4 0 0 0 0-16.8 13.6 13.6 0 0 0-26-3A10.4 10.4 0 0 0 15 35Z"/><path class="bolt" d="M33 35 25 50h8l-3 10 11-17h-8l4-8Z"/>',
  snow: '<path class="cloud-main" d="M17 37h31a9.5 9.5 0 0 0 1-18.9 15 15 0 0 0-28.4 5.2A8 8 0 0 0 17 37Z"/><path class="cloud-soft" d="M16 37h29.5a8 8 0 0 0 0-16 13 13 0 0 0-25-2.8A9.5 9.5 0 0 0 16 37Z"/><path class="snow-line" d="M23 45v8M19 49h8M20.2 46.2l5.6 5.6M25.8 46.2l-5.6 5.6M41 45v8M37 49h8M38.2 46.2l5.6 5.6M43.8 46.2l-5.6 5.6"/>',
  fog: '<path class="cloud-main" d="M18 34h29a9 9 0 0 0 .9-17.9 14.2 14.2 0 0 0-27 4.8A7.8 7.8 0 0 0 18 34Z"/><path class="cloud-soft" d="M17 34h28a7.5 7.5 0 0 0 0-15 12.5 12.5 0 0 0-24-2.7A9.2 9.2 0 0 0 17 34Z"/><path class="fog-line" d="M13 43h38M18 50h34M12 56h28"/>',
  unknown: '<circle class="cloud-main" cx="32" cy="32" r="21"/><path class="fog-line" d="M28 25a6 6 0 1 1 7 5.9c-2.1.5-3 1.6-3 3.6v1.2M32 43h.1"/>'
};

/**
 * Maps WMO code + is_day to background gradient value.
 */
function getBgGradient(code, isDay) {
  if (!isDay) {
    if ([61, 63, 65, 80, 81, 82, 51, 53, 55].includes(code)) return BG_GRADIENTS.rainy_night;
    if (code <= 1) return BG_GRADIENTS.clear_night;
    return BG_GRADIENTS.cloudy_night;
  }
  if (code === 0) return BG_GRADIENTS.sunny_day;
  if (code <= 2)  return BG_GRADIENTS.partly_day;
  if (code === 3) return BG_GRADIENTS.cloudy_day;
  if ([45, 48].includes(code)) return BG_GRADIENTS.fog_day;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return BG_GRADIENTS.snow_day;
  if ([95, 96, 99].includes(code)) return BG_GRADIENTS.stormy_day;
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return BG_GRADIENTS.rainy_day;
  return BG_GRADIENTS.partly_day;
}

/**
 * Maps WMO code to particle effect animation types.
 */
function getWeatherEffectType(code, isDay = true) {
  if ([95, 96, 99].includes(code)) return 'storm';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([45, 48].includes(code)) return 'fog';
  if (code === 0 || code === 1) return isDay ? 'sunny' : 'starry';
  if ([2, 3].includes(code)) return 'cloudy';
  return 'none';
}
