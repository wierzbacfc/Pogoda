'use client';

import React from 'react';
import { City, WeatherResult } from '@/lib/types';
import { getCurrentHourIndex, getDateKeyFromHour, getDailyIndexForDate } from '@/lib/utils';
import { HeroSection } from './HeroSection';
import { HourlyForecast } from './HourlyForecast';
import { DailyForecast } from './DailyForecast';
import { DetailsGrid } from './DetailsGrid';
import { WeatherSkeleton } from '@/components/ui/Skeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';

function getDisplayName(city: City): string {
  if (city.isGps && city.subtitle) {
    if (city.subtitle === 'Brak uprawnień GPS') return 'Poznań (GPS niedostępny)';
    return city.subtitle.includes(',') ? city.subtitle.split(',')[0].trim() : city.subtitle;
  }
  return city.name;
}

export interface CitySlideProps {
  city: City;
  weather?: WeatherResult;
  weatherLoading: boolean;
  weatherError: string | null;
  onRefresh: () => void;
}

export const CitySlide = React.memo(function CitySlide({
  city,
  weather,
  weatherLoading,
  weatherError,
  onRefresh,
}: CitySlideProps) {
  const displayCity: City = {
    ...city,
    name: getDisplayName(city),
  };

  let currentIdx = -1;
  let dailyIdx = 0;

  if (weather && weather.hourly) {
    currentIdx = getCurrentHourIndex(weather.hourly.time, weather.timezone);
    if (currentIdx >= 0) {
      const dateKey = getDateKeyFromHour(weather.hourly.time[currentIdx]);
      dailyIdx = getDailyIndexForDate(weather.daily, dateKey);
    }
  }

  const hasWeather = !!(weather && weather.hourly && currentIdx >= 0);

  return (
    <div className="w-full min-w-full flex-shrink-0 px-3.5 pt-7 pb-4 flex flex-col gap-3.5 select-none">
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
              onClick={onRefresh}
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
        <>
          <HeroSection
            city={displayCity}
            hourlyData={weather.hourly}
            dailyData={weather.daily}
            currentIdx={currentIdx}
            dailyIdx={dailyIdx}
            lastUpdated={weather.meta?.fetchedAt}
            onRefresh={onRefresh}
            isRefreshing={weatherLoading}
            airQuality={weather.airQuality}
          />

          <HourlyForecast
            hourlyData={weather.hourly}
            currentIdx={currentIdx}
          />

          <DailyForecast
            dailyData={weather.daily}
            hourlyData={weather.hourly}
            currentIdx={currentIdx}
            dailyStartIdx={dailyIdx}
          />

          <DetailsGrid
            hourlyData={weather.hourly}
            dailyData={weather.daily}
            currentIdx={currentIdx}
            dailyIdx={dailyIdx}
            airQuality={weather.airQuality}
          />

          {/* Cache info */}
          {weather.meta?.isFallback && (
            <div className="text-center text-[10px] text-zinc-500 py-1 font-medium tracking-wider uppercase">
              Dane z pamięci podręcznej (offline)
            </div>
          )}
        </>
      )}
    </div>
  );
});
