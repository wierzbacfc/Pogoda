# Pogoda PWA (WeatherApp) 🌤️

Nowoczesna, przejrzysta i płynna aplikacja pogodowa typu PWA (Progressive Web App) zbudowana w oparciu o **Next.js 16 (Turbopack)**, **React 19**, **TypeScript** oraz **Tailwind CSS v4**. Aplikacja łączy estetykę szklanego neomorfizmu (*Glassmorphism*), żywe ambientowe tła reagujące na pogodę i porę dnia oraz precyzyjne dane meteorologiczne z darmowego ekosystemu **Open-Meteo**.

---

## 📱 Najważniejsze funkcje i nowoczesne rozwiązania

### 1. 🌈 Intensywne, żywe tła pogodowe (`DynamicBackground`)
- **Wielopunktowe gradienty radialne (Mesh Gradients)**: 9 dopracowanych stanów aury (m.in. *Słonecznie*, *Gwiaździsta noc*, *Częściowe zachmurzenie*, *Pochmurno*, *Mżawka*, *Deszcz*, *Burza*, *Śnieg*, *Mgła*).
- **Efekty atmosferyczne i poświaty**:
  - Pulsująca złota korona słoneczna i unoszące się pyłki światła.
  - Błyski wyładowań atmosferycznych o realistycznej, dwufazowej dynamice.
  - Kosmiczna poświata mgławicy i spadające gwiazdy na nocnym niebie.
  - Zredukowany filtr przyciemniający, dzięki czemu soczyste kolory nieba rozświetlają całą wysokość ekranu i prześwitują przez szklane kafelki.
- **Wieloplanowe cząsteczki 3D (Bokeh)**: podział na wyrazisty, ostry pierwszy plan oraz miękkie, rozmyte tło (np. strugi deszczu, wirujące płatki śniegu).

### 2. 💬 Kontekstowe dymki szczegółów (`Speech Bubble`) z inteligentnym Auto-Scrollem
- Dotknięcie dowolnego wskaźnika pogodowego (*Słońce/Księżyc*, *Jakość powietrza*, *Wiatr*, *Wilgotność*, *Indeks UV*, *Ciśnienie*) rozwija półprzezroczysty dymek ze strzałką wskazującą aktywny kafelek.
- **Inteligentne automatyczne przewijanie**: aplikacja natychmiast płynnie doscrollowuje ekran (`scrollIntoView / scrollBy smooth`), gwarantując, że cały dymek jest w 100% widoczny powyżej dolnego paska nawigacji bez konieczności ręcznego przesuwania strony.

### 3. 📊 Wykres opadów z ilościami w [mm]
- Pozioma prognoza godzinowa na 36h z 12-godzinnym wykresem słupkowym prawdopodobieństwa deszczu.
- Bezpośrednio nad słupkami wyświetlane są precyzyjne prognozowane sumy opadów w milimetrach (np. `0.4 mm`, `1.2 mm`).

### 4. ☀️ Paraboliczny łuk słońca (`Sun Arc`) i Fazy Księżyca
- Wizualny łuk wędrówki słońca po niebie z wyliczoną w czasie rzeczywistym pozycją i odliczaniem do wschodu/zachodu.
- W nocy kafelek automatycznie przełącza się na fazę księżyca (8 faz z procentem oświetlenia tarczy).

### 5. 🍃 Europejski Indeks Jakości Powietrza (AQI)
- Integracja z Open-Meteo Air Quality API: wskaźnik AQI, stężenia pyłów PM2.5 oraz PM10 wraz z rekomendacjami zdrowotnymi dla alergików i osób aktywnych.

### 6. 🏙️ Płynne zarządzanie miastami i geolokalizacja GPS
- Automatyczne wykrywanie pozycji GPS użytkownika po uruchomieniu.
- Dolny pasek nawigacyjny (`BottomToolbar`) z kropkami miast i płynną obsługą gestów swipe (przesuwanie w lewo/prawo).
- Wysuwany dolny arkusz (`CitiesSheet`) z wyszukiwarką geokodowania na dole ekranu, uniemożliwiający dodawanie duplikatów miast.

### 7. ⚙️ Symulator pogody w Ustawieniach (`SettingsModal`)
- Możliwość wyboru jednostek temperatury (°C / °F), prędkości wiatru i ciśnienia.
- Interaktywna siatka 3x3 umożliwiająca natychmiastowe przetestowanie każdego z 9 animowanych teł na żywym urządzeniu z przyciskiem powrotu do danych rzeczywistych.

---

## 🛠️ Stos technologiczny

| Warstwa | Technologia | Zastosowanie |
|---|---|---|
| **Framework** | Next.js 16.3 (Turbopack) | App Router, optymalizacja SSR/CSR, hybrydowy eksport |
| **UI Library** | React 19 | Komponenty klienckie, stan, hooki cyklu życia |
| **Język** | TypeScript 5 | Ścisłe typowanie modeli pogodowych i komponentów |
| **Stylowanie** | Tailwind CSS v4 | Nowoczesne utility-first CSS, zaawansowany glassmorphism |
| **Ikony** | Lucide React | Wektorowe ikony pogodowe i nawigacyjne |
| **API Pogody** | Open-Meteo Weather API | Bezkluczowe, darmowe API z prognozą na 14 dni i 36 godzin |
| **API Jakości Powietrza** | Open-Meteo Air Quality | Stężenia PM2.5, PM10, europejski indeks AQI |
| **API Geokodowania** | Open-Meteo Geocoding | Błyskawiczne wyszukiwanie miast w języku polskim |
| **Testy & Inspekcja** | Playwright | Automatyczne testy responsywności (np. Xiaomi 11: 392x872) |

---

## 🚀 Uruchomienie projektu

### Wymagania wstępne
- [Node.js](https://nodejs.org/) (wersja 18+ lub 20+)
- Menedżer pakietów `npm`

### 1. Instalacja zależności
```bash
npm install
```

### 2. Uruchomienie serwera deweloperskiego
Serwer domyślnie nasłuchuje na porcie **3333** i jest skonfigurowany do obsługi połączeń w sieci lokalnej (można go testować na telefonie podłączonym do tego samego Wi-Fi):
```bash
npx next dev --port 3333
```
- **Lokalnie na komputerze**: [http://localhost:3333](http://localhost:3333)
- **Na telefonie w sieci lokalnej**: `http://<TWOJE_IP_LOKALNE>:3333` (np. `http://192.168.0.181:3333`)

### 3. Kompilacja produkcyjna
```bash
npm run build
```

---

## 📁 Struktura katalogów

```
Pogoda/
├── docs/
│   └── weather-pwa-spec.md      # Pełna specyfikacja techniczna aplikacji
├── public/
│   ├── manifest.json            # Konfiguracja PWA
│   ├── sw.js                    # Service Worker (tryb offline i cache)
│   └── icons/                   # Ikony PWA w różnych rozdzielczościach
├── src/
│   ├── app/
│   │   ├── globals.css          # Style globalne, animacje cząsteczek @keyframes
│   │   ├── layout.tsx           # Główny layout HTML, viewport, metadane PWA
│   │   └── page.tsx             # Strona główna montująca WeatherClient
│   ├── components/
│   │   ├── WeatherApp.tsx       # Główny kontroler aplikacji, obsługa swipe, stan
│   │   ├── DynamicBackground.tsx# Silnik wieloplanowych animacji i radialnych gradientów
│   │   ├── BottomToolbar.tsx    # Dolny pasek nawigacyjny z przyciskiem menu i kropkami
│   │   ├── dashboard/
│   │   │   ├── HeroSection.tsx      # Główny kafelek: temperatura, stan, fabuła pogodowa
│   │   │   ├── HourlyForecast.tsx   # Przewijana prognoza 36h + wykres opadów w [mm]
│   │   │   ├── DailyForecast.tsx    # Tabela 7/14 dni z kolorowymi zakresami temperatur
│   │   │   ├── DetailsGrid.tsx      # Siatka 6 wskaźników z auto-scrollem dymków
│   │   │   └── CityDots.tsx         # Wskaźnik kropkowy aktywnego miasta
│   │   ├── cities/
│   │   │   ├── CitiesSheet.tsx      # Dolny arkusz listy miast z wyszukiwarką na dole
│   │   │   ├── CityCard.tsx         # Kafelek zapisanego miasta
│   │   │   └── SearchSheet.tsx      # Komponent wyszukiwania geolokalizacyjnego
│   │   ├── settings/
│   │   │   └── SettingsModal.tsx    # Modal ustawień z 9-kafelkowym symulatorem pogody
│   │   └── ui/
│   │       ├── BottomSheet.tsx      # Uniwersalny wysuwany arkusz modalny
│   │       ├── Skeleton.tsx         # Ekrany ładowania szkieletowego
│   │       ├── Toast.tsx            # Komunikaty powiadomień
│   │       └── WeatherIcon.tsx      # Dynamiczne mapowanie ikon pogodowych
│   ├── hooks/
│   │   ├── useWeatherData.ts    # Pobieranie i cache'owanie pogody oraz jakości powietrza
│   │   ├── useGeolocation.ts    # Natywna obsługa współrzędnych GPS
│   │   ├── useLocalStorage.ts   # Bezpieczna persystencja miast i ustawień
│   │   └── useToast.ts          # Zarządzanie powiadomieniami
│   └── lib/
│       ├── api.ts               # Klient zapytań HTTP do API Open-Meteo
│       ├── types.ts             # Definicje interfejsów TypeScript
│       ├── utils.ts             # Matematyka łuku słońca, fazy księżyca, AQI, daty
│       └── weather-codes.ts     # Kody WMO, etykiety oraz radialne gradienty tła
├── AGENTS.md                    # Zasady pracy agentów AI w projekcie
├── CLAUDE.md                    # Skróty i wytyczne deweloperskie
├── next.config.ts               # Konfiguracja Next.js
├── package.json                 # Zależności i skrypty npm
└── tsconfig.json                # Konfiguracja kompilatora TypeScript
```

---

## 🎨 Wytyczne wizualne i standardy UX
1. **Prostota i przejrzystość**: Aplikacja zachowuje maksymalną czytelność z daleka. Nowoczesne "bajery" (animowane cząsteczki, wykresy, fazy księżyca) są subtelne i nie zakłócają odbioru kluczowych danych o pogodzie.
2. **Kompaktowość i ergonomia kciuka**: Najważniejsze przyciski nawigacyjne, wyszukiwarka oraz kropki miast znajdują się w dolnej strefie ekranu, idealnie pod kciukiem na telefonie.
3. **Płynność**: Wszystkie przejścia ekranów, animacje cząsteczek i auto-scroll dymków działają ze sprzętową akceleracją 60 FPS.
