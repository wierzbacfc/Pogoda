'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { City } from '@/lib/types';
import { getCurrentHourIndex, gpsDistance } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useToast } from '@/hooks/useToast';

import DynamicBackground from '@/components/DynamicBackground';
import { BottomToolbar } from '@/components/BottomToolbar';
import { Toast } from '@/components/ui/Toast';
import { UpdatePrompt } from '@/components/ui/UpdatePrompt';
import { CitySlide } from '@/components/dashboard/CitySlide';

import CitiesSheet from '@/components/cities/CitiesSheet';
import SettingsModal from '@/components/settings/SettingsModal';
import { RefreshCw } from 'lucide-react';

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
  const { toasts, showToast, dismissToast } = useToast();

  const mainRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Interactive horizontal city swipe refs (Direct DOM manipulation - zero React re-renders)
  const swipeOffsetRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);
  const isHorizontalGestureRef = useRef<boolean | null>(null);
  const swipeStartPosRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const dragStartRef = useRef<{ x: number; y: number; time: number; target: EventTarget | null }>({ x: 0, y: 0, time: 0, target: null });

  // Synchronize track position when activeCityIndex changes
  useEffect(() => {
    if (trackRef.current && !isSwipingRef.current) {
      trackRef.current.style.transform = `translate3d(${-activeCityIndex * 100}%, 0, 0)`;
    }
  }, [activeCityIndex]);

  // Native non-passive touch listener to prevent vertical scroll jitter during horizontal swipe
  useEffect(() => {
    const mainEl = mainRef.current;
    if (!mainEl) return;

    const onNativeTouchMove = (e: TouchEvent) => {
      if (isHorizontalGestureRef.current === true) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    mainEl.addEventListener('touchmove', onNativeTouchMove, { passive: false });
    return () => {
      mainEl.removeEventListener('touchmove', onNativeTouchMove);
    };
  }, []);

  // Pull to refresh states
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
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

  if (activeWeather && activeWeather.hourly) {
    const curIdx = getCurrentHourIndex(activeWeather.hourly.time, activeWeather.timezone);
    if (curIdx >= 0) {
      currentWeatherCode = activeWeather.hourly.weathercode[curIdx];
      currentIsDay = activeWeather.hourly.is_day[curIdx] === 1;
    }
  }

  // Stable onRefresh callback for CitySlide memoization
  const handleRefreshAll = useCallback(() => {
    refreshAll();
  }, [refreshAll]);

  // Swipe & Touch Gesture Engine with interactive horizontal tracking (Direct DOM)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    swipeStartPosRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    dragStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now(), target: e.target };
    isHorizontalGestureRef.current = null;
    swipeOffsetRef.current = 0;
    isSwipingRef.current = false;

    if (typeof window !== 'undefined' && window.scrollY <= 2) {
      pullStartRef.current = { y: touch.clientY, active: true };
    } else {
      pullStartRef.current.active = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - swipeStartPosRef.current.x;
    const dy = touch.clientY - swipeStartPosRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const target = dragStartRef.current.target as HTMLElement | null;
    const isNoSwipe = !!(target && target.closest('[data-no-swipe="true"]'));

    // Determine gesture intent once moved past 8px
    if (isHorizontalGestureRef.current === null && (absX > 8 || absY > 8)) {
      if (absX > absY * 1.15 && !isNoSwipe && cities.length > 1) {
        isHorizontalGestureRef.current = true;
        isSwipingRef.current = true;
        pullStartRef.current.active = false;
        if (trackRef.current) {
          trackRef.current.classList.add('pointer-events-none');
        }
      } else {
        isHorizontalGestureRef.current = false;
      }
    }

    // 1. Horizontal City Swipe Mode (Direct DOM manipulation - zero React re-renders)
    if (isHorizontalGestureRef.current === true) {
      if (e.cancelable) {
        try {
          e.preventDefault();
        } catch (_) {}
      }

      // Elastic rubber-band resistance when dragging beyond list boundaries
      let offset = dx;
      if (activeCityIndex === 0 && dx > 0) {
        offset = dx * 0.25;
      } else if (activeCityIndex === cities.length - 1 && dx < 0) {
        offset = dx * 0.25;
      }

      swipeOffsetRef.current = offset;

      // Direct GPU transform update on DOM node
      if (trackRef.current) {
        trackRef.current.style.transition = 'none';
        trackRef.current.style.transform = `translate3d(calc(${-activeCityIndex * 100}% + ${offset}px), 0, 0)`;
      }
      return;
    }

    // 2. Vertical Pull-To-Refresh Mode
    if (pullStartRef.current.active && !isPullRefreshing && isHorizontalGestureRef.current === false) {
      const diffY = touch.clientY - pullStartRef.current.y;
      if (diffY > 0 && typeof window !== 'undefined' && window.scrollY <= 2) {
        const damped = Math.min(85, Math.pow(diffY, 0.82));
        setPullDistance(damped);
      } else {
        setPullDistance(0);
      }
    }
  };

  const handleTouchEnd = async () => {
    const finalOffset = swipeOffsetRef.current;
    const elapsed = Math.max(1, Date.now() - swipeStartPosRef.current.time);
    const velocity = Math.abs(finalOffset) / elapsed;

    if (isSwipingRef.current) {
      isSwipingRef.current = false;
      if (trackRef.current) {
        trackRef.current.classList.remove('pointer-events-none');
      }

      const swipeThreshold = 40;
      const isFlick = velocity > 0.28 && Math.abs(finalOffset) > 20;

      if ((finalOffset < -swipeThreshold || (finalOffset < 0 && isFlick)) && activeCityIndex < cities.length - 1) {
        // Swiped Left -> Advance to next city
        const nextIdx = activeCityIndex + 1;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(12); } catch (_) {}
        }
        if (trackRef.current) {
          trackRef.current.style.transition = 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)';
          trackRef.current.style.transform = `translate3d(${-nextIdx * 100}%, 0, 0)`;
        }
        swipeOffsetRef.current = 0;
        setActiveCityIndex(nextIdx);
        if (typeof window !== 'undefined' && window.scrollY > 40) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      } else if ((finalOffset > swipeThreshold || (finalOffset > 0 && isFlick)) && activeCityIndex > 0) {
        // Swiped Right -> Go to previous city
        const prevIdx = activeCityIndex - 1;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(12); } catch (_) {}
        }
        if (trackRef.current) {
          trackRef.current.style.transition = 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)';
          trackRef.current.style.transform = `translate3d(${-prevIdx * 100}%, 0, 0)`;
        }
        swipeOffsetRef.current = 0;
        setActiveCityIndex(prevIdx);
        if (typeof window !== 'undefined' && window.scrollY > 40) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }

      // Spring back smoothly if threshold wasn't reached or boundary bounce
      if (trackRef.current) {
        trackRef.current.style.transition = 'transform 260ms cubic-bezier(0.25, 1, 0.5, 1)';
        trackRef.current.style.transform = `translate3d(${-activeCityIndex * 100}%, 0, 0)`;
      }
      swipeOffsetRef.current = 0;
      return;
    }

    // Handle pull-to-refresh trigger
    if (pullDistance > 55 && !isPullRefreshing) {
      setIsPullRefreshing(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(20); } catch (_) {}
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

  // Pointer events for desktop testing and mouse drag
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest('[data-no-swipe="true"]')) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startTime = Date.now();
    let isHorizontal: boolean | null = null;
    let swiping = false;

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (isHorizontal === null && (Math.abs(dx) > 7 || Math.abs(dy) > 7)) {
        if (Math.abs(dx) > Math.abs(dy) * 1.15 && cities.length > 1) {
          isHorizontal = true;
          swiping = true;
          isSwipingRef.current = true;
          if (trackRef.current) {
            trackRef.current.classList.add('pointer-events-none');
          }
        } else {
          isHorizontal = false;
        }
      }

      if (isHorizontal) {
        let offset = dx;
        if (activeCityIndex === 0 && dx > 0) offset = dx * 0.28;
        else if (activeCityIndex === cities.length - 1 && dx < 0) offset = dx * 0.28;
        swipeOffsetRef.current = offset;

        if (trackRef.current) {
          trackRef.current.style.transition = 'none';
          trackRef.current.style.transform = `translate3d(calc(${-activeCityIndex * 100}% + ${offset}px), 0, 0)`;
        }
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      if (swiping) {
        isSwipingRef.current = false;
        if (trackRef.current) {
          trackRef.current.classList.remove('pointer-events-none');
        }
        const finalOffset = swipeOffsetRef.current;
        const elapsed = Math.max(1, Date.now() - startTime);
        const velocity = Math.abs(finalOffset) / elapsed;
        const isFlick = velocity > 0.28 && Math.abs(finalOffset) > 20;

        if ((finalOffset < -40 || (finalOffset < 0 && isFlick)) && activeCityIndex < cities.length - 1) {
          const nextIdx = activeCityIndex + 1;
          if (trackRef.current) {
            trackRef.current.style.transition = 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)';
            trackRef.current.style.transform = `translate3d(${-nextIdx * 100}%, 0, 0)`;
          }
          swipeOffsetRef.current = 0;
          setActiveCityIndex(nextIdx);
          if (typeof window !== 'undefined' && window.scrollY > 40) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else if ((finalOffset > 40 || (finalOffset > 0 && isFlick)) && activeCityIndex > 0) {
          const prevIdx = activeCityIndex - 1;
          if (trackRef.current) {
            trackRef.current.style.transition = 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)';
            trackRef.current.style.transform = `translate3d(${-prevIdx * 100}%, 0, 0)`;
          }
          swipeOffsetRef.current = 0;
          setActiveCityIndex(prevIdx);
          if (typeof window !== 'undefined' && window.scrollY > 40) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else {
          if (trackRef.current) {
            trackRef.current.style.transition = 'transform 260ms cubic-bezier(0.25, 1, 0.5, 1)';
            trackRef.current.style.transform = `translate3d(${-activeCityIndex * 100}%, 0, 0)`;
          }
          swipeOffsetRef.current = 0;
        }
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // City selection & management
  const handleSelectCity = useCallback((index: number) => {
    if (index !== activeCityIndex) {
      if (trackRef.current) {
        trackRef.current.style.transition = 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)';
        trackRef.current.style.transform = `translate3d(${-index * 100}%, 0, 0)`;
      }
      swipeOffsetRef.current = 0;
      setActiveCityIndex(index);
      if (typeof window !== 'undefined' && window.scrollY > 40) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
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
    fetchForCity(newCity);
    showToast(`Dodano ${newCity.name}`, 'success');
  }, [cities, setSavedCities, fetchForCity, showToast]);

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

        {/* Main Weather Screen Track (Horizontal City Pager) */}
        <main
          ref={mainRef}
          className="relative z-10 pb-28 flex-1 overflow-x-hidden select-none touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
        >
          <div
            ref={trackRef}
            className="flex w-full flex-nowrap items-start will-change-transform"
            style={{
              transform: `translate3d(${-activeCityIndex * 100}%, 0, 0)`,
              transition: 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)',
            }}
          >
            {cities.map((city) => (
              <CitySlide
                key={city.id}
                city={city}
                weather={weatherMap.get(city.id)}
                weatherLoading={weatherLoading}
                weatherError={weatherError}
                onRefresh={handleRefreshAll}
              />
            ))}
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
