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
  0:  { icon: '☀️',  label: 'Bezchmurnie',                   icon_night: '🌙'  },
  1:  { icon: '🌤️', label: 'Przeważnie słonecznie',          icon_night: '🌤️' },
  2:  { icon: '⛅',  label: 'Częściowe zachmurzenie',         icon_night: '⛅'  },
  3:  { icon: '☁️',  label: 'Zachmurzenie',                   icon_night: '☁️'  },
  45: { icon: '🌫️', label: 'Mgła',                           icon_night: '🌫️' },
  48: { icon: '🌫️', label: 'Mgła szronowa',                  icon_night: '🌫️' },
  51: { icon: '🌦️', label: 'Lekka mżawka',                   icon_night: '🌦️' },
  53: { icon: '🌦️', label: 'Umiarkowana mżawka',             icon_night: '🌦️' },
  55: { icon: '🌧️', label: 'Intensywna mżawka',              icon_night: '🌧️' },
  61: { icon: '🌧️', label: 'Lekki deszcz',                   icon_night: '🌧️' },
  63: { icon: '🌧️', label: 'Umiarkowany deszcz',             icon_night: '🌧️' },
  65: { icon: '🌧️', label: 'Intensywny deszcz',              icon_night: '🌧️' },
  71: { icon: '❄️',  label: 'Lekkie opady śniegu',            icon_night: '❄️'  },
  73: { icon: '❄️',  label: 'Umiarkowane opady śniegu',       icon_night: '❄️'  },
  75: { icon: '❄️',  label: 'Intensywne opady śniegu',        icon_night: '❄️'  },
  77: { icon: '🌨️', label: 'Ziarna śniegu',                  icon_night: '🌨️' },
  80: { icon: '🌦️', label: 'Przelotne opady',                icon_night: '🌦️' },
  81: { icon: '🌧️', label: 'Umiarkowane przelotne opady',    icon_night: '🌧️' },
  82: { icon: '⛈️',  label: 'Intensywne przelotne opady',    icon_night: '⛈️'  },
  85: { icon: '🌨️', label: 'Przelotne opady śniegu',         icon_night: '🌨️' },
  86: { icon: '🌨️', label: 'Intensywne przelotne opady śniegu', icon_night: '🌨️' },
  95: { icon: '⛈️',  label: 'Burza',                         icon_night: '⛈️'  },
  96: { icon: '⛈️',  label: 'Burza z gradem',                icon_night: '⛈️'  },
  99: { icon: '⛈️',  label: 'Burza z silnym gradem',         icon_night: '⛈️'  }
};

/**
 * Returns weather icon (emoji) and translated description label.
 */
function getWeatherInfo(code, isDay = true) {
  const info = WEATHER_CODES[code] || { icon: '❓', label: 'Nieznane', icon_night: '❓' };
  return {
    icon: isDay ? info.icon : (info.icon_night || info.icon),
    label: info.label
  };
}

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
