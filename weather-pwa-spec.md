# WeatherPWA — Specyfikacja techniczna aplikacji

## 1. Cel i zakres projektu

Aplikacja pogodowa działająca jako PWA (Progressive Web App) instalowana na telefonie z ekranem głównym. Przy każdym uruchomieniu automatycznie pobiera dane dla bieżącej lokalizacji GPS. Użytkownik może też dodawać własne miasta i przełączać się między nimi swipem.

Aplikacja wyświetla:
- aktualną temperaturę i warunki pogodowe
- sekcję "dziś w skrócie" (min/maks, wschód/zachód słońca, kluczowa prognoza)
- prognozę godzinową (do końca bieżącego dnia + następny dzień)
- prognozę na 14 dni z ikonami, min/maks i słupkami opadów

**Filozofia designu:** jasny, pogodny, nowoczesny. Dynamiczne tło zmieniające się z pogodą i porą dnia. Minimalistyczna typografia, dużo przestrzeni, brak ciemnych paneli.

---

## 2. Architektura nawigacji (3 ekrany)

```
┌─────────────────────────────────────┐
│  Ekran 1 — Pogoda (główny)          │
│  GPS lub aktywne miasto             │
│  Swipe ← → między miastami          │
│  Ikona listy (góra prawo) ──────────┼──→ Ekran 2
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Ekran 2 — Lista miast              │
│  "Bieżąca lokalizacja" (GPS) + GPS  │
│  Dodane miasta z temperaturą        │
│  Przycisk "+ Dodaj miasto" ─────────┼──→ Ekran 3
│  Tap na miasto ─────────────────────┼──→ Ekran 1 (to miasto aktywne)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Ekran 3 — Wyszukiwanie             │
│  Input + live wyniki z Geocoding    │
│  Tap na wynik → dodaj → Ekran 2     │
└─────────────────────────────────────┘
```

**Nawigacja:**
- Ekran 1 → 2: ikona listy miast w prawym górnym rogu nagłówka
- Ekran 2 → 1: przycisk "Wstecz" lub tap na miasto
- Ekran 2 → 3: przycisk "+ Dodaj miasto"
- Ekran 3 → 2: przycisk "Anuluj" lub po dodaniu miasta
- Przełączanie miast na Ekranie 1: swipe lewo/prawo, kropki nawigacyjne na dole

---

## 3. Stos technologiczny

| Warstwa | Wybór | Uzasadnienie |
|---|---|---|
| Framework | Vanilla JS (ES2020) | Brak zależności, prosta instalacja PWA |
| Styl | CSS custom properties + flex/grid | Pełna kontrola nad tokenami, dynamiczne gradienty |
| API pogodowe | Open-Meteo | Darmowe, bez klucza API, CORS-friendly, 14 dni |
| Geokodowanie | Open-Meteo Geocoding API | Ten sam ekosystem, język polski |
| Lokalizacja | Geolocation API (przeglądarka) | Natywne, bez zewnętrznych zależności |
| Persystencja | localStorage | Miasta, cache danych, preferencje |
| Offline | Service Worker (Cache API) | Cache-first dla zasobów statycznych |
| Hosting | GitHub Pages lub Netlify | Hosting statyczny z HTTPS (wymagany przez PWA) |

---

## 4. Struktura plików

```
weather-pwa/
├── index.html            # Główna strona aplikacji
├── manifest.json         # Manifest PWA
├── sw.js                 # Service Worker
├── css/
│   └── styles.css        # Wszystkie style + tokeny + gradienty tła
├── js/
│   ├── app.js            # Główna logika, stan, nawigacja
│   ├── api.js            # Komunikacja z Open-Meteo
│   ├── geo.js            # Geolocation API wrapper
│   ├── storage.js        # localStorage wrapper
│   ├── ui.js             # Renderowanie widoków
│   ├── weather-codes.js  # Mapowanie WMO codes → ikony/opisy/tła
│   └── pwa.js            # Rejestracja Service Worker
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
└── offline.html          # Fallback gdy brak sieci i brak cache
```

---

## 5. manifest.json

```json
{
  "name": "WeatherPWA",
  "short_name": "Pogoda",
  "description": "Prognoza pogody z Open-Meteo",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fffdf7",
  "theme_color": "#fffdf7",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## 6. Design — paleta kolorów i tokeny CSS

### Filozofia

Jasny, pogodny interfejs. Białe i kremowe tła, miękkie cienie zamiast obramowań, duże cyfry temperatur, dużo powietrza. Dynamiczne tło całej aplikacji (gradient) zmienia się w zależności od pogody i pory dnia — to główny element wizualny nadający "nastrój".

### Tokeny CSS (`:root`)

```css
:root {
  /* Tła statyczne */
  --bg-surface:       #ffffff;
  --bg-surface-soft:  #f7f9fc;
  --bg-card:          rgba(255, 255, 255, 0.72);  /* karty z blur */
  --bg-card-solid:    #ffffff;

  /* Tekst */
  --text-primary:     #1a1f2e;
  --text-secondary:   #5a6478;
  --text-tertiary:    #9aa3b2;
  --text-on-gradient: #ffffff;                    /* tekst na kolorowym tle */
  --text-on-gradient-soft: rgba(255,255,255,0.82);

  /* Akcenty */
  --accent-blue:      #2d7dd2;
  --accent-orange:    #f4801a;
  --accent-yellow:    #f7c948;
  --accent-teal:      #17a89e;
  --accent-rain:      #5fa8d3;
  --accent-red:       #e05c2a;

  /* Typografia */
  --font-main: 'Inter', system-ui, sans-serif;
  --font-display: 'Inter', system-ui, sans-serif;  /* temp hero — weight 200–300 */

  /* Spacing i promienie */
  --radius-sm:   8px;
  --radius-md:  14px;
  --radius-lg:  20px;
  --radius-xl:  28px;

  /* Cienie (zamiast borderów na kartach) */
  --shadow-card: 0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04);
  --shadow-card-hover: 0 6px 24px rgba(0,0,0,0.10);

  /* Przejścia */
  --transition: 220ms ease;
  --transition-bg: 800ms ease;  /* wolne przejście tła przy zmianie pogody */
}
```

### Import fontów

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600&display=swap" rel="stylesheet">
```

### Dynamiczne gradienty tła

Gradient aplikowany na `<body>` lub dedykowanym `<div class="app-bg">`. Zmienia się płynnie (`transition: background 800ms ease`) przy każdej zmianie pogody lub pory dnia.

```javascript
// js/weather-codes.js — sekcja gradientów
const BG_GRADIENTS = {
  // Dzień — słonecznie
  sunny_day:      'linear-gradient(160deg, #fef9c3 0%, #fde68a 40%, #fed7aa 100%)',
  // Dzień — częściowe zachmurzenie
  partly_day:     'linear-gradient(160deg, #e0f2fe 0%, #bae6fd 50%, #e0e7ff 100%)',
  // Dzień — zachmurzenie / pochmurno
  cloudy_day:     'linear-gradient(160deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)',
  // Dzień — deszcz / mżawka
  rainy_day:      'linear-gradient(160deg, #dbeafe 0%, #bfdbfe 50%, #c7d2fe 100%)',
  // Dzień — burza
  stormy_day:     'linear-gradient(160deg, #e2e8f0 0%, #cbd5e1 40%, #94a3b8 100%)',
  // Dzień — śnieg
  snow_day:       'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 50%, #e8f4fd 100%)',
  // Dzień — mgła
  fog_day:        'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',

  // Zachód słońca (is_day przejście)
  sunset:         'linear-gradient(160deg, #fed7aa 0%, #fca5a5 40%, #c4b5fd 100%)',

  // Noc — bezchmurnie (jedyny ciemny wariant)
  clear_night:    'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #1e3a5f 100%)',
  // Noc — pochmurno
  cloudy_night:   'linear-gradient(160deg, #1e293b 0%, #334155 50%, #475569 100%)',
  // Noc — deszcz
  rainy_night:    'linear-gradient(160deg, #1e293b 0%, #1e3a5f 50%, #1e2d45 100%)',
};

// Mapowanie weathercode + is_day → klucz gradientu
function getBgGradient(code, isDay) {
  if (!isDay) {
    if ([61,63,65,80,81,82,51,53,55].includes(code)) return BG_GRADIENTS.rainy_night;
    if (code <= 1) return BG_GRADIENTS.clear_night;
    return BG_GRADIENTS.cloudy_night;
  }
  if (code === 0) return BG_GRADIENTS.sunny_day;
  if (code <= 2)  return BG_GRADIENTS.partly_day;
  if (code === 3) return BG_GRADIENTS.cloudy_day;
  if ([45,48].includes(code)) return BG_GRADIENTS.fog_day;
  if ([71,73,75,77,85,86].includes(code)) return BG_GRADIENTS.snow_day;
  if ([95,96,99].includes(code)) return BG_GRADIENTS.stormy_day;
  if ([51,53,55,61,63,65,80,81,82].includes(code)) return BG_GRADIENTS.rainy_day;
  return BG_GRADIENTS.partly_day;
}
```

---

## 7. API — Open-Meteo

Brak klucza API. Wszystkie requesty GET, CORS dozwolony z przeglądarki.

### 7.1 Geokodowanie miast

**Endpoint:** `https://geocoding-api.open-meteo.com/v1/search`

| Parametr | Wartość | Opis |
|---|---|---|
| `name` | string | Nazwa wpisana przez użytkownika |
| `count` | 8 | Max wyników |
| `language` | `pl` | Polskie nazwy |
| `format` | `json` | — |

**Przykład:**
```
GET https://geocoding-api.open-meteo.com/v1/search?name=Poznań&count=8&language=pl&format=json
```

**Odpowiedź:**
```json
{
  "results": [
    {
      "id": 3088171,
      "name": "Poznań",
      "latitude": 52.40692,
      "longitude": 16.92993,
      "country_code": "PL",
      "country": "Polska",
      "admin1": "Województwo wielkopolskie"
    }
  ]
}
```

Pola do zapisania: `id`, `name`, `latitude`, `longitude`, `country_code`, `admin1`.

---

### 7.2 Prognoza pogody

**Endpoint:** `https://api.open-meteo.com/v1/forecast`

**Parametry hourly:**
```
temperature_2m, apparent_temperature, precipitation_probability,
precipitation, weathercode, windspeed_10m, winddirection_10m,
relativehumidity_2m, uv_index, visibility, is_day
```

**Parametry daily:**
```
weathercode, temperature_2m_max, temperature_2m_min,
apparent_temperature_max, apparent_temperature_min,
precipitation_sum, precipitation_probability_max,
windspeed_10m_max, sunrise, sunset, uv_index_max
```

**Pozostałe parametry:**
| Parametr | Wartość |
|---|---|
| `latitude` | float |
| `longitude` | float |
| `timezone` | `auto` |
| `forecast_days` | `15` (dziś + 14) |
| `wind_speed_unit` | `kmh` |

**Pełny przykładowy URL:**
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=52.40692
  &longitude=16.92993
  &hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weathercode,windspeed_10m,winddirection_10m,relativehumidity_2m,uv_index,visibility,is_day
  &daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,windspeed_10m_max,sunrise,sunset,uv_index_max
  &timezone=auto
  &forecast_days=15
  &wind_speed_unit=kmh
```

---

### 7.3 Mapowanie WMO Weather Codes

```javascript
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
  99: { icon: '⛈️',  label: 'Burza z silnym gradem',         icon_night: '⛈️'  },
};

function getWeatherInfo(code, isDay = true) {
  const info = WEATHER_CODES[code] || { icon: '❓', label: 'Nieznane', icon_night: '❓' };
  return {
    icon: isDay ? info.icon : (info.icon_night || info.icon),
    label: info.label,
  };
}
```

---

## 8. Lokalizacja GPS (`js/geo.js`)

```javascript
const Geo = {
  // Pobiera aktualną pozycję GPS
  // Zwraca: { latitude, longitude } lub rzuca błąd
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS niedostępny'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        err => reject(err),
        { timeout: 10000, maximumAge: 300000 }  // cache GPS przez 5 min
      );
    });
  },

  // Odwrócone geokodowanie: współrzędne → nazwa miejsca
  // Używa Open-Meteo Geocoding lub fallback: "Twoja lokalizacja"
  async reverseGeocode(lat, lon) {
    // Opcja A: BigDataCloud API (darmowe, bez klucza, zwraca miasto)
    // GET https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=pl
    // Zwraca: { city, principalSubdivision, countryName }
    // Opcja B: Fallback "Twoja lokalizacja" gdy API niedostępne
  }
};
```

**Specjalny wpis GPS w liście miast:**

```javascript
// Pseudo-miasto reprezentujące bieżącą lokalizację GPS
// Zawsze pierwsze na liście, nie można usunąć
const GPS_CITY = {
  id: 'gps',               // string — specjalne ID
  name: 'Twoja lokalizacja',
  subtitle: null,          // wypełniany po reverse geocode (np. "Poznań")
  latitude: null,          // wypełniany przy każdym uruchomieniu
  longitude: null,
  isGps: true
};
```

---

## 9. Model danych (localStorage)

### 9.1 Lista miast

**Klucz:** `wpwa_cities`

```javascript
// Typ City
{
  id: 3088171,                          // number | 'gps'
  name: "Poznań",                       // string
  country_code: "PL",                   // string
  admin1: "Województwo wielkopolskie",  // string
  latitude: 52.40692,                   // number
  longitude: 16.92993,                  // number
  isGps: false,                         // boolean
  order: 1                              // number (GPS zawsze order: 0)
}
```

### 9.2 Cache danych pogodowych

**Klucz:** `wpwa_weather_{cityId}` (np. `wpwa_weather_3088171`, `wpwa_weather_gps`)

```javascript
{
  fetchedAt: 1716200400000,   // number — Date.now()
  lat: 52.40692,              // number — dla GPS: faktyczna pozycja w momencie fetch
  lon: 16.92993,
  data: { /* pełna odpowiedź Open-Meteo */ }
}
```

**Zasada cache:** `Date.now() - fetchedAt < 600_000` (10 minut) → użyj cache.
**Wyjątek GPS:** dodatkowo sprawdź czy pozycja zmieniła się o więcej niż ~1 km — jeśli tak, odśwież mimo ważnego cache.

### 9.3 Preferencje użytkownika

**Klucz:** `wpwa_prefs`

```javascript
{
  activeCityIndex: 0,   // number — indeks aktywnego miasta (0 = GPS)
  unit: 'C'             // 'C' | 'F'
}
```

---

## 10. Architektura JavaScript

### `js/storage.js`

```javascript
const Storage = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) { localStorage.removeItem(key); }
};
```

### `js/api.js`

```javascript
const API = {
  GEO_BASE:     'https://geocoding-api.open-meteo.com/v1',
  WEATHER_BASE: 'https://api.open-meteo.com/v1',
  CACHE_TTL:    600_000,

  async searchCity(query) {
    // GET /search z parametrami
    // Zwraca: array City (bez id 'gps', bez order)
    // Obsługuje: błąd sieci, pusta odpowiedź
  },

  async fetchWeather(city) {
    // 1. Sprawdź cache
    // 2. Jeśli GPS: sprawdź też czy pozycja znacznie się zmieniła
    // 3. Jeśli cache ważny → zwróć dane z cache
    // 4. Fetch z API → zapisz cache → zwróć
    // Zwraca: { hourly, daily, meta: { fetchedAt, fromCache, lat, lon } }
  },

  async fetchAllCities(cities) {
    // Promise.allSettled() — nie blokuj reszty jeśli jedno miasto failuje
    // Zwraca: Map<cityId, weatherData | Error>
  }
};
```

### `js/ui.js`

```javascript
const UI = {
  // Ekran 1 — główny widok pogody
  renderWeatherScreen(city, weatherData) { },

  // Sekcja hero (aktualna temperatura, ikona, opis)
  renderHero(hourlyData, currentIdx, cityName) { },

  // Sekcja "dziś w skrócie"
  renderDaySummary(hourlyData, dailyData, currentIdx) { },

  // Pasek godzinowy (do końca dnia + następny dzień)
  renderHourlyBar(hourlyData, currentIdx) { },

  // Prognoza 14-dniowa
  renderDailyForecast(dailyData) { },

  // Ekran 2 — lista miast
  renderCityList(cities, weatherMap) { },

  // Ekran 3 — wyszukiwanie
  renderSearchScreen() { },
  renderSearchResults(results) { },

  // Tło aplikacji
  setBackground(weathercode, isDay) { },  // płynna zmiana gradientu

  // Kropki nawigacyjne (swipe między miastami)
  renderDots(count, activeIndex) { },

  // Stany UI
  setLoading(visible) { },
  showToast(message, type) { },  // type: 'info' | 'error' | 'success'
  showOfflineBanner(visible) { }
};
```

### `js/app.js`

```javascript
const App = {
  state: {
    cities: [],             // array City — zawsze zaczyna od GPS_CITY
    activeCityIndex: 0,     // number
    weatherMap: new Map(),  // cityId → weatherData
    currentView: 'weather', // 'weather' | 'cityList' | 'search'
  },

  async init() {
    // 1. Wczytaj cities i prefs z localStorage
    // 2. Upewnij się że GPS_CITY jest zawsze na pozycji 0
    // 3. Pobierz pozycję GPS (nieblokująco — pokaż loader na karcie GPS)
    // 4. Zarejestruj Service Worker
    // 5. fetchAllCities równolegle
    // 6. Wyrenderuj ekran główny dla activeCityIndex
    // 7. Ustaw nasłuchiwanie zdarzeń
  },

  async refreshAll() { },

  navigateTo(view, params = {}) { },

  // Obsługa swipe lewo/prawo na Ekranie 1
  handleSwipe(direction) { },

  // Zmiana aktywnego miasta (aktualizuje stan + localStorage + rerenderuje)
  setActiveCity(index) { }
};
```

---

## 11. Ekran 1 — Pogoda (szczegółowy opis)

### Struktura layoutu (od góry do dołu)

```
┌──────────────────────────────────┐
│  [Nazwa miasta / Twoja lokalizacja]   [ikona listy miast]  │  ← nagłówek
├──────────────────────────────────┤
│                                  │
│         🌤️                       │
│         21°                      │  ← HERO: ikona (56px) + temp (80px, weight 200)
│    Częściowe zachmurzenie        │    opis (16px), odczuwalna (14px, tertiary)
│    Odczuwalna 18°                │
│                                  │
├──────────────────────────────────┤
│  ☀️ 5:12  🌙 20:47  ↑24°  ↓12°  │  ← "Dziś w skrócie": wschód, zachód, maks, min
│  💬 "Po południu przelotny deszcz"│    kluczowa prognoza dnia (1 zdanie)
├──────────────────────────────────┤
│  ← poziomy scroll godzinowy →    │  ← PROGNOZA GODZINOWA
│  [10] [11✓] [12] [13] [14] ...  │    do końca dnia + cały następny dzień
│   19°  21°  23°  24°  22°       │    bieżąca godzina wyróżniona
├──────────────────────────────────┤
│  PROGNOZA 14 DNI                 │  ← sekcja dzienna
│  Dziś  ⛅  ████░░  12°  23°     │    ikona + pasek opadów + min/maks
│  Jutro ☀️  ░░░░░░  14°  26°     │
│  Śr    🌧️  ████████ 9°   18°   │
│  ...                             │
├──────────────────────────────────┤
│         ● ○ ○                    │  ← kropki nawigacyjne (liczba miast)
└──────────────────────────────────┘
```

### Sekcja "Dziś w skrócie" — logika kluczowej prognozy

```javascript
function getDaySummary(hourlyData, currentIdx) {
  // Sprawdź godziny od teraz do końca dnia
  // Znajdź: najgorszy weathercode w tym oknie
  // Jeśli jest deszcz/burza → "Po [godzina] [opis]"
  // Jeśli wieczorem ochłodzenie > 5° → "Wieczorem chłodniej"
  // Jeśli brak anomalii → "Bez większych zmian"
}
```

### Pasek godzinowy — zakres godzin

```javascript
function getHourlyRange(hourlyTimes, currentIdx) {
  // Od bieżącej godziny do końca następnego dnia (23:00)
  // Np. jeśli teraz 14:00 wtorek → pokazuj od 14:00 wt do 23:00 śr
  // Max ~33 komórki
  // Separator "| Jutro |" między dniem bieżącym a następnym
}
```

### Prognoza 14-dniowa — pasek opadów

Pasek opadów w wierszu dnia: szerokość = `precipitation_probability_max`, kolor zależy od wartości:
- 0–20% → brak paska (tylko szary placeholder)
- 21–50% → `--accent-rain` opacity 0.4
- 51–80% → `--accent-rain` opacity 0.7
- 81–100% → `--accent-rain` pełny

---

## 12. Ekran 2 — Lista miast (szczegółowy opis)

### Layout

```
┌──────────────────────────────────┐
│  ← Wstecz          Moje miasta  │  ← nagłówek
├──────────────────────────────────┤
│  📍 Twoja lokalizacja            │  ← karta GPS (zawsze pierwsza, nie można usunąć)
│     Poznań · mazowieckie         │    subtitle z reverse geocode
│     21°  Częściowe zachmurzenie  │
├──────────────────────────────────┤
│  Kraków                          │  ← karty dodanych miast
│  małopolskie                     │    swipe left → usuń
│  26°  Słonecznie                 │
├──────────────────────────────────┤
│  Gdańsk                          │
│  ...                             │
├──────────────────────────────────┤
│  + Dodaj miasto                  │  ← przycisk na dole listy
└──────────────────────────────────┘
```

**Interakcje:**
- Tap na kartę → ustaw jako aktywne miasto → przejdź do Ekranu 1
- Swipe left na kartę → pojawia się czerwony przycisk "Usuń" (tylko dla nie-GPS miast)
- Long-press → tryb reorder (przeciąganie kart) — opcjonalne, nice to have
- Tap "+ Dodaj miasto" → Ekran 3

---

## 13. Ekran 3 — Wyszukiwanie (szczegółowy opis)

### Layout

```
┌──────────────────────────────────┐
│  Anuluj      Dodaj miasto        │  ← nagłówek
├──────────────────────────────────┤
│  🔍 [ Wpisz nazwę miasta...    ] │  ← input, autofokus
├──────────────────────────────────┤
│  Wrocław                         │  ← wyniki (live, debounce 400ms, min 2 znaki)
│  dolnośląskie · Polska     +     │
├──────────────────────────────────┤
│  Wrocław Fabryczna               │
│  dolnośląskie · Polska     +     │
└──────────────────────────────────┘
```

**Stany:**
- Pusty input → "Wpisz nazwę miasta" (placeholder, brak listy)
- Ładowanie → spinner w polu input
- Brak wyników → "Nie znaleziono: [query]"
- Błąd sieci → "Sprawdź połączenie z internetem"
- Po dodaniu → toast "Dodano [nazwa]" → powrót do Ekranu 2

**Zabezpieczenie:** jeśli miasto o tym samym `id` już istnieje na liście → toast "To miasto już masz na liście" zamiast dodawania duplikatu.

---

## 14. Service Worker (`sw.js`)

Strategia: Cache First dla zasobów statycznych, sieć (przez localStorage) dla danych API.

```javascript
const CACHE_NAME = 'weather-pwa-v1';

const STATIC_ASSETS = [
  '/', '/index.html', '/css/styles.css',
  '/js/app.js', '/js/api.js', '/js/geo.js',
  '/js/storage.js', '/js/ui.js', '/js/weather-codes.js', '/js/pwa.js',
  '/manifest.json', '/offline.html',
  '/icons/icon-192.png', '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('open-meteo.com') ||
      url.hostname.includes('bigdatacloud.net')) return; // obsługa w api.js / geo.js

  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).catch(() =>
        url.pathname === '/' ? caches.match('/offline.html') : Response.error()
      )
    )
  );
});
```

---

## 15. Obsługa błędów i stanów edge-case

| Sytuacja | Zachowanie |
|---|---|
| GPS niedostępny (odmowa uprawnień) | Karta GPS pokazuje "Lokalizacja niedostępna" + przycisk "Spróbuj ponownie" |
| GPS timeout (>10s) | Fallback do ostatniej zapisanej pozycji GPS lub komunikat |
| Brak internetu przy starcie | Dane z localStorage cache + banner "Dane z [timestamp]" |
| Brak internetu, brak cache | Ekran z ikoną chmury + "Brak połączenia. Spróbuj ponownie." |
| Błąd API (5xx) | Toast "Nie udało się pobrać pogody" + dane z cache jeśli dostępne |
| Pusta lista (tylko GPS, GPS odmówiony) | Ekran powitalny: "Dodaj pierwsze miasto aby zobaczyć prognozę" |
| Duplikat miasta | Toast "To miasto już masz na liście" |
| localStorage pełny | Cicha degradacja — nie zapisuj cache, aplikacja działa bez offline |
| Powrót do karty po >5 min | Automatyczne odświeżenie danych w tle |
| Połączenie wraca (event 'online') | Automatyczne odświeżenie + ukrycie bannera offline |

---

## 16. Pomocnicze funkcje JavaScript

```javascript
// Kierunek wiatru: stopnie → skrót (N, NE, E, ...)
function degreesToCardinal(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// Indeks bieżącej godziny w tablicy hourly.time
function getCurrentHourIndex(hourlyTimes) {
  const currentHour = new Date().toISOString().slice(0, 13); // "2025-05-20T14"
  return hourlyTimes.findIndex(t => t.startsWith(currentHour));
}

// Format czasu z ISO string → HH:mm
function formatTime(isoString) {
  return isoString.slice(11, 16); // "2025-05-20T05:12" → "05:12"
}

// Nazwy dni tygodnia (Dziś, Jutro, Pn, Wt, ...)
function getDayLabel(isoDate, index) {
  if (index === 0) return 'Dziś';
  if (index === 1) return 'Jutro';
  const days = ['Nd','Pn','Wt','Śr','Cz','Pt','Sb'];
  return days[new Date(isoDate).getDay()];
}

// Kolor indeksu UV
function uvColor(index) {
  if (index <= 2)  return '#2d7dd2'; // niski
  if (index <= 5)  return '#f7c948'; // umiarkowany
  if (index <= 7)  return '#f4801a'; // wysoki
  if (index <= 10) return '#e05c2a'; // bardzo wysoki
  return '#9b44c8';                  // ekstremalny
}

// Odległość między dwoma punktami GPS w km (formuła Haversine)
function gpsDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Temperatura w wybranej jednostce
function formatTemp(celsius, unit = 'C') {
  if (unit === 'F') return `${Math.round(celsius * 9/5 + 32)}°`;
  return `${Math.round(celsius)}°`;
}
```

---

## 17. Sekwencja startowa

```
1.  DOMContentLoaded → App.init()
2.  Wczytaj cities z localStorage (fallback: [GPS_CITY])
3.  Wczytaj prefs z localStorage (fallback: { activeCityIndex: 0, unit: 'C' })
4.  Wyrenderuj skeleton loader dla aktywnego miasta
5.  Pobierz pozycję GPS (nieblokująco, setTimeout fallback 10s)
6.  Gdy GPS gotowy → zaktualizuj GPS_CITY.latitude/longitude
7.  Zarejestruj Service Worker
8.  API.fetchAllCities(cities) — Promise.allSettled, równolegle
9.  Ustaw dynamiczne tło na podstawie danych aktywnego miasta
10. Wyrenderuj Ekran 1 dla activeCityIndex
11. Nasłuchuj zdarzeń:
      visibilitychange → gdy visible + >5 min → refreshAll()
      online           → refreshAll() + ukryj banner offline
      offline          → pokaż banner offline
```

---

## 18. Notatki implementacyjne

- **Brak frameworka.** Vanilla JS + DOM API. Żadnych zewnętrznych zależności poza Google Fonts.
- **Temperatury** zawsze `Math.round()`. Nigdy nie pokazuj dziesiętnych.
- **Daty i strefy czasowe.** Nie parsuj ISO stringów przez `new Date()` — używaj `.slice()`. Do wyświetlania użyj `Intl.DateTimeFormat` z `timezone` z odpowiedzi API.
- **Tło aplikacji.** Zmiana gradientu przez `transition: background 800ms ease` na elemencie `body` lub `.app-bg`. Przy nocy (is_day === 0) kolor tekstu w hero zmienia się na `--text-on-gradient` (biały).
- **Swipe obsługa.** Implementuj przez `touchstart` / `touchend` — minimalna delta 50px, ignoruj swipe pionowy. Brak zewnętrznych bibliotek swipe.
- **Karty z blur.** Sekcje na Ekranie 1 (godzinowa, dzienna) mają `backdrop-filter: blur(12px)` + `background: rgba(255,255,255,0.72)` — efekt "frosted glass" na tle gradientu.
- **iOS Safari PWA.** Wymagane w `<head>`:
  ```html
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  ```
- **Bezpieczna strefa dolna (iPhone X+).** `padding-bottom: env(safe-area-inset-bottom)` na kropkach nawigacyjnych i nawigacji ekranów.
- **Dostępność.** Ikony emoji w `<span aria-hidden="true">`, każdy interaktywny element z `aria-label`. Kontrast tekstu sprawdzony dla każdego gradientu tła.
- **Kolejność budowania modułów.** Zalecana: `storage.js` → `weather-codes.js` → `geo.js` → `api.js` → `ui.js` → `app.js` → `sw.js`.
