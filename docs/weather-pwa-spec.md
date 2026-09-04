# WeatherApp PWA — Pełna Specyfikacja Techniczna i Architektura

Dokument stanowi oficjalną specyfikację techniczną, architektoniczną oraz wytyczne projektowe aplikacji **Pogoda (WeatherApp PWA)**.

---

## 1. Cel, wizja i filozofia designu

Aplikacja pogodowa działająca w modelu **Progressive Web App (PWA)**, zoptymalizowana pod urządzenia mobilne (główny profil testowy: nowoczesne smartfony m.in. Xiaomi 11 / viewport `392x872` oraz ekrany desktopowe).

### Główne filary projektowe:
1. **Prostota i bezwzględna przejrzystość**: Aplikacja ma być natychmiast czytelna. Kluczowe informacje (aktualna temperatura, warunki, odczuwalna, zakres dnia, wiatr) widoczne od razu po otwarciu.
2. **Nowoczesne, estetyczne "bajery" bez przeładowania**:
   - Dynamiczne, wielopunktowe radialne tła reagujące na pogodę i porę dnia.
   - Półprzezroczyste szklane panele (*Glassmorphism*) przepuszczające ambientowe światło z tła.
   - Paraboliczny łuk słońca (`Sun Arc`) z pozycją gwiazdy w czasie rzeczywistym oraz nocna faza księżyca.
   - Europejski Indeks Jakości Powietrza (AQI) z wartościami cząstek PM2.5 i PM10.
   - 12-godzinny wykres słupkowy opadów z precyzyjną wartością w milimetrach `[mm]` nad każdym słupkiem.
   - Kontekstowe dymki szczegółów (`Speech Bubble`) z automatycznym, płynnym przewijaniem w pole widzenia.
3. **Ergonomia jednej ręki (Thumb-friendly navigation)**:
   - Dolny pasek nawigacyjny (`BottomToolbar`) z kropkami miast i menu.
   - Panel wyszukiwania i dodawania miast umieszczony na dole wysuwanego arkusza (`CitiesSheet`).
   - Płynny gest swipe w lewo/prawo na całej powierzchni ekranu głównego.

---

## 2. Stos technologiczny

| Warstwa | Technologia / Narzędzie | Rola w systemie |
|---|---|---|
| **Framework bazowy** | Next.js 16.3 (Turbopack) | Silnik App Router, optymalizacja pakietów, obsługa SSR/CSR |
| **Biblioteka UI** | React 19.2 | Komponenty interaktywne, refy, hooki stanu i animacji |
| **Język programowania**| TypeScript 5.x | Bezpieczeństwo typów, precyzyjne interfejsy API i modeli pogody |
| **Stylowanie** | Tailwind CSS v4 (`@tailwindcss/postcss`) | Glassmorphism, zaawansowane filtry `backdrop-blur`, tokeny kolorów |
| **Ikony** | Lucide React | Wektorowe ikony pogodowe, strzałki kierunku wiatru, wskaźniki |
| **API Meteorologiczne**| Open-Meteo Weather Forecast API | Darmowe, bezkluczowe API prognozy godzinowej (36h) i 14-dniowej |
| **API Jakości Powietrza**| Open-Meteo Air Quality API | Indeks AQI, pyły zawieszone PM2.5 i PM10 |
| **API Geokodowania** | Open-Meteo Geocoding API | Szybkie wyszukiwanie miejscowości w języku polskim |
| **Lokalizacja** | HTML5 Geolocation API | Automatyczne pobieranie współrzędnych GPS |
| **Pamięć trwała** | `localStorage` | Zapis listy miast, aktywnego miasta, preferencji jednostek |
| **Tryb Offline / PWA** | Service Worker + `manifest.json` | Instalowalność na ekranie telefonu, buforowanie zasobów |
| **Weryfikacja jakości**| Playwright Test Runner | Automatyczne zrzuty ekranu, testy responsywności i auto-scrollu |

---

## 3. Architektura widoków i nawigacji

Aplikacja funkcjonuje jako zintegrowana aplikacja jednoekranowa (SPA) z warstwowymi arkuszami dolnymi i modalnymi.

```
┌─────────────────────────────────────────────────────────┐
│              DynamicBackground (z-index: 0)              │
│  - Wielopunktowy radialny mesh gradient                 │
│  - Poświaty słoneczne / błyski piorunów / zorza         │
│  - Cząsteczki 3D: deszcz, śnieg bokeh, pyłki, gwiazdy   │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│               WeatherApp (Główny ekran)                 │
│                                                         │
│  [HeroSection]                                          │
│  - Nazwa miasta, wskaźnik GPS, temperatura 48px         │
│  - Pigułka podsumowania fabularnego pogody              │
│  - Mini-metryki: Odczuwalna, Zakres dnia, Wiatr         │
│                                                         │
│  [HourlyForecast]                                       │
│  - Poziomy slider 36 godzin (temperatura + ikony)       │
│  - Wykres opadów: słupki prawdopodobieństwa             │
│    oraz dokładne wartości w [mm] nad słupkami           │
│                                                         │
│  [DailyForecast]                                        │
│  - Lista 7 dni z możliwością rozwinięcia do 14 dni      │
│  - Gradientowe paski rozpiętości temperatur min/max     │
│                                                         │
│  [DetailsGrid]                                          │
│  - Rząd 1: Słońce (Sun Arc) | Jakość Powietrza (AQI)    │
│  - Rząd 2: Wiatr (kierunek °) | Wilgotność (punkt rosy) │
│  - Rząd 3: Indeks UV | Ciśnienie (hPa)                  │
│  - [SpeechBubble] Kontekstowy dymek z auto-scrollem     │
│                                                         │
│  [BottomToolbar] (z-index: 40, floating na dole)        │
│  - Kompas / wskaźnik lokalizacji                        │
│  - Paginator kropkowy miast (CityDots)                  │
│  - Przycisk wysunięcia panelu miast                     │
└──────────────┬───────────────────────────┬──────────────┘
               │ (Kliknięcie menu)         │ (Kliknięcie ikony ⚙)
               ▼                           ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  CitiesSheet (Dolny Arkusz)  │ │  SettingsModal (Okno Ustawień)│
│  - Kafelek GPS               │ │  - Wybór jednostek (°C/°F)   │
│  - Lista dodanych miast      │ │  - Ustawienia powiadomień    │
│  - Wyszukiwarka Geocoding    │ │  - Symulator 9 teł pogodowych│
│    na dole (brak duplikatów) │ │    z podglądem na żywo       │
└──────────────────────────────┘ └──────────────────────────────┘
```

---

## 4. Szczegółowy opis kluczowych modułów

### 4.1. DynamicBackground (`src/components/DynamicBackground.tsx`)
Odpowiada za rendering tła dla całej aplikacji.
- **Kody WMO**: Mapowane w `weather-codes.ts` na jeden z 9 typów efektów: `sunny`, `starry`, `partly`, `cloudy`, `drizzle`, `rain`, `storm`, `snow`, `fog`.
- **Wielopunktowe gradienty radialne**: Zamiast płaskich pasów kolorystycznych, tła wykorzystują wielowarstwowe kompozycje `radial-gradient` z emiterem światła w określonym punkcie nieba (np. słońce pod kątem `85% 12%`, nocny księżyc pod `80% 15%`).
- **Warstwy głębi (Depth & Bokeh)**:
  - Cząsteczki deszczu renderowane są w dwóch planach: przednie dłuższe, wyraziste strugi z efektem świetlistym oraz cieńsze, miękko rozmyte strugi w tle.
  - Płatki śniegu dzielą się na duże, rozmyte cząstki bokeh (`blur-[1.5px]`) unoszące się tuż przed ekranem oraz drobniejsze, ostre płatki w głębi.
  - W nocy generowane są gwiazdy o zróżnicowanej jasności oraz animowane spadające meteory.
  - Podczas burzy zastosowano podwójny, asynchroniczny błysk pioruna rozświetlający purpurowe chmury.

### 4.2. Kontekstowy dymek szczegółów (`DetailsGrid.tsx`)
Zastąpił pełnoekranowe modale przerywające kontekst przeglądania:
- Dotknięcie kafelka metryki wstawia dymek bezpośrednio pod aktywnym rzędem.
- W górnej krawędzi dymka wyrysowany jest precyzyjny trójkątny grot (`▲`), wskazujący dokładnie na środek klikniętego kafelka (lewy: `left: 25%`, prawy: `left: 75%`).
- **Automatyczny Scroll**:
  ```tsx
  React.useEffect(() => {
    if (selectedMetric) {
      const timer = setTimeout(() => {
        if (!bubbleRef.current) return;
        const rect = bubbleRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const bottomNavOffset = 95;
        const visibleBottom = viewportHeight - bottomNavOffset;

        if (rect.bottom > visibleBottom) {
          const delta = rect.bottom - visibleBottom + 20;
          window.scrollBy({ top: delta, behavior: 'smooth' });
        } else if (rect.top < 65) {
          const delta = rect.top - 75;
          window.scrollBy({ top: delta, behavior: 'smooth' });
        }
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [selectedMetric]);
  ```
  Dzięki temu dymek nigdy nie pojawia się pod linią zgięcia ekranu ani pod dolnym paskiem nawigacyjnym.

### 4.3. Wykres opadów w [mm] (`HourlyForecast.tsx`)
- Słupki reprezentują prawdopodobieństwo opadów (od 0% do 100%).
- Jeśli prognoza wskazuje wystąpienie deszczu, bezpośrednio nad słupkiem renderowana jest etykieta z dokładną objętością wody w milimetrach (np. `0.4`, `1.2`).
- Wskaźnik "do X.X mm/h" umieszczony w prawym górnym rogu sekcji podaje maksymalną spodziewaną intensywność w cyklu 12h.

### 4.4. Zarządzanie miastami (`CitiesSheet.tsx` & `useWeatherData.ts`)
- **Geolokalizacja GPS**: Kafelek "Bieżąca lokalizacja" z ikoną kompasu i statusem live.
- **Wyszukiwarka miejscowości**: Pole wyszukiwania zoptymalizowane pod kątem kciuka na dole arkusza.
- **Ochrona przed duplikatami**: Przed zapisaniem nowego miasta następuje weryfikacja współrzędnych geograficznych (`gpsDistance < 15km`) oraz identyfikatora `id`, co całkowicie eliminuje wielokrotne dodawanie tego samego miasta.
- **Płynny swipe**: Użytkownik może przesuwać ekran główny w lewo/prawo, aby zmieniać aktywne miasto z animacją horyzontalną.

---

## 5. Modele danych (TypeScript)

### 5.1. Model pogody (`src/lib/types.ts`)
```typescript
export interface HourlyData {
  time: string[];
  temperature_2m: number[];
  relativehumidity_2m: number[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  precipitation: number[];
  weathercode: number[];
  surface_pressure: number[];
  windspeed_10m: number[];
  winddirection_10m: number[];
  windgusts_10m?: number[];
  uv_index?: number[];
}

export interface DailyData {
  time: string[];
  weathercode: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
  precipitation_sum?: number[];
  sunrise: string[];
  sunset: string[];
  uv_index_max?: number[];
}

export interface AirQualityData {
  european_aqi?: number;
  pm10?: number;
  pm2_5?: number;
}

export interface City {
  id: number | string;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  isGps?: boolean;
}
```

---

## 6. Integracja API Open-Meteo

Zastosowano darmowe punkty dostępowe Open-Meteo niewymagające kluczy API, w pełni zgodne z polityką CORS:

1. **Prognoza pogody**:
   `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,relativehumidity_2m,apparent_temperature,precipitation_probability,precipitation,weathercode,surface_pressure,windspeed_10m,winddirection_10m,windgusts_10m,uv_index&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=14`

2. **Jakość powietrza (Air Quality)**:
   `https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=european_aqi,pm10,pm2_5`

3. **Geokodowanie miejscowości**:
   `https://geocoding-api.open-meteo.com/v1/search?name={query}&count=8&language=pl&format=json`

---

## 7. Standardy jakościowe i zalecenia dla rozwoju

1. **Kompilacja bezbłędna**: Każda modyfikacja kodu musi pomyślnie przechodzić `npm run build` bez ostrzeżeń i błędów typowania TypeScript.
2. **Nienaruszalność czytelności**: Elementy szklane powinny posiadać odpowiedni kontrast tekstu (`text-white`, `text-zinc-300`) i rozmycie `backdrop-blur-xl` lub `backdrop-blur-2xl`.
3. **Płynność scrollowania**: Wszystkie interakcje modalne i rozwijane dymki nie mogą powodować gwałtownych przeskoków widoku (`layout shift`) bez płynnej animacji (`behavior: 'smooth'`).
4. **Weryfikacja na profilach mobilnych**: Obowiązkowe testowanie interfejsu na rozdzielczościach smartfonów (np. Xiaomi 11: `392x872`).
