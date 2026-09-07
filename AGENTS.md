<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Wytyczne i Instrukcje Projektowe dla Agentów AI (WeatherApp PWA)

Ten dokument jest nadrzędnym kompasem architektonicznym, wizualnym i technologicznym dla każdego agenta AI pracującego w repozytorium **Pogoda (WeatherApp)**. Wszystkie przyszłe modyfikacje i decyzje projektowe muszą być w 100% spójne z poniższymi regułami.

---

## 1. Architektura i Kontekst Technologiczny

- **Główny katalog projektu**: `c:\Users\Misiaczki\Downloads\Antigravity\Pogoda` (wszystkie polecenia, skrypty i buildy muszą być wykonywane z tego katalogu).
- **Stos technologiczny**: Next.js 16.3 (Turbopack, App Router, static export `output: 'export'`) + React 19 + TypeScript 5 + Tailwind CSS v4 + Lucide React.
- **Wdrożenie**: GitHub Pages (`basePath: /Pogoda`, automatyczny build i deploy przez GitHub Actions w `.github/workflows/pages.yml`).
- **Urządzenie referencyjne (Mobile-First)**: Smartfon Xiaomi 11 (viewport ekranu: `392px × 872px`, gęstość pikseli `deviceScaleFactor: 2.75`, ekran 120Hz).
- **Środowisko terminala**: Windows PowerShell — używaj `npm.cmd` zamiast `npm`, pamiętaj o specyfice PowerShell (brak domyślnych linuksowych `head`/`grep`).

---

## 2. Nadrzędna Filozofia Projektowa i UX / UI

1. **Prostota, czytelność z daleka i zero chaosu informacyjnego**:
   - Główny ekran musi podawać kluczowe parametry (temperatura bieżąca, odczuwalna, warunki słowne, min/max, opady, wiatr) w sposób natychmiast przyswajalny.
   - Nowoczesne "bajery" (animacje cząsteczek, wykresy, fazy księżyca, indeksy biometeorologiczne) mają być subtelne, eleganckie i nigdy nie mogą przesłaniać danych pogodowych.
   - Wszelkie teksty, jednostki i etykiety są w **języku polskim** (°C, mm, km/h, hPa, km, indeks UV).

2. **Zaawansowany Glassmorphism (szkło neomorficzne)**:
   - Wszystkie kafelki, panele, dymki i paski narzędzi bazują na głębokim szkle: półprzezroczyste tła (`bg-zinc-950/75` do `bg-zinc-900/40`), mocne rozmycie (`backdrop-blur-xl` / `backdrop-blur-2xl`), subtelne krawędzie (`border-white/10` do `border-white/20`) oraz miękkie cienie.
   - **Kategoryczny zakaz**: Brak ciężkich, czarnych, nieprzezroczystych brył zasłaniających dynamiczne tło.

3. **Żywe, głębokie tła pogodowe (`DynamicBackground.tsx`)**:
   - Tła wykorzystują wielopunktowe gradienty radialne (`radial-gradient`), które rozświetlają ekran nasyconymi barwami nieba zależnie od pogody i pory doby (dzień / noc / świt / zmierzch).
   - Dolna maska przyciemniająca jest delikatna (`from-black/15 via-transparent to-black/35`), by nie gasić soczystości kolorów.
   - Cząsteczki (krople deszczu, płatki śniegu, pyłki słoneczne, gwiazdy) posiadają wieloplanową głębię (wyraźny pierwszy plan + rozmyte cząstki bokeh w tle).

4. **Ergonomia kciuka (Thumb Zone Friendly)**:
   - Elementy sterujące znajdują się w zasięgu kciuka: dolny pasek nawigacyjny (`BottomToolbar.tsx`), wyszukiwarka w dolnym panelu miast (`CitiesSheet.tsx`), przyciski przełączania w HUD.
   - Podróżowanie po miastach odbywa się za pomocą płynnego gestu kciuka w dolnym pasku (touch scrubbing po kropkach z pływającym dymkiem `CityScrubberHUD` i wibracją haptic `navigator.vibrate(10)`).

5. **Kontekstowe dymki (`SpeechBubble`) zamiast inwazyjnych modali**:
   - Rozwinięcia metryk w `DetailsGrid.tsx` otwierają się jako neomorficzne dymki ze wskaźnikiem bezpośrednio pod klikniętym rzędem.
   - **Reguła auto-scrolla**: Po otwarciu dymka ekran płynnie przewija się (`scrollIntoView smooth`), tak aby dymek i strzałka były w 100% widoczne powyżej dolnego paska nawigacyjnego.

---

## 3. Standardy Wydajnościowe (Zasada 60-120 FPS na Mobile)

Aplikacja musi działać idealnie płynnie na telefonach ze średniej i wyższej półki (np. Xiaomi 11):

1. **Direct DOM Manipulation podczas gestów przesuwania (Zero React Re-renders)**:
   - Poziome przesuwanie ekranów miast (horizontal city swipe w `WeatherApp.tsx`) podczas ruchu palca (`touchmove`) **bezpośrednio modyfikuje `style.transform`** na referencji DOM `trackRef.current`.
   - Podobnie scrubbing kropkami w `BottomToolbar.tsx` przesuwa HUD bezpośrednio w DOM.
   - Stan Reacta (`activeCityIndex`) jest aktualizowany **wyłącznie po zakończeniu gestu** (`touchend`). Dzięki temu unikamy setek re-renderów na sekundę, eliminując jakiekolwiek gubienie klatek (jank).

2. **Czyste SVG zamiast ciężkich bibliotek wykresowych na pełnym ekranie**:
   - Komponent `LandscapeChart.tsx` rysuje wykresy za pomocą natywnego, zoptymalizowanego SVG z krzywymi Béziera, bez narzutu bibliotek zewnętrznych takich jak Recharts.
   - Wszystkie animowane kontenery korzystają z akceleracji sprzętowej GPU (`transform: translate3d(...)`, `will-change: transform`).

---

## 4. Zasady PWA i Obsługi Orientacji (Kluczowe!)

1. **NIGDY nie blokuj orientacji w `manifest.json`**:
   - Plik `public/manifest.json` **MUSI** posiadać `"orientation": "any"` (lub brak pola `orientation`).
   - **Ostrzeżenie krytyczne**: Wpisanie `"orientation": "portrait"` powoduje, że generator WebAPK w systemie Android kompiluje natywną blokadę `android:screenOrientation="portrait"` w pliku APK, co całkowicie uniemożliwia fizyczne obrócenie zainstalowanej aplikacji na telefonie!

2. **Zarządzanie pamięcią podręczną Service Workera (`public/sw.js`)**:
   - Po każdej istotnej modyfikacji assetów, styli lub manifestu **ZAWSZE podbijaj wersję cache** w `public/sw.js` (np. `pogoda-pwa-v13` -> `pogoda-pwa-v14`).
   - Plik `manifest.json` musi być w Service Workerze obsługiwany w trybie **network-first**, aby użytkownicy instalujący PWA zawsze pobierali najnowszą konfigurację instalacyjną.

3. **Wykrywanie orientacji poziomej (`useLandscape.ts`)**:
   - Nadrzędnym źródłem prawdy o orientacji poziomej jest fizyczna relacja wymiarów okna: `window.innerWidth > window.innerHeight` oraz reguła CSS `matchMedia('(orientation: landscape)')`.
   - Zdarzenia kąta obrotu (`screen.orientation.angle`) mogą mieć opóźnienia na Androidzie, dlatego nigdy nie mogą fałszywie blokować wykrycia poziomu, jeśli `innerWidth > innerHeight`.

4. **Wsparcie dla użytkowników z wyłączonym auto-obrotem w systemie**:
   - Wielu użytkowników Androida ma włączoną blokadę pionową w górnej belce systemowej.
   - W `LandscapeChart.tsx` zaimplementowano przycisk **`⟳ Obróć 90°`** (oraz pasek pomocniczy), który za pomocą transformacji CSS (`transform: rotate(90deg) translateY(-100%)`) pozwala wyświetlić pełny panoramiczny wykres na całą długość ekranu bez konieczności zmiany ustawień systemowych telefonu.

---

## 5. Wykres Poziomy (`LandscapeChart.tsx`) i Okno HUD

1. **Struktura i linie godzinowe**:
   - Wykres poziomy dzieli się na dwa spójne panele SVG:
     1. *Temperatura i opady* (krzywa temperatury z płynnym gradientem termicznym + słupki opadów w mm).
     2. *Wiatr i chmury* (obszar zachmurzenia 0-100%, krzywa wiatru, porywy w kolorze koralowym, strzałki kierunku wiatru).
   - Wykres posiada wizualną separację dnia i nocy (jaśniejszy błękitny gradient dla dnia, głęboki granat dla nocy) oraz precyzyjne znaczniki wschodu (`↑`) i zachodu (`↓`) słońca.
   - Każda godzina posiada subtelną pionową linię siatki.
   - Oś czasu na dole ma stałą dwurzędową wysokość (górny wiersz na nazwę dnia tygodnia, dolny na wyrównaną linię bazową godzin).

2. **Inteligentne okno HUD (Smart HUD Anchoring)**:
   - Po dotknięciu dowolnej godziny na wykresie rozwija się bogata neomorficzna karta HUD z danymi.
   - **Dynamiczne kotwiczenie (lustrzane)**: Dotknięcie godziny z prawej strony ekranu otwiera HUD po lewej stronie (`left-3`), a z lewej strony – po prawej (`right-3`). HUD **nigdy nie może zasłaniać palca użytkownika ani aktywnego słupka danych**.
   - HUD posiada przyciski krokowe `<` i `>` do wygodnego przesuwania godzin kciukiem oraz obsługę strzałek klawiatury.

---

## 6. Integralność Danych i Logika Biznesowa

1. **Brak duplikatów miast**:
   - Przed dodaniem miejscowości sprawdzana jest odległość GPS (`distance < 15 km`) oraz identyfikator `id`. Zapisanie tego samego miasta jest blokowane.
2. **Precyzja opadów**:
   - Wszędzie, gdzie pokazywane są opady (zarówno w `HourlyForecast`, jak i `LandscapeChart`), prawdopodobieństwo w `%` jest uzupełnione o twardą wartość w milimetrach `[mm]`.
3. **Pancerna persystencja (`localStorage`)**:
   - Wszelkie odczyty i zapisy w pamięci podręcznej muszą być zabezpieczone blokami `try/catch` z bezpiecznymi wartościami domyślnymi (fallback na pierwsze uruchomienie / brak sieci).

---

## 7. Rygor Pracy Agenta i Weryfikacja

1. **Weryfikacja builda po każdej zmianie**:
   - Każda zmiana w kodzie musi być zweryfikowana poleceniem:
     ```powershell
     npm.cmd run build
     ```
   - Build musi zakończyć się kodem wyjścia `0` (brak jakichkolwiek błędów TypeScript i Turbopack).
2. **Czystość repozytorium**:
   - Nie twórz nadmiarowych katalogów ani nie pozostawiaj skryptów testowych w głównym drzewie projektu (skrypty diagnostyczne umieszczaj w katalogu scratch artifactów).
   - Zachowaj nienaruszony blok `<!-- BEGIN:nextjs-agent-rules -->` na samym początku pliku `AGENTS.md`.
