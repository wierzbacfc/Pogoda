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
  if ([55, 61, 63, 65, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'unknown';
}

function getWeatherIconMarkup(type) {
  return `<svg class="weather-flat-icon weather-flat-icon-${type}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${WEATHER_ICON_PATHS[type] || WEATHER_ICON_PATHS.unknown}</svg>`;
}

const WEATHER_ICON_PATHS = {
  sunny: '<g class="weather-sun-rays"><path d="M32 7v7M32 50v7M7 32h7M50 32h7M14.4 14.4l5 5M44.6 44.6l5 5M49.6 14.4l-5 5M19.4 44.6l-5 5"/></g><circle class="weather-sun-glow" cx="32" cy="32" r="18"/><circle class="weather-sun-core" cx="32" cy="32" r="12"/>',
  'clear-night': '<g class="weather-stars"><circle cx="46" cy="16" r="2.1"/><circle cx="53" cy="28" r="1.5"/><circle cx="39" cy="10" r="1.1"/></g><path class="weather-moon" d="M42.8 48.5A19.5 19.5 0 0 1 27.4 12.7 18.7 18.7 0 1 0 51 37.8a19.8 19.8 0 0 1-8.2 10.7Z"/>',
  partly: '<g class="weather-sun-small"><g class="weather-sun-rays"><path d="M24 8v5M24 34v5M8 24h5M35 24h5M12.8 12.8l3.7 3.7M35.5 35.5l3.7 3.7M39.2 12.8l-3.7 3.7"/></g><circle class="weather-sun-core" cx="24" cy="24" r="9"/></g><g class="weather-cloud-group"><path class="weather-cloud-shadow" d="M18 48h30a9.2 9.2 0 0 0 .9-18.4 14.8 14.8 0 0 0-28 5.1A8.4 8.4 0 0 0 18 48Z"/><path class="weather-cloud" d="M17 45.5h30a7.7 7.7 0 0 0 0-15.4 12.5 12.5 0 0 0-23.9-2.8A9.3 9.3 0 0 0 17 45.5Z"/></g>',
  'partly-night': '<g class="weather-stars"><circle cx="47" cy="15" r="1.8"/><circle cx="54" cy="26" r="1.2"/></g><path class="weather-moon" d="M31 30.5A14.5 14.5 0 0 1 41.5 10.8 14 14 0 1 0 51 30a14.6 14.6 0 0 1-20 .5Z"/><g class="weather-cloud-group"><path class="weather-cloud-shadow" d="M18 49h30a9.2 9.2 0 0 0 .9-18.4 14.8 14.8 0 0 0-28 5.1A8.4 8.4 0 0 0 18 49Z"/><path class="weather-cloud" d="M17 46.5h30a7.7 7.7 0 0 0 0-15.4 12.5 12.5 0 0 0-23.9-2.8A9.3 9.3 0 0 0 17 46.5Z"/></g>',
  cloudy: '<g class="weather-cloud-group"><path class="weather-cloud-shadow" d="M17 47h31.5a9.8 9.8 0 0 0 1-19.5A16 16 0 0 0 19.2 33 8.2 8.2 0 0 0 17 47Z"/><path class="weather-cloud" d="M16 44.5h31a8 8 0 0 0 0-16 13.5 13.5 0 0 0-25.8-3A10 10 0 0 0 16 44.5Z"/></g>',
  drizzle: '<g class="weather-cloud-group"><path class="weather-cloud-shadow" d="M17 38h31.5a9.4 9.4 0 0 0 1-18.7 15.2 15.2 0 0 0-28.8 5.3A8.2 8.2 0 0 0 17 38Z"/><path class="weather-cloud" d="M16 35.5h30.5a7.8 7.8 0 0 0 0-15.6 13 13 0 0 0-24.8-2.9A9.7 9.7 0 0 0 16 35.5Z"/></g><g class="weather-rain-group"><path class="icon-rain-drop" d="M24 44v6M34 42.5v7M44 44v6"/></g>',
  rain: '<g class="weather-cloud-group"><path class="weather-cloud-shadow" d="M16 37h33a10 10 0 0 0 1.1-19.9 16 16 0 0 0-30.5 5.5A8.7 8.7 0 0 0 16 37Z"/><path class="weather-cloud" d="M15 34.5h31.5a8.4 8.4 0 0 0 0-16.8 13.7 13.7 0 0 0-26.2-3A10.4 10.4 0 0 0 15 34.5Z"/></g><g class="weather-rain-group"><path class="icon-rain-drop" d="M22 42v10M32 40v12M42 42v10"/></g>',
  storm: '<g class="weather-cloud-group weather-storm-cloud"><path class="weather-cloud-shadow" d="M16 36h33a10 10 0 0 0 1.1-19.9 16 16 0 0 0-30.5 5.5A8.7 8.7 0 0 0 16 36Z"/><path class="weather-cloud" d="M15 33.5h31.5a8.4 8.4 0 0 0 0-16.8 13.7 13.7 0 0 0-26.2-3A10.4 10.4 0 0 0 15 33.5Z"/></g><g class="weather-rain-group"><path class="icon-rain-drop" d="M21 43v7M45 43v7"/></g><path class="weather-bolt" d="M33 35 25 50h8l-3 10 11-17h-8l4-8Z"/>',
  snow: '<g class="weather-cloud-group"><path class="weather-cloud-shadow" d="M17 38h31.5a9.4 9.4 0 0 0 1-18.7 15.2 15.2 0 0 0-28.8 5.3A8.2 8.2 0 0 0 17 38Z"/><path class="weather-cloud" d="M16 35.5h30.5a7.8 7.8 0 0 0 0-15.6 13 13 0 0 0-24.8-2.9A9.7 9.7 0 0 0 16 35.5Z"/></g><g class="weather-snow-group"><path class="snow-line" d="M23 45v8M19 49h8M20.3 46.3l5.4 5.4M25.7 46.3l-5.4 5.4M42 45v8M38 49h8M39.3 46.3l5.4 5.4M44.7 46.3l-5.4 5.4"/></g>',
  fog: '<g class="weather-cloud-group"><path class="weather-cloud-shadow" d="M18 34h29a9 9 0 0 0 .9-17.9 14.3 14.3 0 0 0-27.2 4.9A7.8 7.8 0 0 0 18 34Z"/><path class="weather-cloud" d="M17 31.5h28a7.5 7.5 0 0 0 0-15 12.5 12.5 0 0 0-24-2.7A9.2 9.2 0 0 0 17 31.5Z"/></g><g class="weather-fog-group"><path class="fog-line" d="M13 42h38M18 49h34M12 56h28"/></g>',
  unknown: '<circle class="weather-cloud-shadow" cx="32" cy="32" r="21"/><path class="fog-line" d="M28 25a6 6 0 1 1 7 5.9c-2.1.5-3 1.6-3 3.6v1.2M32 43h.1"/>'
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
