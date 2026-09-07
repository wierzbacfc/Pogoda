'use client';

import React from 'react';
import { City, WeatherResult } from '@/lib/types';
import { getCurrentHourIndex } from '@/lib/utils';
import { getWeatherInfo } from '@/lib/weather-codes';
import { Navigation2, MapPin, Trash2 } from 'lucide-react';
import { WeatherIcon } from '@/components/ui/WeatherIcon';

interface CityCardProps {
  city: City;
  weather: WeatherResult | undefined;
  isActive: boolean;
  index: number;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onRetryGps?: () => void;
}

function CityCardComponent({
  city,
  weather,
  isActive,
  index,
  onSelect,
  onDelete,
  onRetryGps,
}: CityCardProps) {
  const currentIdx = weather ? getCurrentHourIndex(weather.hourly.time, weather.timezone) : 0;
  const isDay = weather ? weather.hourly.is_day[currentIdx] === 1 : true;
  const weatherCode = weather ? weather.hourly.weathercode[currentIdx] : 0;
  const weatherInfo = weather ? getWeatherInfo(weatherCode, isDay) : null;
  const temp = weather ? weather.hourly.temperature_2m[currentIdx] : null;
  const maxTemp = weather?.daily?.temperature_2m_max?.[0] !== undefined ? Math.round(weather.daily.temperature_2m_max[0]) : null;
  const minTemp = weather?.daily?.temperature_2m_min?.[0] !== undefined ? Math.round(weather.daily.temperature_2m_min[0]) : null;

  const subtitle = city.isGps
    ? (city.subtitle || 'Bieżąca lokalizacja')
    : [city.admin1, city.country_code].filter(Boolean).join(', ');

  return (
    <div
      onClick={() => onSelect(index)}
      className={`group relative overflow-hidden rounded-3xl p-4 sm:p-5 transition-all duration-300 active:scale-[0.98] cursor-pointer shadow-xl backdrop-blur-2xl border shrink-0 ${
        isActive
          ? 'bg-gradient-to-br from-blue-950/40 via-zinc-900/80 to-zinc-900/90 border-blue-400/50 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_24px_rgba(59,130,246,0.18)] ring-1 ring-blue-400/30'
          : 'bg-zinc-900/55 border-white/10 hover:border-white/20 hover:bg-zinc-900/75'
      }`}
    >
      {/* Active accent vertical bar */}
      {isActive && (
        <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-gradient-to-b from-blue-400 to-sky-500 rounded-r-full shadow-[0_0_12px_rgba(56,189,248,0.9)]" />
      )}

      {/* Main Top Content: City Info on Left, Weather Icon + Temp on Right */}
      <div className="flex items-center justify-between gap-3">
        {/* Left Column: Icon + City Name + Subtitle */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            {city.isGps ? (
              <span className="w-6 h-6 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                <Navigation2 className="w-3.5 h-3.5 text-blue-400 fill-blue-400/30" />
              </span>
            ) : (
              <span className="w-6 h-6 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              </span>
            )}
            <h3 className="text-lg font-bold text-white tracking-tight truncate leading-tight">
              {city.name}
            </h3>
          </div>

          <p className="text-xs text-zinc-400 truncate pl-8 font-medium">
            {subtitle}
          </p>
        </div>

        {/* Right Column: 3D Weather Icon + Large Temperature */}
        <div className="flex items-center gap-2.5 shrink-0">
          {weather ? (
            <WeatherIcon
              code={weatherCode}
              isDay={isDay}
              size={50}
              className="drop-shadow-lg transform transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white/5 animate-pulse" />
          )}

          {temp !== null ? (
            <div className="flex items-baseline pl-1">
              <span className="text-4xl font-extralight text-white tabular-nums tracking-tighter drop-shadow-sm">
                {Math.round(temp)}
              </span>
              <span className="text-2xl font-light text-blue-400 ml-0.5">°</span>
            </div>
          ) : (
            <div className="w-12 h-8 rounded-xl bg-white/10 animate-pulse" />
          )}
        </div>
      </div>

      {/* Bottom Row: Condition + Min/Max Temperatures + Card Action */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5 pl-8">
        <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium tracking-tight truncate">
          <span className="capitalize text-zinc-200 font-medium">
            {weatherInfo?.label || 'Ładowanie...'}
          </span>
          {maxTemp !== null && minTemp !== null && (
            <>
              <span className="text-zinc-600 font-bold">•</span>
              <span className="tabular-nums text-zinc-400 flex items-center gap-1.5 font-normal">
                <span className="text-amber-400/90 font-medium">↑ {maxTemp}°</span>
                <span className="text-sky-400/90 font-medium">↓ {minTemp}°</span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {city.isGps && onRetryGps && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetryGps();
              }}
              className="flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 font-semibold px-2.5 py-1 rounded-xl bg-blue-500/15 border border-blue-400/30 hover:bg-blue-500/25 active:scale-95 transition-all shadow-[0_0_8px_rgba(59,130,246,0.2)]"
              title="Odśwież lokalizację GPS"
            >
              <Navigation2 className="w-3 h-3 rotate-45" />
              <span>Odśwież GPS</span>
            </button>
          )}

          {!city.isGps && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(index);
              }}
              className="p-1.5 -mr-1 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/15 active:scale-90 transition-all border border-transparent hover:border-red-500/20"
              title="Usuń miasto z listy"
              aria-label="Usuń miasto"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(CityCardComponent);

