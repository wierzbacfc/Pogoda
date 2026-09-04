'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { City } from '@/lib/types';
import { getDateKeyFromHour, getDailyIndexForDate, getCurrentHourIndex, gpsDistance } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useToast } from '@/hooks/useToast';

import DynamicBackground from '@/components/DynamicBackground';
import { BottomToolbar } from '@/components/BottomToolbar';
import { Toast } from '@/components/ui/Toast';
import { UpdatePrompt } from '@/components/ui/UpdatePrompt';
import { WeatherSkeleton } from '@/components/ui/Skeleton';

import { HeroSection } from '@/components/dashboard/HeroSection';
import { HourlyForecast } from '@/components/dashboard/HourlyForecast';
import { DailyForecast } from '@/components/dashboard/DailyForecast';
import { DetailsGrid } from '@/components/dashboard/DetailsGrid';

import CitiesSheet from '@/components/cities/CitiesSheet';
import SettingsModal from '@/components/settings/SettingsModal';
import { AlertCircle, RefreshCw } from 'lucide-react';

const GPS_CITY: City = {
  id: 'gps',
  name: 'Twoja lokalizacja',
  latitude: 52.4064,
  longitude: 16.9252,
  isGps: true,
  subtitle: 'Poznań',
};

const INITIAL_CITIES: City[] = [
  {
    id: 756135,
    name: 'Warszawa',
    country_code: 'PL',
    admin1: 'Województwo mazowieckie',
    latitude: 52.2297,
    longitude: 21.0122,
    isGps: false,
    order: 1,
  },
  {
    id: 3094802,
    name: 'Kraków',
    country_code: 'PL',
    admin1: 'Województwo małopolskie',
    latitude: 50.0614,
    longitude: 19.9366,
    isGps: false,
    order: 2,
  },
];

export default function WeatherApp() {
  const [savedCities, setSavedCities] = useLocalStorage<City[]>('wpwa_cities', INITIAL_CITIES);
  const [activeCityIndex, setActiveCityIndex] = useState(0);
  const [citiesSheetOpen, setCitiesSheetOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const { toasts, showToast, dismissToast } = useToast();

  // Pull to refresh & edge bounce states
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [edgeBounce, setEdgeBounce] = useState<'left' | 'right' | null>(null);
  const pullStartRef = useRef<{ y: number; active: boolean }>({ y: 0, active: false });

  // GPS with instant fallback to Poznań
  const { coords, cityName, retry: retryGps } = useGeolocation();

  // Live GPS city
  const [gpsCityLive, setGpsCityLive] = useState<City>(GPS_CITY);

  useEffect(() => {
    if (coords) {
      setGpsCityLive(prev => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
        subtitle: cityName || prev.subtitle || 'Lokalizacja GPS',
      }));
    }
  }, [coords, cityName]);

  // Unique cities list: ensure no duplicate IDs
  const cities: City[] = [
    gpsCityLive,
    ...(savedCities || []).filter(c => c.id !== gpsCityLive.id),
  ].filter((city, index, self) => index === self.findIndex(t => t.id === city.id));

  // Weather data
  const gpsCoordsReady = true; // Always ready with Poznań fallback
  const { weatherMap, loading: weatherLoading, error: weatherError, refreshAll, fetchForCity } = useWeatherData(cities, gpsCoordsReady);

  // Active city & weather
  const activeCity = cities[activeCityIndex] || cities[0];
  const activeWeather = weatherMap.get(activeCity?.id);

  let currentWeatherCode = 0;
  let currentIsDay = true;
  let currentIdx = -1;
  let dailyIdx = 0;

  if (activeWeather && activeWeather.hourly) {
    currentIdx = getCurrentHourIndex(activeWeather.hourly.time, activeWeather.timezone);
    if (currentIdx >= 0) {
      currentWeatherCode = activeWeather.hourly.weathercode[currentIdx];
      currentIsDay = activeWeather.hourly.is_day[currentIdx] === 1;
      const dateKey = getDateKeyFromHour(activeWeather.hourly.time[currentIdx]);
      dailyIdx = getDailyIndexForDate(activeWeather.daily, dateKey);
    }
  }

  // Swipe gesture handling for touch & mouse drag
  const dragStartRef = useRef<{ x: number; y: number; time: number; target: EventTarget | null }>({
    x: 0,
    y: 0,
    time: 0,
    target: null,
  });

  const handleDragStart = useCallback((clientX: number, clientY: number, target: EventTarget | null) => {
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      time: Date.now(),
      target,
    };
  }, []);

  const handleDragEnd = useCallback((clientX: number, clientY: number) => {
    const target = dragStartRef.current.target as HTMLElement | null;
    // Don't trigger city swipe if user is interacting with horizontal scroll (e.g. hourly forecast)
    if (target && target.closest('[data-no-swipe="true"]')) {
      return;
    }

    const deltaX = dragStartRef.current.x - clientX;
    const deltaY = dragStartRef.current.y - clientY;
    const timeElapsed = Date.now() - dragStartRef.current.time;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const velocity = absX / Math.max(1, timeElapsed);

    // Fluid horizontal swipe detection:
    const isHorizontalSwipe = absX > 35 && absX > absY * 1.2;
    const isFlick = absX > 25 && velocity > 0.35 && absX > absY;

    if (isHorizontalSwipe || isFlick) {
      if (deltaX > 0) {
        // Swiped Left -> Next City
        if (activeCityIndex < cities.length - 1) {
          setSlideDirection('right');
          setActiveCityIndex(prev => prev + 1);
        } else {
          setEdgeBounce('right');
          setTimeout(() => setEdgeBounce(null), 250);
        }
      } else {
        // Swiped Right -> Previous City
        if (activeCityIndex > 0) {
          setSlideDirection('left');
          setActiveCityIndex(prev => prev - 1);
        } else {
          setEdgeBounce('left');
          setTimeout(() => setEdgeBounce(null), 250);
        }
      }
    }
  }, [activeCityIndex, cities.length]);

  // Pull-To-Refresh Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
    if (typeof window !== 'undefined' && window.scrollY <= 2) {
      pullStartRef.current = { y: e.touches[0].clientY, active: true };
    } else {
      pullStartRef.current.active = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pullStartRef.current.active || isPullRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - pullStartRef.current.y;
    if (diffY > 0 && typeof window !== 'undefined' && window.scrollY <= 2) {
      const damped = Math.min(85, Math.pow(diffY, 0.82));
      setPullDistance(damped);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    handleDragEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    if (pullDistance > 55 && !isPullRefreshing) {
      setIsPullRefreshing(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
      try {
        await refreshAll();
        showToast('Pogoda zaktualizowana', 'success');
      } catch (err) {
        showToast('Nie udało się odświeżyć pogody', 'error');
      } finally {
        setTimeout(() => {
          setIsPullRefreshing(false);
          setPullDistance(0);
        }, 300);
      }
    } else {
      setPullDistance(0);
    }
    pullStartRef.current.active = false;
  };

  // City selection & management
  const handleSelectCity = useCallback((index: number) => {
    if (index !== activeCityIndex) {
      setSlideDirection(index > activeCityIndex ? 'right' : 'left');
      setActiveCityIndex(index);
    }
  }, [activeCityIndex]);

  const handleDeleteCity = useCallback((index: number) => {
    const cityToDelete = cities[index];
    if (!cityToDelete || cityToDelete.isGps) return;

    setSavedCities(prev => (prev || []).filter(c => c.id !== cityToDelete.id));

    if (activeCityIndex >= cities.length - 1) {
      setActiveCityIndex(Math.max(0, cities.length - 2));
    }

    showToast(`Usunięto ${cityToDelete.name}`, 'success');
  }, [cities, activeCityIndex, setSavedCities, showToast]);

  const handleAddCity = useCallback((newCity: City) => {
    const existingNearby = cities.find(c => {
      if (c.id === newCity.id || c.name.toLowerCase() === newCity.name.toLowerCase()) return true;
      if (c.latitude != null && c.longitude != null && newCity.latitude != null && newCity.longitude != null) {
        const dist = gpsDistance(c.latitude, c.longitude, newCity.latitude, newCity.longitude);
        return dist < 15;
      }
      return false;
    });

    if (existingNearby) {
      showToast(`Ta okolica (${existingNearby.name}) jest już na Twojej liście`, 'info');
      return;
    }

    setSavedCities(prev => {
      const list = prev || [];
      return [...list, { ...newCity, isGps: false, order: list.length + 1 }];
    });
    setSlideDirection('right');
    fetchForCity(newCity);
    showToast(`Dodano ${newCity.name}`, 'success');
  }, [cities, setSavedCities, fetchForCity, showToast]);

  // Display name for GPS city
  const getDisplayName = (city: City): string => {
    if (city.isGps && city.subtitle) {
      if (city.subtitle === 'Brak uprawnień GPS') return 'Poznań (GPS niedostępny)';
      return city.subtitle.includes(',') ? city.subtitle.split(',')[0].trim() : city.subtitle;
    }
    return city.name;
  };

  const displayCity: City = {
    ...activeCity,
    name: getDisplayName(activeCity),
  };

  const hasWeather = !!(activeWeather && activeWeather.hourly && currentIdx >= 0);

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex justify-center text-zinc-100 font-sans selection:bg-blue-500/30">
      {/* Mobile-first centered app container tailored for Xiaomi 11 and modern phones */}
      <div className="w-full max-w-[420px] min-h-screen relative flex flex-col justify-between overflow-x-hidden shadow-2xl">
        {/* Dynamic gradient background */}
        <DynamicBackground weatherCode={currentWeatherCode} isDay={currentIsDay} />

        {/* Pull to refresh spinner indicator */}
        {(pullDistance > 0 || isPullRefreshing) && (
          <div
            className="fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all pointer-events-none"
            style={{
              transform: `translate(-50%, ${Math.min(48, pullDistance * 0.65)}px)`,
              opacity: Math.min(1, Math.max(0.4, pullDistance / 40)),
            }}
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-white/20 backdrop-blur-xl shadow-2xl text-white text-xs font-semibold">
              <RefreshCw
                size={13}
                className={`text-blue-400 ${isPullRefreshing ? 'animate-spin' : ''}`}
                style={{ transform: !isPullRefreshing ? `rotate(${pullDistance * 5}deg)` : undefined }}
              />
              <span className="text-[11px] text-zinc-300">
                {isPullRefreshing ? 'Odświeżanie...' : pullDistance > 55 ? 'Puść, aby odświeżyć' : 'Pociągnij, aby odświeżyć'}
              </span>
            </div>
          </div>
        )}

        {/* Toast notifications */}
        <Toast toasts={toasts} onDismiss={dismissToast} />

        {/* Main Weather Screen (100% full-bleed and primary) */}
        <main
          className="relative z-10 pb-28 flex-1 touch-pan-y select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={(e) => handleDragStart(e.clientX, e.clientY, e.target)}
          onMouseUp={(e) => handleDragEnd(e.clientX, e.clientY)}
        >
          <div
            className="px-3.5 pt-7 pb-4 flex flex-col gap-3.5 transition-transform duration-250 ease-out"
            style={{
              transform: edgeBounce === 'right' ? 'translateX(-12px)' : edgeBounce === 'left' ? 'translateX(12px)' : undefined,
            }}
          >
            {!hasWeather ? (
              weatherError && !weatherLoading ? (
                <div className="bg-zinc-900/60 backdrop-blur-xl border border-red-500/20 rounded-3xl p-6 text-center flex flex-col items-center gap-4 mt-12 shadow-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-1">Brak połączenia z siecią</h3>
                    <p className="text-xs text-zinc-400">Nie udało się pobrać aktualnej pogody. Sprawdź połączenie z internetem.</p>
                  </div>
                  <button
                    onClick={() => refreshAll()}
                    className="px-5 py-2.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 active:scale-95 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <RefreshCw size={14} />
                    <span>Spróbuj ponownie</span>
                  </button>
                </div>
              ) : (
                <WeatherSkeleton />
              )
            ) : (
              <div
                key={activeCity.id}
                className={
                  slideDirection === 'right'
                    ? 'animate-slide-from-right flex flex-col gap-3.5'
                    : slideDirection === 'left'
                    ? 'animate-slide-from-left flex flex-col gap-3.5'
                    : 'flex flex-col gap-3.5'
                }
              >
                <HeroSection
                  city={displayCity}
                  hourlyData={activeWeather.hourly}
                  dailyData={activeWeather.daily}
                  currentIdx={currentIdx}
                  dailyIdx={dailyIdx}
                  lastUpdated={activeWeather.meta?.fetchedAt}
                  onRefresh={() => refreshAll()}
                  isRefreshing={weatherLoading}
                  airQuality={activeWeather.airQuality}
                />

                <HourlyForecast
                  hourlyData={activeWeather.hourly}
                  currentIdx={currentIdx}
                />

                <DailyForecast
                  dailyData={activeWeather.daily}
                  hourlyData={activeWeather.hourly}
                  currentIdx={currentIdx}
                  dailyStartIdx={dailyIdx}
                />

                <DetailsGrid
                  hourlyData={activeWeather.hourly}
                  dailyData={activeWeather.daily}
                  currentIdx={currentIdx}
                  dailyIdx={dailyIdx}
                  airQuality={activeWeather.airQuality}
                />

                {/* Cache info */}
                {activeWeather.meta?.isFallback && (
                  <div className="text-center text-[10px] text-zinc-500 py-1 font-medium tracking-wider uppercase">
                    Dane z pamięci podręcznej (offline)
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Minimalist Bottom Toolbar: Empty Left | Centered CityDots with Variant B Scrubber | Right List Button */}
        <BottomToolbar
          cities={cities}
          weatherMap={weatherMap}
          cityCount={cities.length}
          activeCityIndex={activeCityIndex}
          onSelectCity={handleSelectCity}
          onOpenCities={() => setCitiesSheetOpen(true)}
        />

        {/* Fluid Cities Bottom Sheet with integrated search and settings button */}
        <CitiesSheet
          isOpen={citiesSheetOpen}
          onClose={() => setCitiesSheetOpen(false)}
          cities={cities}
          weatherMap={weatherMap}
          activeCityIndex={activeCityIndex}
          onSelectCity={handleSelectCity}
          onDeleteCity={handleDeleteCity}
          onAddCity={handleAddCity}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onRetryGps={() => {
            retryGps();
            showToast('Odświeżam pozycję GPS...', 'info');
          }}
          showToast={showToast}
        />

        {/* PWA Update Banner with automatic detection */}
        <UpdatePrompt />

        {/* Dedicated Settings Modal */}
        <SettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          onRefreshAll={() => {
            refreshAll();
            showToast('Aktualizuję dane pogodowe...', 'info');
          }}
          onRetryGps={() => {
            retryGps();
            showToast('Wyszukuję pozycję GPS...', 'info');
          }}
          weatherLoading={weatherLoading}
          citiesCount={cities.length}
          onClearCache={() => refreshAll()}
          showToast={showToast}
        />
      </div>
    </div>
  );
}
