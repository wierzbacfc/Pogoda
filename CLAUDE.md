# Claude Code — WeatherApp PWA

Podręczny przewodnik dla agenta Claude w projekcie **Pogoda (WeatherApp PWA)**.

Szczegółowe wytyczne architektoniczne i standardy UX znajdują się w [AGENTS.md](file:///c:/Users/Misiaczki/Downloads/Antigravity/Pogoda/AGENTS.md) oraz w pełnej specyfikacji [docs/weather-pwa-spec.md](file:///c:/Users/Misiaczki/Downloads/Antigravity/Pogoda/docs/weather-pwa-spec.md).

---

## ⚡ Podstawowe polecenia

```bash
# Uruchomienie serwera deweloperskiego (port 3333, dostępny w sieci lokalnej):
npx next dev --port 3333

# Sprawdzenie poprawności typów i kompilacja produkcyjna:
npm run build

# Uruchomienie wersji produkcyjnej:
npm run start
```

---

## 🎯 Główne założenia projektu

1. **Przejrzystość i prostota**: Interfejs w stylu Apple Weather z elementami Glassmorphism (`backdrop-blur-xl/2xl`, `border-white/10-25`).
2. **Żywe tła**: Wielopunktowe gradienty radialne w `DynamicBackground.tsx` z efektami 3D (deszcz na 2 planach, płatki śniegu bokeh, korona słoneczna, błyski piorunów).
3. **Kontekstowe dymki (`SpeechBubble`)**: Po kliknięciu kafelka wskaźnika w `DetailsGrid.tsx` dymek rozwija się pod rzędem i **automatycznie płynnie przewija się w pole widzenia** (`behavior: 'smooth'`).
4. **Wykres opadów**: Słupki opadów w `HourlyForecast.tsx` zawierają precyzyjne ilości w milimetrach `[mm]`.
5. **Obsługa miast**: Wyszukiwarka na dole wysuwanego arkusza `CitiesSheet.tsx`, eliminacja duplikatów miast (`gpsDistance < 15km`), nawigacja gestem swipe.
6. **Mobile First**: Testy na smartfonie Xiaomi 11 (`392x872`).

---

## 📂 Kluczowe ścieżki

- `src/components/WeatherApp.tsx` — główny komponent aplikacji, obsługa swipe i stan.
- `src/components/DynamicBackground.tsx` — silnik cząsteczek i radialnych gradientów tła.
- `src/components/dashboard/DetailsGrid.tsx` — kafelki wskaźników pogodowych i mechanizm dymków `SpeechBubble` z auto-scrollem.
- `src/components/dashboard/HourlyForecast.tsx` — prognoza godzinowa i wykres opadów w `[mm]`.
- `src/components/cities/CitiesSheet.tsx` — dolny arkusz listy miast z geokodowaniem.
- `src/components/settings/SettingsModal.tsx` — modal ustawień z 9-kafelkowym symulatorem teł.
- `src/lib/weather-codes.ts` — definicje kodów WMO, opisy i nasycone gradienty radialne `BG_GRADIENTS`.
- `src/lib/utils.ts` — obliczenia pozycji słońca (`getSunArcProgress`), faz księżyca (`getMoonPhase`), jakości powietrza (`getAqiStatus`).
