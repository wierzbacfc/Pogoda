<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Wytyczne i Instrukcje Projektowe dla Agentów AI (WeatherApp PWA)

Dokument określa reguły pracy, architekturę oraz standardy jakościowe obowiązujące każdego agenta AI w repozytorium **Pogoda (WeatherApp)**.

---

## 1. Architektura i Kontekst Projektu

- **Główny katalog projektu**: `c:\Users\Misiaczki\Downloads\Antigravity\Pogoda` (wszystkie polecenia, buildy i serwer deweloperski muszą być uruchamiane z tego katalogu).
- **Stos technologiczny**: Next.js 16.3 (Turbopack, App Router) + React 19 + TypeScript 5 + Tailwind CSS v4 + Lucide React.
- **Port serwera**: Domyślnie **port 3333** (`npx next dev --port 3333`). Serwer jest dostępny w sieci lokalnej (np. `http://192.168.0.181:3333`).
- **Urządzenie referencyjne (Mobile-First)**: Smartfon Xiaomi 11 (viewport: szerokość `392px`, wysokość `872px`, `deviceScaleFactor: 2.75`).

---

## 2. Nadrzędne Zasady UX / UI

1. **Aplikacja ma być prosta, przejrzysta i czytelna z daleka**:
   - Kluczowe dane (temperatura, warunki, odczuwalna, wiatr, opady) muszą być natychmiast widoczne bez zbędnego chaosu informacyjnego.
   - Nowoczesne "bajery" (cząsteczki, wykresy, fazy księżyca) mają być subtelne i nie mogą przesłaniać danych meteorologicznych.
2. **Zaawansowany Glassmorphism (szkło neomorficzne)**:
   - Panele i kafelki używają półprzezroczystości (`bg-zinc-900/40` do `bg-zinc-950/75`), rozmycia tła (`backdrop-blur-xl` / `backdrop-blur-2xl`) oraz subtelnych krawędzi (`border-white/10` do `border-white/25`).
   - Brak ciężkich, czarnych lub nieprzejrzystych bloków zasłaniających tło.
3. **Żywe, nasycone tła (`DynamicBackground.tsx`)**:
   - Tła pogodowe bazują na wielopunktowych gradientach radialnych (`radial-gradient`), nie na płaskich, wyblakłych gradientach liniowych.
   - Dolna maska przyciemniająca jest delikatna (`from-black/15 via-transparent to-black/35`), aby soczyste kolory rozświetlały całą wysokość ekranu.
   - Cząsteczki (deszcz, śnieg, gwiazdy) posiadają wieloplanową głębię (ostry pierwszy plan + rozmyte cząstki bokeh w tle).
4. **Kontekstowe dymki szczegółów (`SpeechBubble`) zamiast pełnych modali**:
   - Szczegóły metryk pogodowych otwierają się jako dymek bezpośrednio pod klikniętym rzędem w `DetailsGrid.tsx`.
   - **Reguła widoczności (Auto-Scroll)**: Po otwarciu dymka ekran **musi automatycznie i płynnie doscrollować się** (`scrollBy / scrollIntoView smooth`), tak aby dymek i jego strzałka były w 100% widoczne powyżej dolnego paska nawigacyjnego bez zmuszania użytkownika do ręcznego przewijania.
5. **Ergonomia kciuka**:
   - Dolny pasek nawigacyjny (`BottomToolbar`) oraz wyszukiwarka w `CitiesSheet` znajdują się w dolnej strefie ekranu, bezpośrednio pod kciukiem.

---

## 3. Integralność Danych i Logika Biznesowa

1. **Brak duplikatów miast**:
   - Przed dodaniem miejscowości do listy zapisanych miast weryfikowana jest odległość geograficzna (`gpsDistance < 15km`) oraz `id`. Dodanie tego samego miasta jest blokowane.
2. **Precyzja opadów**:
   - Na 12-godzinnym wykresie słupkowym w `HourlyForecast.tsx` prawdopodobieństwo opadów jest uzupełnione o dokładną wartość w milimetrach `[mm]` wyświetlaną bezpośrednio nad słupkiem.
3. **Bezpieczna persystencja (`localStorage`)**:
   - Wszystkie operacje na pamięci przeglądarki muszą być zabezpieczone blokami `try/catch` i obsługiwać przypadki braku danych lub pierwszego uruchomienia aplikacji.

---

## 4. Zasady Pracy i Weryfikacji Kodu

1. **Kompilacja TypeScript i Turbopack**:
   - Po każdej większej zmianie uruchom `npm run build` i upewnij się, że kompilacja kończy się sukcesem (kod wyjścia `0`, brak błędów typów).
2. **Zachowanie komentarzy i reguł Next.js**:
   - Zawsze zachowuj blok `<!-- BEGIN:nextjs-agent-rules -->` w `AGENTS.md`.
   - Korzystaj z biblioteki ikon `lucide-react`.
   - Nie twórz nadmiarowych zagnieżdżonych katalogów ani nie zaśmiecaj repozytorium plikami tymczasowymi.
