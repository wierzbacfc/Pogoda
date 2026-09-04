'use client';

import React, { useState, useEffect, useRef } from 'react';
import { City, HourlyData, DailyData, AirQualityData } from '@/lib/types';
import { formatTemp, getWeatherStoryline, getWindDirectionDetails, getAqiStatus } from '@/lib/utils';
import { getWeatherInfo } from '@/lib/weather-codes';
import { WeatherIcon } from '@/components/ui/WeatherIcon';
import { MapPin, Navigation2, Navigation, ArrowUp, ArrowDown, Wind, Sparkles, RefreshCw, Activity, ChevronDown, X } from 'lucide-react';

interface HeroSectionProps {
  city: City;
  hourlyData: HourlyData;
  dailyData: DailyData;
  currentIdx: number;
  dailyIdx: number;
  lastUpdated?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  airQuality?: AirQualityData;
}

export function HeroSection({
  city,
  hourlyData,
  dailyData,
  currentIdx,
  dailyIdx,
  lastUpdated,
  onRefresh,
  isRefreshing,
  airQuality,
}: HeroSectionProps) {
  const [expandedCard, setExpandedCard] = useState<'wind' | 'aqi' | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll speech bubble into view
  useEffect(() => {
    if (expandedCard) {
      const timer = setTimeout(() => {
        if (!bubbleRef.current) return;
        const rect = bubbleRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const bottomNavOffset = 95;
        const visibleBottom = viewportHeight - bottomNavOffset;

        if (rect.bottom > visibleBottom) {
          const delta = rect.bottom - visibleBottom + 20;
          window.scrollBy({ top: delta, behavior: 'smooth' });
        }
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [expandedCard]);
  const currentTemp = hourlyData.temperature_2m[currentIdx] || 0;
  const feelsLike = hourlyData.apparent_temperature[currentIdx] || 0;
  const weatherCode = hourlyData.weathercode[currentIdx] || 0;
  const isDay = hourlyData.is_day[currentIdx] === 1;
  const weatherInfo = getWeatherInfo(weatherCode, isDay);

  const minTemp = dailyData.temperature_2m_min[dailyIdx] || 0;
  const maxTemp = dailyData.temperature_2m_max[dailyIdx] || 0;

  const storyline = getWeatherStoryline(hourlyData, currentIdx);
  const LocationIcon = city.isGps ? Navigation2 : MapPin;

  // Deduplicate subtitle if identical to city name
  const displaySubtitle = (() => {
    if (!city.subtitle) return city.isGps ? 'Bieżąca lokalizacja' : '';
    if (city.subtitle.trim().toLowerCase() === city.name.trim().toLowerCase()) {
      return city.isGps ? (city.admin1 ? `${city.admin1}, PL` : 'Bieżąca lokalizacja') : (city.admin1 || '');
    }
    return city.subtitle;
  })();

  // Dynamic aura styling based on current weather code
  const storylineAura = (() => {
    if (weatherCode === 0 || weatherCode === 1) {
      return 'bg-amber-500/10 border-amber-400/20 text-amber-200/90 [&>svg]:text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.1)]';
    }
    if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) {
      return 'bg-cyan-500/10 border-cyan-400/20 text-cyan-200/90 [&>svg]:text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.1)]';
    }
    if (weatherCode >= 95) {
      return 'bg-purple-500/10 border-purple-400/20 text-purple-200/90 [&>svg]:text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.15)]';
    }
    if ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86)) {
      return 'bg-sky-400/10 border-sky-300/20 text-sky-200/90 [&>svg]:text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.1)]';
    }
    return 'bg-blue-500/10 border-blue-400/15 text-blue-200/90 [&>svg]:text-blue-400';
  })();

// Wind metrics & 12h forecast
  const windSpeed = hourlyData.windspeed_10m[currentIdx] || 0;
  const windDir = hourlyData.winddirection_10m[currentIdx] || 0;
  const windGusts = Math.round(hourlyData.windgusts_10m?.[currentIdx] || windSpeed * 1.35);
  const windDirDetails = getWindDirectionDetails(windDir);

  // 12-hour Wind and Gusts forecast
  const next12Wind = (() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const idx = currentIdx + i;
      const speed = Math.round(hourlyData.windspeed_10m[idx] || 0);
      const gusts = Math.round(hourlyData.windgusts_10m?.[idx] || speed * 1.3);
      let hourLabel = `+${i}`;
      if (i === 0) {
        hourLabel = 'Ter';
      } else if (hourlyData.time?.[idx]) {
        const raw = hourlyData.time[idx];
        hourLabel = raw.length >= 13 ? raw.slice(11, 13) : `+${i}`;
      }
      return { speed, gusts, hour: hourLabel };
    });
  })();

  const max12hGust = Math.max(...next12Wind.map(w => w.gusts));
  const windTrend = next12Wind[11].speed > windSpeed + 3
    ? { label: '↗ Wzrost siły', color: 'text-amber-400' }
    : next12Wind[11].speed < windSpeed - 3
    ? { label: '↘ Słabnący', color: 'text-emerald-400' }
    : { label: '→ Stabilny', color: 'text-cyan-400' };

  // Outdoor activity & wind chill comfort advice
  const windAdvice = (() => {
    if (windGusts >= 50) {
      return {
        title: 'Bardzo porywisty i silny wiatr',
        badge: 'Ostrzeżenie',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
        desc: 'Silne podmuchy mogą utrudniać marsz i łamać gałęzie. Niezalecana jazda na rowerze ani aktywności na otwartej przestrzeni.',
      };
    }
    if (windGusts >= 30 || windSpeed >= 20) {
      return {
        title: 'Odczuwalny wyraźny opór wiatru',
        badge: 'Umiarkowane',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
        desc: 'Wiatr zauważalnie obniża temperaturę odczuwalną. Utrudniona jazda pod wiatr na rowerze. Zabezpiecz luźne przedmioty na zewnątrz.',
      };
    }
    if (windSpeed >= 12) {
      return {
        title: 'Umiarkowany, rześki wiatr',
        badge: 'Dobre warunki',
        badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-400/30',
        desc: 'Przyjemny powiew sprzyjający wietrzeniu mieszkań. Dobre warunki do biegania i spacerów, lekki opór podczas jazdy na rowerze.',
      };
    }
    return {
      title: 'Spokojna, łagodna aura',
      badge: 'Idealne warunki',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      desc: 'Wiatr niemal niewyczuwalny. Doskonałe warunki do wszelkich aktywności na świeżym powietrzu, spacerów i treningów.',
    };
  })();

  // Air Quality metrics & 12h forecast
  const aqiValue = airQuality?.european_aqi ?? 34;
  const aqiStatus = getAqiStatus(aqiValue);
  const pm10 = airQuality?.pm10 ? `${Math.round(airQuality.pm10)}` : '18';
  const pm25 = airQuality?.pm2_5 ? `${Math.round(airQuality.pm2_5)}` : '8';

  // 12-hour AQI trend micro-bars
  const next12Aqi = (() => {
    if (airQuality?.hourly?.european_aqi && airQuality.hourly.european_aqi.length > 0) {
      return airQuality.hourly.european_aqi.slice(0, 12).map((val, i) => {
        let hourLabel = `+${i}`;
        if (i === 0) {
          hourLabel = 'Ter';
        } else if (airQuality.hourly?.time?.[i]) {
          const raw = airQuality.hourly.time[i];
          hourLabel = raw.length >= 13 ? raw.slice(11, 13) : `+${i}`;
        }
        return {
          val: Math.round(val),
          hour: hourLabel,
        };
      });
    }
    const base = aqiValue || 34;
    return Array.from({ length: 12 }).map((_, i) => ({
      val: Math.round(Math.max(10, base + Math.sin(i * 0.5) * 6)),
      hour: i === 0 ? 'Ter' : `+${i}`,
    }));
  })();

  const firstAqi = next12Aqi[0]?.val ?? aqiValue;
  const lastAqi = next12Aqi[next12Aqi.length - 1]?.val ?? aqiValue;
  const aqiTrend = lastAqi <= firstAqi - 3
    ? { label: '↘ Poprawa', color: 'text-emerald-400' }
    : lastAqi >= firstAqi + 3
    ? { label: '↗ Pogorszenie', color: 'text-amber-400' }
    : { label: '→ Stabilna', color: 'text-cyan-400' };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900/80 via-zinc-900/60 to-zinc-950/80 backdrop-blur-2xl border border-white/15 p-4 sm:p-5 shadow-[0_16px_48px_rgba(0,0,0,0.6)] flex flex-col gap-3 transition-all">
      {/* Specular top light rim */}
      <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* 1. Header: City info & Refresh Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
            <LocationIcon className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white tracking-tight truncate leading-tight">
              {city.name}
            </h1>
            {displaySubtitle && (
              <p className="text-[11px] text-zinc-400 truncate leading-none mt-0.5">
                {displaySubtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {city.isGps && (
            <span className="text-[9px] uppercase font-extrabold tracking-widest px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-400 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.2)]">
              GPS
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
              title="Dotknij, aby odświeżyć dane"
            >
              <RefreshCw size={10} className={isRefreshing ? 'animate-spin text-blue-400' : 'text-zinc-500 hover:text-blue-400'} />
              <span className="tabular-nums font-mono">
                {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : 'Teraz'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Central Core: Grand Temperature & Weather Visual */}
      <div className="flex items-center justify-between my-0.5 px-0.5">
        {/* Left: Huge Temp & Metrics */}
        <div className="flex flex-col">
          <div className="flex items-baseline">
            <span className="text-7xl font-extralight text-white tabular-nums tracking-tighter leading-none drop-shadow-md">
              {Math.round(currentTemp)}
            </span>
            <span className="text-4xl font-light text-blue-400 ml-1">°</span>
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-sm font-bold text-zinc-100 capitalize tracking-tight drop-shadow-sm">
              {weatherInfo.label}
            </span>
            <span className="text-zinc-600 font-bold">•</span>
            <span className="text-xs text-zinc-300 font-medium">
              Odcz. <strong className="text-white font-bold">{formatTemp(feelsLike)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mt-1">
            <span className="text-orange-400 flex items-center font-bold">
              <ArrowUp size={11} className="mr-0.5" />{Math.round(maxTemp)}°
            </span>
            <span className="text-zinc-600 font-bold">/</span>
            <span className="text-blue-400 flex items-center font-bold">
              <ArrowDown size={11} className="mr-0.5" />{Math.round(minTemp)}°
            </span>
          </div>
        </div>

        {/* Right: Weather Icon floating naturally in background (large 120px 3D Fluent Volumetric) */}
        <div className="flex-1 flex items-center justify-end pr-1 select-none">
          <div className="relative flex items-center justify-center">
            {/* Atmospheric ambient glow blooming directly behind 3D icon */}
            <div className={`absolute inset-0 rounded-full blur-3xl -z-10 scale-125 pointer-events-none ${
              isDay ? 'bg-amber-400/15' : 'bg-indigo-400/15'
            }`} />
            <WeatherIcon
              code={weatherCode}
              isDay={isDay}
              size={120}
              className="drop-shadow-[0_16px_32px_rgba(0,0,0,0.55)] transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>
      </div>

      {/* 3. Symmetrical Modules: Wind & Air Quality (Option A - Compact, Large Compass, Clean) */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        {/* Module 1: Wiatr z dużym kompasem */}
        <div
          onClick={() => setExpandedCard(prev => prev === 'wind' ? null : 'wind')}
          className={`bg-white/[0.04] border rounded-2xl p-2.5 flex items-center gap-2.5 shadow-sm transition-all cursor-pointer active:scale-[0.98] ${
            expandedCard === 'wind'
              ? 'border-blue-400/60 ring-1 ring-blue-400/40 bg-white/[0.08]'
              : 'border-white/10 hover:border-blue-400/30'
          }`}
        >
          {/* Duży wskaźnik kompasu */}
          <div className="w-12 h-12 rounded-full bg-blue-500/15 border border-blue-400/30 flex flex-col items-center justify-center shrink-0 relative shadow-[0_0_10px_rgba(59,130,246,0.25)]">
            <Navigation
              size={17}
              style={{ transform: `rotate(${windDir}deg)` }}
              className="fill-current text-blue-400 transition-transform duration-500"
            />
            <span className="text-[9px] font-extrabold text-white tracking-wider mt-0.5">
              {windDirDetails.short}
            </span>
          </div>

          {/* Dane wiatru */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Wiatr</span>
              <ChevronDown
                size={12}
                className={`text-zinc-500 transition-transform duration-200 ${expandedCard === 'wind' ? 'rotate-180 text-blue-400' : ''}`}
              />
            </div>
            <div className="text-lg font-extrabold text-white leading-tight mt-0.5">
              {Math.round(windSpeed)} <span className="text-[10px] font-normal text-zinc-400">km/h</span>
            </div>
            <div className="text-[9px] font-bold text-cyan-300 truncate mt-0.5">
              {windGusts > windSpeed ? `Porywy: ${windGusts} km/h` : 'Wiatr stabilny'}
            </div>
          </div>
        </div>

        {/* Module 2: Jakość Powietrza z okrągłym ringiem AQI */}
        <div
          onClick={() => setExpandedCard(prev => prev === 'aqi' ? null : 'aqi')}
          className={`bg-white/[0.04] border rounded-2xl p-2.5 flex items-center gap-2.5 shadow-sm transition-all cursor-pointer active:scale-[0.98] ${
            expandedCard === 'aqi'
              ? 'border-emerald-400/60 ring-1 ring-emerald-400/40 bg-white/[0.08]'
              : 'border-white/10 hover:border-emerald-400/30'
          }`}
        >
          {/* Pierścień AQI */}
          <div
            className="w-12 h-12 rounded-full bg-emerald-500/15 border-2 flex flex-col items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
            style={{ borderColor: aqiStatus.color }}
          >
            <span className="text-sm font-black text-white leading-none">
              {Math.round(aqiValue)}
            </span>
            <span
              className="text-[8px] font-bold leading-none mt-0.5"
              style={{ color: aqiStatus.color }}
            >
              {aqiStatus.label}
            </span>
          </div>

          {/* Dane pyłów i trendu */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Powietrze</span>
              <ChevronDown
                size={12}
                className={`text-zinc-500 transition-transform duration-200 ${expandedCard === 'aqi' ? 'rotate-180 text-emerald-400' : ''}`}
              />
            </div>
            <div className="text-[10px] text-zinc-300 font-medium whitespace-nowrap mt-0.5">
              PM2.5: <strong className="text-white">{pm25}</strong> &bull; PM10: <strong className="text-white">{pm10}</strong>
            </div>
            <div className={`text-[9px] font-bold truncate mt-0.5 ${aqiTrend.color}`}>
              {aqiTrend.label} (12h)
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Speech Bubble with detailed charts & metrics */}
      {expandedCard && (
        <div
          ref={bubbleRef}
          className="relative mt-1 animate-in fade-in zoom-in-95 slide-in-from-top-2 transition-all duration-200"
        >
          {/* Pointer triangle */}
          <div
            className="absolute -top-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white/25 z-20"
            style={{ left: expandedCard === 'wind' ? '25%' : '75%', transform: 'translateX(-50%)' }}
          />
          <div
            className="absolute -top-[6.5px] w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[7px] border-b-zinc-900/95 z-20"
            style={{ left: expandedCard === 'wind' ? '25%' : '75%', transform: 'translateX(-50%)' }}
          />

          <div className="rounded-2xl bg-zinc-950/90 backdrop-blur-2xl border border-white/20 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.7)] flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {expandedCard === 'wind' ? (
                  <Wind size={15} className="text-blue-400" />
                ) : (
                  <Activity size={15} className="text-emerald-400" />
                )}
                <h4 className="text-xs font-bold text-white tracking-tight truncate">
                  {expandedCard === 'wind' ? 'Wiatr i porywy' : 'Jakość powietrza'}
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10 shrink-0">
                  {expandedCard === 'wind' ? `${Math.round(windSpeed)} km/h` : `AQI ${Math.round(aqiValue)} • ${aqiStatus.label}`}
                </span>
              </div>
              <button
                onClick={() => setExpandedCard(null)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
                aria-label="Zamknij"
              >
                <X size={13} />
              </button>
            </div>

            {expandedCard === 'wind' ? (
              <div className="flex flex-col gap-3">
                {/* 3 Stats Grid */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Prędkość</span>
                    <span className="text-sm font-bold text-white mt-0.5">{Math.round(windSpeed)} km/h</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Maks. porywy</span>
                    <span className="text-sm font-bold text-cyan-300 mt-0.5">{windGusts} km/h</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Kierunek</span>
                    <span className="text-sm font-bold text-blue-300 mt-0.5">{windDirDetails.short} ({windDir}°)</span>
                  </div>
                </div>

                {/* 12-hour Wind & Gusts Forecast Chart */}
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">Prognoza wiatru i porywów na 12h</span>
                    <span className={`font-bold text-xs ${windTrend.color}`}>{windTrend.label}</span>
                  </div>

                  {/* 12-column chart with speed bars and gust indicators */}
                  <div className="grid grid-cols-12 gap-1 items-end h-16 w-full pt-4 pb-1">
                    {next12Wind.map((item, idx) => {
                      const maxChartVal = Math.max(35, max12hGust);
                      const barH = Math.max(16, Math.min(90, (item.speed / maxChartVal) * 100));

                      return (
                        <div key={idx} className="flex flex-col items-center h-full justify-end relative group">
                          {/* Gust peak value */}
                          <span className="text-[8px] text-cyan-300 font-mono font-semibold mb-0.5 leading-none">
                            {item.gusts}
                          </span>
                          {/* Gust marker line */}
                          <div
                            className="w-full h-0.5 bg-cyan-300 rounded-full mb-0.5 shadow-[0_0_4px_rgba(34,211,238,0.8)]"
                          />
                          {/* Wind speed bar */}
                          <div
                            className="w-full rounded-t-sm bg-gradient-to-t from-blue-600 to-blue-400 transition-all shadow-sm"
                            style={{ height: `${barH}%`, opacity: idx === 0 ? 1 : 0.85 }}
                            title={`${item.hour}: Wiatr ${item.speed} km/h, porywy ${item.gusts} km/h`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Hours row */}
                  <div className="grid grid-cols-12 gap-1 text-[8px] text-zinc-500 font-mono text-center border-t border-white/5 pt-1">
                    {next12Wind.map((item, idx) => (
                      <span key={idx} className="leading-none">
                        {item.hour}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-zinc-400 pt-0.5">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-xs bg-blue-500 inline-block" /> Wiatr [km/h]
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-0.5 bg-cyan-300 inline-block" /> Porywy
                    </span>
                  </div>
                </div>

                {/* Practical Outdoor / Wind Chill advice */}
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-400/20 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-200">{windAdvice.title}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${windAdvice.badgeColor}`}>
                      {windAdvice.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {windAdvice.desc}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* 12h Detailed Micro-bars Chart */}
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">Prognoza indeksu AQI na 12 godzin</span>
                    <span className={`font-bold text-xs ${aqiTrend.color}`}>{aqiTrend.label}</span>
                  </div>

                  {/* 12-bar chart with values and hours */}
                  <div className="grid grid-cols-12 gap-1 items-end h-16 w-full pt-4 pb-1">
                    {next12Aqi.map((item, idx) => {
                      const barH = Math.max(25, Math.min(100, (item.val / 80) * 100));
                      const barColor = item.val <= 20
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                        : item.val <= 40
                        ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.4)]'
                        : item.val <= 60
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                        : 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]';

                      return (
                        <div key={idx} className="flex flex-col items-center h-full justify-end group">
                          <span className="text-[9px] text-zinc-400 font-mono mb-1 leading-none">{item.val}</span>
                          <div
                            className={`w-full rounded-t-sm transition-all ${barColor}`}
                            style={{ height: `${barH}%`, opacity: idx === 0 ? 1 : 0.85 }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Hours row */}
                  <div className="grid grid-cols-12 gap-1 text-[8px] text-zinc-500 font-mono text-center border-t border-white/5 pt-1">
                    {next12Aqi.map((item, idx) => (
                      <span key={idx} className="leading-none">
                        {item.hour}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pollutants + Health Advice */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Pył PM2.5</span>
                    <span className="text-sm font-bold text-white mt-0.5">{pm25} µg/m³</span>
                    <span className="text-[9px] text-zinc-500 mt-0.5">Norma WHO: 15 µg/m³</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Pył PM10</span>
                    <span className="text-sm font-bold text-white mt-0.5">{pm10} µg/m³</span>
                    <span className="text-[9px] text-zinc-500 mt-0.5">Norma WHO: 45 µg/m³</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 bg-emerald-500/10 border border-emerald-400/20 rounded-xl p-2.5 leading-relaxed">
                  {aqiStatus.advice}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
