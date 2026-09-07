'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { WeatherResult, City } from '@/lib/types';
import { getCurrentHourIndex, degreesToCardinal, getCloudCoverInfo, formatTime } from '@/lib/utils';
import { getWeatherInfo } from '@/lib/weather-codes';
import { WeatherIcon } from '@/components/ui/WeatherIcon';
import {
  Thermometer,
  Droplets,
  Wind,
  Cloud,
  Gauge,
  Navigation,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from 'lucide-react';

interface LandscapeChartProps {
  city: City;
  weather?: WeatherResult;
  onClose: () => void;
}

// Bezier Spline generator for smooth SVG curves
function getSvgSpline(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

interface ColorStop {
  value: number;
  rgb: [number, number, number];
}

function interpolateMultiStops(value: number, stops: ColorStop[]): string {
  if (value <= stops[0].value) {
    const [r, g, b] = stops[0].rgb;
    return `rgb(${r}, ${g}, ${b})`;
  }
  const last = stops[stops.length - 1];
  if (value >= last.value) {
    const [r, g, b] = last.rgb;
    return `rgb(${r}, ${g}, ${b})`;
  }
  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    if (value >= s1.value && value <= s2.value) {
      const f = (value - s1.value) / (s2.value - s1.value);
      const r = Math.round(s1.rgb[0] + (s2.rgb[0] - s1.rgb[0]) * f);
      const g = Math.round(s1.rgb[1] + (s2.rgb[1] - s1.rgb[1]) * f);
      const b = Math.round(s1.rgb[2] + (s2.rgb[2] - s1.rgb[2]) * f);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  const [r, g, b] = last.rgb;
  return `rgb(${r}, ${g}, ${b})`;
}

const TEMP_COLOR_STOPS: ColorStop[] = [
  { value: -12, rgb: [167, 139, 250] }, // Violet frost
  { value: -4, rgb: [129, 140, 248] },  // Indigo cold
  { value: 2, rgb: [96, 165, 250] },    // Chilly blue
  { value: 8, rgb: [56, 189, 248] },    // Crisp sky cyan
  { value: 15, rgb: [45, 212, 191] },   // Soft teal
  { value: 21, rgb: [251, 191, 36] },   // Warm amber
  { value: 27, rgb: [251, 146, 60] },   // Warm orange
  { value: 33, rgb: [248, 113, 113] },  // Coral red
  { value: 39, rgb: [244, 63, 94] },    // Crimson heat
];

function getSmoothTempColor(temp: number): string {
  return interpolateMultiStops(temp, TEMP_COLOR_STOPS);
}

const WIND_COLOR_STOPS: ColorStop[] = [
  { value: 0, rgb: [148, 163, 184] },  // Calm: Muted slate
  { value: 8, rgb: [52, 211, 153] },   // Light: Fresh emerald
  { value: 15, rgb: [56, 189, 248] },  // Moderate: Sky cyan
  { value: 22, rgb: [250, 204, 21] },  // Brisk: Bright yellow
  { value: 30, rgb: [251, 146, 60] },  // Strong: Warm orange
  { value: 40, rgb: [248, 113, 113] }, // Gale: Coral red
  { value: 55, rgb: [192, 132, 252] }, // Storm: Vivid purple
];

function getSmoothWindColor(speed: number): string {
  return interpolateMultiStops(speed, WIND_COLOR_STOPS);
}

export function LandscapeChart({ city, weather, onClose }: LandscapeChartProps) {
  const [days, setDays] = useState<1 | 3 | 7>(3);
  const [activeHourIdx, setActiveHourIdx] = useState<number | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Column width tightened to 22-26px as requested
  const colWidth = useMemo(() => {
    if (days === 1) return 26;
    if (days === 3) return 24;
    return 22;
  }, [days]);

  // Step for displaying hour labels, degree values, and weather icons
  const hourStep = useMemo(() => {
    if (days === 1) return 2;
    if (days === 3) return 3;
    return 6;
  }, [days]);

  // Unified step column condition: consistent across hour row, icons, temp values, wind values
  const isStepColumn = useCallback(
    (h: { hourNum: number }, i: number) => {
      if (i === 0) return true;
      if (i === 1 && hourStep > 1) return false;
      return h.hourNum % hourStep === 0;
    },
    [hourStep]
  );

  // Extract structured hours from weather
  const { hours } = useMemo(() => {
    if (!weather?.hourly) return { hours: [], curIdx: -1 };

    const currentIdx = getCurrentHourIndex(weather.hourly.time, weather.timezone);
    if (currentIdx < 0) return { hours: [], curIdx: -1 };

    const hoursCount = days * 24;
    const list = [];
    const maxIdx = Math.min(currentIdx + hoursCount, weather.hourly.time.length);

    let prevDayKey = '';

    for (let i = currentIdx; i < maxIdx; i++) {
      const timeStr = weather.hourly.time[i];
      const date = new Date(timeStr);
      const dayKey = timeStr.split('T')[0];
      const isNewDay = i === currentIdx || dayKey !== prevDayKey;
      prevDayKey = dayKey;

      const hourNum = date.getHours();
      const hourStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      const dayName = date.toLocaleDateString('pl-PL', { weekday: 'short' });
      const fullDate = date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });

      list.push({
        idx: i,
        timeStr,
        date,
        dayKey,
        dayName,
        fullDate,
        isNewDay,
        hourNum,
        hourStr,
        isCurrent: i === currentIdx,
        temp: Math.round(weather.hourly.temperature_2m[i] ?? 0),
        apparentTemp: Math.round(weather.hourly.apparent_temperature?.[i] ?? weather.hourly.temperature_2m[i] ?? 0),
        precipAmount: weather.hourly.precipitation?.[i] ?? 0,
        precipProb: weather.hourly.precipitation_probability?.[i] ?? 0,
        weathercode: weather.hourly.weathercode[i] ?? 0,
        isDay: weather.hourly.is_day[i] === 1,
        windSpeed: Math.round(weather.hourly.windspeed_10m?.[i] ?? 0),
        windDir: Math.round(weather.hourly.winddirection_10m?.[i] ?? 0),
        windGusts: Math.round(weather.hourly.windgusts_10m?.[i] ?? weather.hourly.windspeed_10m?.[i] ?? 0),
        cloudCover: Math.round(weather.hourly.cloudcover?.[i] ?? 0),
        humidity: Math.round(weather.hourly.relativehumidity_2m?.[i] ?? 0),
        uvIndex: Math.round(weather.hourly.uv_index?.[i] ?? 0),
        pressure: Math.round(weather.hourly.surface_pressure?.[i] ?? 1013),
      });
    }

    return { hours: list, curIdx: currentIdx };
  }, [weather, days]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (hours.length === 0) {
      return { minTemp: 0, maxTemp: 0, maxRain: 1, totalRain: 0, maxWind: 0, maxGust: 0 };
    }
    const temps = hours.map((h) => h.temp);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const rainList = hours.map((h) => h.precipAmount);
    const maxRain = Math.max(1.5, ...rainList);
    const totalRain = rainList.reduce((a, b) => a + b, 0);
    const maxWind = Math.max(...hours.map((h) => h.windSpeed));
    const maxGust = Math.max(...hours.map((h) => h.windGusts));

    return { minTemp, maxTemp, maxRain, totalRain, maxWind, maxGust };
  }, [hours]);

  // Group consecutive hours into Day and Night spans for seamless SVG background rendering
  const dayNightSpans = useMemo(() => {
    if (hours.length === 0) return [];
    const spans: { isDay: boolean; startX: number; width: number }[] = [];
    let cur = { isDay: hours[0].isDay, startIdx: 0, count: 1 };

    for (let i = 1; i < hours.length; i++) {
      if (hours[i].isDay === cur.isDay) {
        cur.count++;
      } else {
        spans.push({
          isDay: cur.isDay,
          startX: cur.startIdx * colWidth,
          width: cur.count * colWidth,
        });
        cur = { isDay: hours[i].isDay, startIdx: i, count: 1 };
      }
    }
    spans.push({
      isDay: cur.isDay,
      startX: cur.startIdx * colWidth,
      width: cur.count * colWidth,
    });
    return spans;
  }, [hours, colWidth]);

  // Compute exact sunrise and sunset markers across the displayed time range
  const sunEvents = useMemo(() => {
    if (!weather?.daily?.sunrise || !weather?.daily?.sunset || hours.length === 0) {
      return [];
    }

    const startMs = hours[0].date.getTime();
    const endMs = hours[hours.length - 1].date.getTime() + 3600 * 1000;
    const events: { type: 'sunrise' | 'sunset'; timeStr: string; x: number; date: Date }[] = [];

    const addEvents = (list: string[], type: 'sunrise' | 'sunset') => {
      for (const isoStr of list) {
        if (!isoStr) continue;
        const d = new Date(isoStr);
        const ms = d.getTime();
        if (ms >= startMs && ms <= endMs) {
          const fractionalHours = (ms - startMs) / (3600 * 1000);
          const x = fractionalHours * colWidth;
          const timeStr = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
          events.push({ type, timeStr, x, date: d });
        }
      }
    };

    addEvents(weather.daily.sunrise, 'sunrise');
    addEvents(weather.daily.sunset, 'sunset');

    events.sort((a, b) => a.x - b.x);
    return events;
  }, [weather?.daily, hours, colWidth]);

  // Next upcoming sunrise or sunset event for header summary
  const nextSunEvent = useMemo(() => {
    if (sunEvents.length === 0) return null;
    const now = Date.now();
    return sunEvents.find((e) => e.date.getTime() >= now) || sunEvents[0];
  }, [sunEvents]);

  // HUD interaction with dynamic anchor (left/right) to never cover active hour
  const [hudAnchor, setHudAnchor] = useState<'left' | 'right'>('right');

  // Track if physical device viewport is in portrait mode (width < height)
  const [isPortraitViewport, setIsPortraitViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < window.innerHeight;
  });
  const [isForceRotated, setIsForceRotated] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOrientationCheck = () => {
      const portrait = window.innerWidth < window.innerHeight;
      setIsPortraitViewport(portrait);
      // When device physically rotates to landscape, clear manual CSS rotation
      if (!portrait) {
        setIsForceRotated(false);
      }
    };
    window.addEventListener('resize', handleOrientationCheck);
    window.addEventListener('orientationchange', handleOrientationCheck);
    return () => {
      window.removeEventListener('resize', handleOrientationCheck);
      window.removeEventListener('orientationchange', handleOrientationCheck);
    };
  }, []);

  const openHud = useCallback((idx: number) => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }
    const hourX = idx * colWidth + colWidth / 2;
    const scrollLeft = scrollContainerRef.current?.scrollLeft ?? 0;
    const viewportWidth = scrollContainerRef.current?.clientWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 800);
    const visibleX = hourX - scrollLeft;
    setHudAnchor(visibleX > viewportWidth / 2 ? 'left' : 'right');
    setActiveHourIdx(idx);
    autoDismissTimerRef.current = setTimeout(() => {
      setActiveHourIdx(null);
    }, 10000);
  }, [colWidth]);

  const closeHud = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }
    setActiveHourIdx(null);
  }, []);

  const goToPrevHour = useCallback(() => {
    if (activeHourIdx === null) return;
    const prev = Math.max(0, activeHourIdx - 1);
    openHud(prev);
  }, [activeHourIdx, openHud]);

  const goToNextHour = useCallback(() => {
    if (activeHourIdx === null) return;
    const next = Math.min(hours.length - 1, activeHourIdx + 1);
    openHud(next);
  }, [activeHourIdx, hours.length, openHud]);

  useEffect(() => {
    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
      }
    };
  }, []);

  // Lock body scroll while landscape modal is open to prevent background scrolling
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, []);

  // Keyboard navigation: Esc to close, ArrowLeft/ArrowRight to navigate hours
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeHourIdx !== null) {
          closeHud();
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        goToPrevHour();
      } else if (e.key === 'ArrowRight') {
        goToNextHour();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeHourIdx, closeHud, onClose, goToPrevHour, goToNextHour]);

  if (!weather || hours.length === 0) return null;

  const chartWidth = Math.max(
    hours.length * colWidth,
    typeof window !== 'undefined' ? window.innerWidth - 16 : 600
  );

  // --- SVG Coordinates & Scales ---

  // Chart 1: Temperature & Precipitation (viewBox height: 110)
  const tempSpan = Math.max(4, stats.maxTemp - stats.minTemp);
  const getTempY = (t: number) => {
    return 56 - ((t - stats.minTemp) / tempSpan) * 30;
  };

  const tempPoints = hours.map((h, i) => ({
    x: i * colWidth + colWidth / 2,
    y: getTempY(h.temp),
  }));

  const tempSplineD = getSvgSpline(tempPoints);
  const firstX = tempPoints[0]?.x ?? 0;
  const lastX = tempPoints[tempPoints.length - 1]?.x ?? chartWidth;
  const tempAreaD = `${tempSplineD} L ${lastX.toFixed(1)} 104 L ${firstX.toFixed(1)} 104 Z`;

  // Chart 2: Wind, Gusts & Cloud Cover (viewBox height: 100)
  // Cloud Cover: 0-100% -> y: 80 (0%) to 16 (100%)
  const getCloudY = (c: number) => {
    return 80 - (c / 100) * 64;
  };
  const cloudPoints = hours.map((h, i) => ({
    x: i * colWidth + colWidth / 2,
    y: getCloudY(h.cloudCover),
  }));
  const cloudSplineD = getSvgSpline(cloudPoints);
  const cloudAreaD = `${cloudSplineD} L ${lastX.toFixed(1)} 80 L ${firstX.toFixed(1)} 80 Z`;

  // Wind Speed & Gusts: scale from 0 to maxWindScale -> y: 76 (0) to 18 (max)
  const maxWindScale = Math.max(30, stats.maxGust + 5);
  const getWindY = (s: number) => {
    return 76 - (s / maxWindScale) * 58;
  };
  const windPoints = hours.map((h, i) => ({
    x: i * colWidth + colWidth / 2,
    y: getWindY(h.windSpeed),
  }));
  const windSplineD = getSvgSpline(windPoints);

  // Active hour details
  const activeHour = activeHourIdx !== null ? hours[activeHourIdx] : null;
  const activeHourInfo = activeHour ? getWeatherInfo(activeHour.weathercode, activeHour.isDay) : null;
  const activeHourCloudInfo = activeHour ? getCloudCoverInfo(activeHour.cloudCover) : null;
  const activeDaySunrise =
    activeHour && weather?.daily?.sunrise
      ? weather.daily.sunrise.find((s) => s.startsWith(activeHour.dayKey))
      : null;
  const activeDaySunset =
    activeHour && weather?.daily?.sunset
      ? weather.daily.sunset.find((s) => s.startsWith(activeHour.dayKey))
      : null;

  const isRotated = isPortraitViewport && isForceRotated;

  return (
    <div
      className={`fixed inset-0 z-[100] bg-zinc-950/90 backdrop-blur-2xl flex flex-col text-zinc-100 selection:bg-blue-500/30 overflow-hidden animate-in fade-in duration-200 select-none ${
        isRotated ? 'origin-top-left' : ''
      }`}
      style={
        isRotated
          ? {
              width: '100vh',
              height: '100vw',
              transform: 'rotate(90deg) translateY(-100%)',
            }
          : undefined
      }
    >
      {/* 1. Unified Single-Line Header (~36px) */}
      <header className="h-[36px] px-3 shrink-0 flex items-center justify-between gap-2.5 border-b border-white/10 bg-zinc-950/85 backdrop-blur-xl select-none">
        {/* Left: City + GPS + Compact Metric Badges */}
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight truncate">
              {city.name}
            </h2>
            {city.isGps && (
              <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 shrink-0">
                GPS
              </span>
            )}
          </div>

          <span className="text-zinc-600 shrink-0">•</span>

          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium text-zinc-300">
            {/* Min-Max */}
            <span className="flex items-center gap-0.5 shrink-0 bg-white/[0.04] px-1.5 py-0.5 rounded-full border border-white/5">
              <span className="text-cyan-300 font-bold">{stats.minTemp}°</span>
              <span className="text-zinc-500">/</span>
              <span className="text-amber-300 font-bold">{stats.maxTemp}°C</span>
            </span>

            {/* Total Rain (if > 0) */}
            {stats.totalRain > 0 && (
              <span className="flex items-center gap-1 shrink-0 bg-cyan-500/10 px-1.5 py-0.5 rounded-full border border-cyan-400/20 text-cyan-300">
                <Droplets size={10} className="text-cyan-400" />
                <span className="font-semibold">{stats.totalRain.toFixed(1)} mm</span>
              </span>
            )}

            {/* Max Gust */}
            <span className="flex items-center gap-1 shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20 text-emerald-300">
              <Wind size={10} className="text-emerald-400" />
              <span className="font-semibold">{stats.maxGust} km/h</span>
            </span>

            {/* Next Sun Event */}
            {nextSunEvent && (
              <span className="flex items-center gap-1 shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-400/20 text-amber-200">
                <span className="text-amber-400 font-bold">{nextSunEvent.type === 'sunrise' ? '↑' : '↓'}</span>
                <span className="font-semibold">{nextSunEvent.timeStr}</span>
              </span>
            )}
          </div>
        </div>

        {/* Center: Range pills (24h, 3D, 7D) */}
        <div className="flex items-center bg-zinc-900/90 p-0.5 rounded-full border border-white/10 shadow-inner shrink-0">
          <button
            onClick={() => {
              setDays(1);
              setActiveHourIdx(null);
            }}
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
              days === 1
                ? 'bg-blue-500/30 text-blue-200 border border-blue-400/40 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            24h
          </button>
          <button
            onClick={() => {
              setDays(3);
              setActiveHourIdx(null);
            }}
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
              days === 3
                ? 'bg-blue-500/30 text-blue-200 border border-blue-400/40 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            3 Dni
          </button>
          <button
            onClick={() => {
              setDays(7);
              setActiveHourIdx(null);
            }}
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
              days === 7
                ? 'bg-blue-500/30 text-blue-200 border border-blue-400/40 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            7 Dni
          </button>
        </div>

        {/* Right: Rotate Toggle (when in portrait) + Close button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isPortraitViewport && (
            <button
              onClick={() => setIsForceRotated(!isForceRotated)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                isForceRotated
                  ? 'bg-blue-500/25 text-blue-300 border-blue-400/40 ring-1 ring-blue-400/30'
                  : 'bg-white/10 hover:bg-white/20 text-zinc-200 border-white/15 active:scale-95'
              }`}
              title={isForceRotated ? 'Przywróć orientację pionową' : 'Obróć wykres do poziomu (90°)'}
              aria-label="Obróć wykres o 90 stopni"
            >
              <RotateCw size={11} className={isForceRotated ? 'text-blue-400 rotate-90 transition-transform' : 'text-zinc-300'} />
              <span>{isForceRotated ? 'Pionowo' : 'Obróć 90°'}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-[11px] font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer"
            title="Zamknij widok poziomy (Esc)"
            aria-label="Zamknij widok poziomy"
          >
            <X size={13} />
            <span className="hidden sm:inline">Zamknij</span>
          </button>
        </div>
      </header>

      {/* Subtle Prompt Banner when opened in portrait without 90deg rotation */}
      {isPortraitViewport && !isForceRotated && (
        <div className="bg-blue-950/45 border-b border-blue-400/20 px-3 py-1 flex items-center justify-between text-[11px] text-blue-200 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <RotateCw size={12} className="text-blue-400 shrink-0" />
            <span className="truncate">Obróć telefon poziomo lub kliknij:</span>
          </div>
          <button
            onClick={() => setIsForceRotated(true)}
            className="ml-2 px-2.5 py-0.5 rounded-full bg-blue-500/30 hover:bg-blue-500/40 border border-blue-400/40 text-blue-200 text-[10px] font-bold shrink-0 cursor-pointer active:scale-95 shadow-sm"
          >
            Obróć widok (90°)
          </button>
        </div>
      )}

      {/* 3. Floating HUD Card (Overlay on user interaction - does not shift chart height) */}
      {activeHour && activeHourInfo && (
        <div
          ref={hudRef}
          className={`absolute top-10 z-50 rounded-2xl bg-zinc-950/85 border border-white/15 backdrop-blur-2xl p-2.5 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)] ring-1 ring-cyan-400/30 animate-in fade-in zoom-in-95 duration-150 max-w-[calc(100vw-24px)] sm:max-w-xl ${
            hudAnchor === 'left' ? 'left-3 right-auto' : 'right-3 left-auto'
          }`}
        >
          {/* HUD Header: Prev/Next Buttons + Time Pill + Date + Day/Night + Sun Times + Close */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Step Previous */}
              <button
                type="button"
                onClick={goToPrevHour}
                disabled={activeHourIdx === 0}
                className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 active:scale-90 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
                title="Poprzednia godzina (Strzałka w lewo)"
              >
                <ChevronLeft size={13} />
              </button>

              {/* Hour Tag */}
              <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/25 border border-cyan-400/40 text-[11px] font-mono font-bold text-cyan-300 uppercase shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.25)]">
                {activeHour.isCurrent ? 'Teraz' : activeHour.hourStr}
              </span>

              {/* Step Next */}
              <button
                type="button"
                onClick={goToNextHour}
                disabled={activeHourIdx === hours.length - 1}
                className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 active:scale-90 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
                title="Następna godzina (Strzałka w prawo)"
              >
                <ChevronRight size={13} />
              </button>

              {/* Full Date */}
              <span className="text-xs font-semibold text-zinc-200 truncate ml-0.5">
                {activeHour.fullDate}
              </span>

              {/* Day/Night Badge */}
              <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border shrink-0 ${
                activeHour.isDay
                  ? 'bg-amber-500/15 text-amber-200 border-amber-400/30'
                  : 'bg-indigo-500/15 text-indigo-200 border-indigo-400/30'
              }`}>
                {activeHour.isDay ? 'Dzień' : 'Noc'}
              </span>
            </div>

            {/* Sun Times for active day + Close Button */}
            <div className="flex items-center gap-2 shrink-0">
              {activeDaySunrise && activeDaySunset && (
                <div className="flex items-center gap-1.5 text-[9.5px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10">
                  <span className="text-amber-300">☀ ↑{formatTime(activeDaySunrise)}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-orange-300">↓{formatTime(activeDaySunset)}</span>
                </div>
              )}

              <button
                onClick={closeHud}
                className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
                title="Zamknij podgląd (Esc)"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* HUD Content: 5 Rich Glassmorphic Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
            {/* 1. Temp & Conditions */}
            <div className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.07] p-2 rounded-xl border border-white/10 transition">
              <WeatherIcon code={activeHour.weathercode} isDay={activeHour.isDay} size={24} glow={false} />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-white leading-tight">{activeHour.temp}°C</span>
                <span className="text-[9px] text-zinc-400 truncate">odcz. {activeHour.apparentTemp}°C</span>
                <span className="text-[8.5px] text-zinc-300 font-medium truncate">{activeHourInfo.label}</span>
              </div>
            </div>

            {/* 2. Precipitation */}
            <div className="flex flex-col justify-between bg-white/[0.05] hover:bg-white/[0.07] p-2 rounded-xl border border-white/10 transition">
              <div className="flex items-center gap-1 text-cyan-400">
                <Droplets size={11} />
                <span className="text-[9px] font-bold uppercase text-zinc-400">Opady</span>
              </div>
              <span className="text-xs font-black text-cyan-300 leading-tight">{activeHour.precipAmount.toFixed(1)} mm</span>
              <span className="text-[9px] text-cyan-200/80 font-medium">{activeHour.precipProb}% szans</span>
            </div>

            {/* 3. Wind */}
            <div className="flex flex-col justify-between bg-white/[0.05] hover:bg-white/[0.07] p-2 rounded-xl border border-white/10 transition">
              <div className="flex items-center gap-1 text-emerald-400">
                <Wind size={11} />
                <span className="text-[9px] font-bold uppercase text-zinc-400">Wiatr</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-black text-emerald-300 leading-tight">
                <Navigation
                  size={10}
                  style={{ transform: `rotate(${activeHour.windDir}deg)` }}
                  className="text-emerald-400 fill-current"
                />
                <span>{activeHour.windSpeed} km/h</span>
              </div>
              <span className="text-[9px] text-emerald-300/80 font-medium truncate">
                porywy {activeHour.windGusts} ({degreesToCardinal(activeHour.windDir)})
              </span>
            </div>

            {/* 4. Clouds */}
            <div className="flex flex-col justify-between bg-white/[0.05] hover:bg-white/[0.07] p-2 rounded-xl border border-white/10 transition">
              <div className="flex items-center gap-1 text-slate-300">
                <Cloud size={11} />
                <span className="text-[9px] font-bold uppercase text-zinc-400">Chmury</span>
              </div>
              <span className="text-xs font-black text-white leading-tight">{activeHour.cloudCover}%</span>
              <span className="text-[9px] text-slate-300/80 font-medium truncate">
                {activeHourCloudInfo?.label || 'Chmury'}
              </span>
            </div>

            {/* 5. Conditions / Pressure & UV */}
            <div className="flex flex-col justify-between bg-white/[0.05] hover:bg-white/[0.07] p-2 rounded-xl border border-white/10 transition">
              <div className="flex items-center gap-1 text-amber-400">
                <Gauge size={11} />
                <span className="text-[9px] font-bold uppercase text-zinc-400">Warunki</span>
              </div>
              <span className="text-xs font-black text-zinc-100 leading-tight">{activeHour.pressure} hPa</span>
              <span className="text-[9px] text-zinc-400 font-medium truncate">
                Wilg. {activeHour.humidity}% • UV {activeHour.uvIndex}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Scrollable Track (Both charts fit without vertical scroll) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-x-auto overflow-y-auto px-2 py-1.5 flex flex-col [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full touch-pan-x"
      >
        <div
          style={{ width: `${chartWidth}px`, minWidth: '100%' }}
          className="h-full flex flex-col justify-between gap-1.5"
        >
          {/* Timeline Hours Row (~24px) */}
          <div
            className="shrink-0 h-[24px] grid items-center text-center select-none"
            style={{ gridTemplateColumns: `repeat(${hours.length}, ${colWidth}px)` }}
          >
            {hours.map((h, i) => {
              const isSelected = activeHourIdx === i;
              const isStep = isStepColumn(h, i);
              const showLabel = isStep || h.isCurrent || isSelected;

              return (
                <button
                  type="button"
                  key={h.idx}
                  data-testid={`hour-btn-${i}`}
                  onClick={() => openHud(i)}
                  className={`flex flex-col items-center justify-between h-full rounded-md transition-all cursor-pointer relative py-0.5 ${
                    isSelected
                      ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.5)] z-20'
                      : h.isCurrent
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'text-zinc-400 hover:bg-white/[0.06]'
                  }`}
                >
                  {/* Top row: day name if isNewDay, else empty spacer for strict uniform baseline */}
                  <span className="h-[8px] flex items-center justify-center text-[7.5px] font-bold uppercase leading-none truncate">
                    {h.isNewDay ? (
                      <span className="text-amber-400">{h.dayName}</span>
                    ) : null}
                  </span>

                  {/* Bottom row: hour number */}
                  <span
                    className={`font-mono tabular-nums leading-none ${
                      isSelected
                        ? 'text-white font-bold text-[9.5px]'
                        : h.isCurrent
                        ? 'text-cyan-300 font-bold text-[8.5px] tracking-tight'
                        : showLabel
                        ? h.isDay
                          ? 'text-amber-100/90 text-[9.5px]'
                          : 'text-blue-200/80 text-[9.5px]'
                        : 'text-zinc-600 text-[8px]'
                    }`}
                  >
                    {h.isCurrent ? 'Teraz' : showLabel ? h.hourNum.toString().padStart(2, '0') : '·'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* WYKRES 1: TEMPERATURA & OPADY (flex-1) */}
          <div className="flex-1 min-h-0 rounded-xl bg-zinc-900/40 border border-white/10 p-2 flex flex-col relative overflow-hidden shadow-md">
            {/* Card Header (Stats inline with title so they are never hidden off-screen) */}
            <div className="shrink-0 h-4 flex items-center justify-between px-1 mb-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300 shrink-0">
                  <Thermometer size={12} />
                  <span>Temperatura i opady</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.2 rounded-md border border-white/5 shrink-0">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-zinc-200 font-semibold">Maks: {stats.maxTemp}°C</span>
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="text-zinc-200 font-semibold">Min: {stats.minTemp}°C</span>
                  </span>
                  {stats.totalRain > 0 && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span className="text-cyan-300 font-semibold">
                        Opad: {stats.totalRain.toFixed(1)} mm
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Visualizer: Temperature Curve + Precipitation Bars */}
            <div className="flex-1 min-h-0 relative w-full">
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox={`0 0 ${chartWidth} 110`}
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Daylight ambient background gradient */}
                  <linearGradient id="landscapeDayGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.14" />
                    <stop offset="50%" stopColor="#fef08a" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.02" />
                  </linearGradient>

                  {/* Night ambient background gradient */}
                  <linearGradient id="landscapeNightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#020617" stopOpacity="0.75" />
                    <stop offset="50%" stopColor="#0a1128" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0.40" />
                  </linearGradient>

                  {/* Temperature line gradient */}
                  <linearGradient id="landscapeTempLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    {hours.map((h, i) => {
                      const pct = ((i + 0.5) / hours.length) * 100;
                      return <stop key={i} offset={`${pct.toFixed(1)}%`} stopColor={getSmoothTempColor(h.temp)} />;
                    })}
                  </linearGradient>

                  {/* Temperature area glow gradient */}
                  <linearGradient id="landscapeTempAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
                    <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>

                  {/* Rain bar vertical gradient */}
                  <linearGradient id="landscapeRainBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>

                {/* Day and Night Background Shading Bands */}
                {dayNightSpans.map((span, idx) => (
                  <rect
                    key={`span-1-${idx}`}
                    x={span.startX}
                    y={0}
                    width={span.width}
                    height={110}
                    fill={span.isDay ? 'url(#landscapeDayGrad)' : 'url(#landscapeNightGrad)'}
                  />
                ))}

                {/* Subtle Vertical Hour Grid Lines */}
                {hours.map((h, i) => {
                  if (activeHourIdx === i) return null;
                  const x = i * colWidth + colWidth / 2;
                  const isStep = isStepColumn(h, i);
                  return (
                    <line
                      key={`hour-grid-1-${i}`}
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={110}
                      stroke={isStep ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.038)'}
                      strokeWidth={isStep ? 1 : 0.75}
                      strokeDasharray={isStep ? '3 3' : undefined}
                    />
                  );
                })}

                {/* Day Separator Vertical Dashed Lines */}
                {hours.map((h, i) => {
                  if (!h.isNewDay || i === 0) return null;
                  return (
                    <line
                      key={`sep-${i}`}
                      x1={i * colWidth}
                      y1={0}
                      x2={i * colWidth}
                      y2={110}
                      stroke="rgba(255,255,255,0.16)"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Sunrise & Sunset Event Markers */}
                {sunEvents.map((event, idx) => {
                  const isSunrise = event.type === 'sunrise';
                  const color = isSunrise ? '#fbbf24' : '#fb923c';
                  const badgeX = Math.max(22, Math.min(chartWidth - 22, event.x));
                  const closestHourIdx = Math.max(0, Math.min(hours.length - 1, Math.round(event.x / colWidth)));

                  return (
                    <g
                      key={`sun-event-1-${idx}`}
                      className="cursor-pointer pointer-events-auto select-none group"
                      onClick={() => openHud(closestHourIdx)}
                    >
                      {/* Vertical dashed event line */}
                      <line
                        x1={event.x}
                        y1={0}
                        x2={event.x}
                        y2={110}
                        stroke={color}
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                        strokeOpacity="0.5"
                      />
                      {/* Elegant Pill Badge at top */}
                      <rect
                        x={badgeX - 18}
                        y={2}
                        width={36}
                        height={13}
                        rx={6.5}
                        fill={isSunrise ? '#451a03' : '#270e06'}
                        fillOpacity="0.95"
                        stroke={color}
                        strokeWidth="0.8"
                        strokeOpacity="0.85"
                        className="transition-transform group-hover:brightness-125"
                      />
                      {/* Mini Sun Dot */}
                      <circle cx={badgeX - 11} cy={8.5} r={2.2} fill={color} />
                      {/* Arrow + Time */}
                      <text
                        x={badgeX + 3}
                        y={11.5}
                        fill={isSunrise ? '#fef08a' : '#fed7aa'}
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="font-mono font-bold"
                      >
                        {isSunrise ? `↑${event.timeStr}` : `↓${event.timeStr}`}
                      </text>
                    </g>
                  );
                })}

                {/* Active Hour Guide Line */}
                {activeHourIdx !== null && (
                  <line
                    x1={activeHourIdx * colWidth + colWidth / 2}
                    y1={0}
                    x2={activeHourIdx * colWidth + colWidth / 2}
                    y2={110}
                    stroke="#22d3ee"
                    strokeWidth="1.8"
                    strokeDasharray="3 2"
                    className="drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]"
                  />
                )}

                {/* Temperature Area Glow */}
                <path d={tempAreaD} fill="url(#landscapeTempAreaGrad)" />

                {/* Temperature Spline Curve */}
                <path
                  d={tempSplineD}
                  fill="none"
                  stroke="url(#landscapeTempLineGrad)"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"
                />

                {/* Full-column interactive hit zones for Chart 1 */}
                {hours.map((_, idx) => (
                  <rect
                    key={`hit-temp-${idx}`}
                    x={idx * colWidth}
                    y={0}
                    width={colWidth}
                    height={110}
                    fill="transparent"
                    className="cursor-pointer pointer-events-auto"
                    onClick={() => openHud(idx)}
                  />
                ))}

                {/* Temperature Nodes & Degree Values (for every hour) */}
                {tempPoints.map((p, idx) => {
                  const h = hours[idx];
                  const isSelected = activeHourIdx === idx;
                  const isCurrent = h.isCurrent;
                  const tColor = getSmoothTempColor(h.temp);

                  return (
                    <g key={`temp-node-${idx}`} className="cursor-pointer pointer-events-auto" onClick={() => openHud(idx)}>
                      {isSelected && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="6"
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="1.8"
                          className="animate-pulse"
                        />
                      )}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isSelected ? 3.5 : isCurrent ? 2.8 : 2}
                        fill={isSelected ? '#22d3ee' : tColor}
                        stroke="#09090b"
                        strokeWidth="1"
                      />
                      <text
                        x={p.x}
                        y={p.y - 5}
                        fill={isSelected ? '#22d3ee' : '#ffffff'}
                        fontSize={isSelected ? '9' : '8'}
                        fontWeight="bold"
                        textAnchor="middle"
                        className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] select-none font-mono font-bold"
                      >
                        {h.temp}°
                      </text>
                    </g>
                  );
                })}

                {/* Precipitation Baseline */}
                <line x1="0" y1="104" x2={chartWidth} y2="104" stroke="rgba(255,255,255,0.06)" />

                {/* Precipitation Bars & Labels (Only when precipitation occurs) */}
                {hours.map((h, idx) => {
                  if (h.precipAmount <= 0) return null;

                  const p = tempPoints[idx];
                  const barWidth = Math.max(6, Math.min(14, colWidth - 6));
                  const maxRain = Math.max(1.5, stats.maxRain);
                  const barH = Math.max(4, Math.min(32, Math.round((h.precipAmount / maxRain) * 28)));
                  const barY = 104 - barH;
                  const isSnow =
                    (h.weathercode >= 71 && h.weathercode <= 77) ||
                    (h.weathercode >= 85 && h.weathercode <= 86);

                  return (
                    <g key={`precip-${idx}`} className="cursor-pointer pointer-events-auto" onClick={() => openHud(idx)}>
                      <rect
                        x={p.x - barWidth / 2}
                        y={barY}
                        width={barWidth}
                        height={barH}
                        rx="1.5"
                        fill={isSnow ? '#93c5fd' : 'url(#landscapeRainBarGrad)'}
                        fillOpacity={isSnow ? '0.85' : '0.9'}
                      />
                      {/* Exact mm Value */}
                      <text
                        x={p.x}
                        y={barY - 2}
                        fill="#67e8f9"
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {h.precipAmount.toFixed(1)}
                      </text>

                      {/* Probability % ONLY if > 0 */}
                      {h.precipProb > 0 && (
                        <text
                          x={p.x}
                          y={barY - 9}
                          fill="#38bdf8"
                          fontSize="6.5"
                          fontWeight="semibold"
                          textAnchor="middle"
                        >
                          {h.precipProb}%
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* WYKRES 2: WIATR, PORYWY & ZACHMURZENIE (flex-1) */}
          <div className="flex-1 min-h-0 rounded-xl bg-zinc-900/40 border border-white/10 p-2 flex flex-col relative overflow-hidden shadow-md">
            {/* Card Header (Stats inline with title so they are never hidden off-screen) */}
            <div className="shrink-0 h-4 flex items-center justify-between px-1 mb-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 shrink-0">
                  <Wind size={12} />
                  <span>Wiatr i zachmurzenie</span>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 bg-white/[0.04] px-1.5 py-0.2 rounded-md border border-white/5 shrink-0">
                  <span className="text-emerald-300 font-semibold">
                    Maks. poryw: {stats.maxGust} km/h
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-slate-300">
                    Zachmurzenie 0–100% (tło)
                  </span>
                </div>
              </div>
            </div>

            {/* Visualizer: Cloud Area + Wind Spline + Gust Whiskers + Direction Arrows */}
            <div className="flex-1 min-h-0 relative w-full">
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox={`0 0 ${chartWidth} 100`}
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Daylight ambient background gradient */}
                  <linearGradient id="landscapeDayGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.14" />
                    <stop offset="50%" stopColor="#fef08a" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.02" />
                  </linearGradient>

                  {/* Night ambient background gradient */}
                  <linearGradient id="landscapeNightGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#020617" stopOpacity="0.75" />
                    <stop offset="50%" stopColor="#0a1128" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0.40" />
                  </linearGradient>

                  {/* Linear gradient for cloud area */}
                  <linearGradient id="landscapeCloudAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.24" />
                    <stop offset="60%" stopColor="#64748b" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#334155" stopOpacity="0.02" />
                  </linearGradient>

                  {/* Linear gradient for wind line */}
                  <linearGradient id="landscapeWindLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    {hours.map((h, i) => {
                      const pct = ((i + 0.5) / hours.length) * 100;
                      return <stop key={i} offset={`${pct.toFixed(1)}%`} stopColor={getSmoothWindColor(h.windSpeed)} />;
                    })}
                  </linearGradient>
                </defs>

                {/* Day and Night Background Shading Bands */}
                {dayNightSpans.map((span, idx) => (
                  <rect
                    key={`span-2-${idx}`}
                    x={span.startX}
                    y={0}
                    width={span.width}
                    height={100}
                    fill={span.isDay ? 'url(#landscapeDayGrad2)' : 'url(#landscapeNightGrad2)'}
                  />
                ))}

                {/* Subtle Vertical Hour Grid Lines */}
                {hours.map((h, i) => {
                  if (activeHourIdx === i) return null;
                  const x = i * colWidth + colWidth / 2;
                  const isStep = isStepColumn(h, i);
                  return (
                    <line
                      key={`hour-grid-2-${i}`}
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={100}
                      stroke={isStep ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.038)'}
                      strokeWidth={isStep ? 1 : 0.75}
                      strokeDasharray={isStep ? '3 3' : undefined}
                    />
                  );
                })}

                {/* Day Separator Vertical Dashed Lines */}
                {hours.map((h, i) => {
                  if (!h.isNewDay || i === 0) return null;
                  return (
                    <line
                      key={`sep2-${i}`}
                      x1={i * colWidth}
                      y1={0}
                      x2={i * colWidth}
                      y2={100}
                      stroke="rgba(255,255,255,0.16)"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Sunrise & Sunset Event Guide Lines Continuation */}
                {sunEvents.map((event, idx) => (
                  <line
                    key={`sun-event-2-${idx}`}
                    x1={event.x}
                    y1={0}
                    x2={event.x}
                    y2={100}
                    stroke={event.type === 'sunrise' ? '#fbbf24' : '#fb923c'}
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    strokeOpacity="0.3"
                    className="pointer-events-none"
                  />
                ))}

                {/* Cloud Guide Lines (50% and 100%) */}
                <line x1="0" y1="16" x2={chartWidth} y2="16" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
                <text x="4" y="13.5" fill="rgba(255,255,255,0.22)" fontSize="6.5" fontWeight="semibold" className="select-none font-mono">100% chmur</text>
                <line x1="0" y1="48" x2={chartWidth} y2="48" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 2" />
                <text x="4" y="45.5" fill="rgba(255,255,255,0.18)" fontSize="6" fontWeight="medium" className="select-none font-mono">50%</text>

                {/* Active Hour Guide Line */}
                {activeHourIdx !== null && (
                  <line
                    x1={activeHourIdx * colWidth + colWidth / 2}
                    y1={0}
                    x2={activeHourIdx * colWidth + colWidth / 2}
                    y2={100}
                    stroke="#22d3ee"
                    strokeWidth="1.8"
                    strokeDasharray="3 2"
                    className="drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]"
                  />
                )}

                {/* Cloud Cover Semi-transparent Layer (0-100%) */}
                <path d={cloudAreaD} fill="url(#landscapeCloudAreaGrad)" />
                <path
                  d={cloudSplineD}
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.35)"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />

                {/* Full-column interactive hit zones for Chart 2 */}
                {hours.map((_, idx) => (
                  <rect
                    key={`hit-wind-${idx}`}
                    x={idx * colWidth}
                    y={0}
                    width={colWidth}
                    height={100}
                    fill="transparent"
                    className="cursor-pointer pointer-events-auto"
                    onClick={() => openHud(idx)}
                  />
                ))}

                {/* Wind Gusts: Horizontal dashes at gust level */}
                {windPoints.map((p, idx) => {
                  const h = hours[idx];
                  const isSelected = activeHourIdx === idx;
                  const isMeaningfulGust = h.windGusts >= 14 && h.windGusts >= h.windSpeed + 3;
                  if (!isMeaningfulGust && !isSelected) return null;

                  const gustY = getWindY(h.windGusts);
                  const isStep = isStepColumn(h, idx);
                  const isPeak = stats.maxGust >= 16 && h.windGusts === stats.maxGust;
                  const showGustNum = isSelected || isPeak || (isStep && h.windGusts >= 20);
                  const halfWidth = 4.5;

                  return (
                    <g key={`gust-${idx}`} className="cursor-pointer pointer-events-auto" onClick={() => openHud(idx)}>
                      <line
                        x1={p.x - halfWidth}
                        y1={gustY}
                        x2={p.x + halfWidth}
                        y2={gustY}
                        stroke={isSelected ? '#22d3ee' : '#f87171'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                      />
                      {showGustNum && (
                        <text
                          x={p.x}
                          y={gustY - 3.5}
                          fill={isSelected ? '#22d3ee' : '#fca5a5'}
                          fontSize="7"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="font-mono select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                        >
                          {h.windGusts}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Wind Speed Line */}
                <path
                  d={windSplineD}
                  fill="none"
                  stroke="url(#landscapeWindLineGrad)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                />

                {/* Wind Speed Points & Numbers */}
                {windPoints.map((p, idx) => {
                  const h = hours[idx];
                  const isSelected = activeHourIdx === idx;
                  const isCurrent = h.isCurrent;
                  const isStep = isStepColumn(h, idx);
                  const showSpeed = isStep || isSelected || isCurrent;
                  const wColor = getSmoothWindColor(h.windSpeed);

                  return (
                    <g key={`wind-${idx}`} className="cursor-pointer pointer-events-auto" onClick={() => openHud(idx)}>
                      {isSelected && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="6"
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="1.8"
                          className="animate-pulse"
                        />
                      )}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isSelected ? 3.5 : isCurrent ? 2.8 : 2}
                        fill={isSelected ? '#22d3ee' : wColor}
                        stroke="#09090b"
                        strokeWidth="1"
                      />
                      {showSpeed && (
                        <text
                          x={p.x}
                          y={p.y + 9}
                          fill="#6ee7b7"
                          fontSize="7.5"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                        >
                          {h.windSpeed}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Wind Direction Miniature Arrows along bottom track (y = 92) */}
                {hours.map((h, idx) => {
                  const p = windPoints[idx];
                  const isSelected = activeHourIdx === idx;
                  const isStep = isStepColumn(h, idx);
                  const showArrow = (days === 7 ? isStep : (idx % 2 === 0 || isStep)) || isSelected || h.isCurrent;
                  if (!showArrow) return null;

                  return (
                    <g
                      key={`arrow-${idx}`}
                      transform={`translate(${p.x}, 92) rotate(${h.windDir + 180})`}
                      className="cursor-pointer pointer-events-auto"
                      onClick={() => openHud(idx)}
                    >
                      <path
                        d="M 0 -3.5 L 2 2.5 L 0 1.2 L -2 2.5 Z"
                        fill={getSmoothWindColor(h.windSpeed)}
                        stroke="#09090b"
                        strokeWidth="0.5"
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
