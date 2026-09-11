'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { WeatherResult, City } from '@/lib/types';
import { getCurrentHourIndex, degreesToCardinal, getCloudCoverInfo, formatTime, getMoonPhaseInfo } from '@/lib/utils';
import { getWeatherInfo } from '@/lib/weather-codes';
import { WeatherIcon } from '@/components/ui/WeatherIcon';
import {
  Thermometer,
  Droplets,
  Wind,
  Cloud,
  Sun,
  Moon,
  Gauge,
  Navigation,
  X,
  ArrowUp,
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
  const days = 7;
  const [activeHourIdx, setActiveHourIdx] = useState<number | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const isScrubbingRef = useRef<boolean>(false);
  const isClosingRef = useRef<boolean>(false);
  const isLongPressActiveRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const currentPointerXRef = useRef<number | null>(null);
  const justFinishedDraggingRef = useRef<boolean>(false);
  const dragDistanceRef = useRef<number>(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // === PERF: Shadow refs for zero-rerender scrubbing (Direct DOM Manipulation) ===
  const activeHourIdxRef = useRef<number | null>(null);
  const highlightLine1Ref = useRef<SVGLineElement>(null);
  const highlightLine2Ref = useRef<SVGLineElement>(null);
  const timelineHighlightRef = useRef<HTMLDivElement>(null);
  const hudAnchorRef = useRef<'left' | 'right'>('right');

  // Column width tightened to 22-26px as requested
  const colWidth = 22;

  // Step for displaying hour labels, degree values, and weather icons (Every 2 hours)
  const hourStep = 2;

  // Unified step column condition: consistent across hour row, icons, temp values, wind values
  const isStepColumn = useCallback(
    (h: { hourNum: number }, i: number) => {
      if (i === 0) return true;
      if (i === 1 && hourStep > 1) return false;
      return h.hourNum % hourStep === 0;
    },
    [hourStep]
  );

  // Extract structured hours from weather (starting from midnight 00:00 of current day)
  const { hours, currentHourArrayIdx } = useMemo(() => {
    if (!weather?.hourly) return { hours: [], curIdx: -1, currentHourArrayIdx: -1 };

    const currentIdx = getCurrentHourIndex(weather.hourly.time, weather.timezone);
    if (currentIdx < 0) return { hours: [], curIdx: -1, currentHourArrayIdx: -1 };

    // Find midnight of current day by searching backward
    const currentDayKey = weather.hourly.time[currentIdx].split('T')[0];
    let midnightIdx = currentIdx;
    while (midnightIdx > 0 && weather.hourly.time[midnightIdx - 1]?.startsWith(currentDayKey)) {
      midnightIdx--;
    }

    const hoursCount = days * 24;
    const list = [];
    const startIdx = midnightIdx;
    const maxIdx = Math.min(startIdx + hoursCount, weather.hourly.time.length);
    let currentHourInArray = -1;

    let prevDayKey = '';

    for (let i = startIdx; i < maxIdx; i++) {
      const timeStr = weather.hourly.time[i];
      const date = new Date(timeStr);
      const dayKey = timeStr.split('T')[0];
      const isNewDay = i === currentIdx || dayKey !== prevDayKey;
      prevDayKey = dayKey;

      const hourNum = date.getHours();
      const hourStr = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      const dayName = date.toLocaleDateString('pl-PL', { weekday: 'short' });
      const fullDate = date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });

      // Option B: Weighted Optical Sun Index (0-100%)
      // High clouds (Cirrus) are ice crystals: block only ~20%
      // Mid clouds block ~70%
      // Low clouds (Stratus) block 100%
      const cLow = weather.hourly.cloud_cover_low?.[i] ?? 0;
      const cMid = weather.hourly.cloud_cover_mid?.[i] ?? 0;
      const cHigh = weather.hourly.cloud_cover_high?.[i] ?? 0;
      const isDayHour = weather.hourly.is_day[i] === 1;

      let sunPercent = 0;
      if (isDayHour) {
        const cloudObstruction = Math.min(100, Math.round(cLow * 1.0 + cMid * 0.7 + cHigh * 0.2));
        sunPercent = Math.max(0, Math.min(100, 100 - cloudObstruction));
      } else {
        sunPercent = 0;
      }

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
        isDay: isDayHour,
        windSpeed: Math.round(weather.hourly.windspeed_10m?.[i] ?? 0),
        windDir: Math.round(weather.hourly.winddirection_10m?.[i] ?? 0),
        windGusts: Math.round(weather.hourly.windgusts_10m?.[i] ?? weather.hourly.windspeed_10m?.[i] ?? 0),
        cloudCover: Math.round(weather.hourly.cloudcover?.[i] ?? 0),
        cloudCoverLow: Math.round(cLow),
        cloudCoverMid: Math.round(cMid),
        cloudCoverHigh: Math.round(cHigh),
        sunPercent,
        humidity: Math.round(weather.hourly.relativehumidity_2m?.[i] ?? 0),
        uvIndex: Math.round(weather.hourly.uv_index?.[i] ?? 0),
        pressure: Math.round(weather.hourly.surface_pressure?.[i] ?? 1013),
      });
      if (i === currentIdx) {
        currentHourInArray = list.length - 1;
      }
    }

    return { hours: list, curIdx: currentIdx, currentHourArrayIdx: currentHourInArray };
  }, [weather, days]);

  // Compute day-level summaries: Tmin, Tmax indices, precipitation sums, and jumper metadata
  const { daySummaryMap, dayMaxIndices, dayMinIndices, dayJumperDays } = useMemo(() => {
    const summaryMap = new Map<string, { maxTempIdx: number; minTempIdx: number; precipSum: number; firstHourIdx: number; date: Date; dayName: string }>();
    const maxIndices = new Set<number>();
    const minIndices = new Set<number>();
    const jumperList: { dayKey: string; label: string; firstHourIdx: number; date: Date }[] = [];

    if (hours.length === 0) {
      return { daySummaryMap: summaryMap, dayMaxIndices: maxIndices, dayMinIndices: minIndices, dayJumperDays: jumperList };
    }

    // Group hours by dayKey
    const byDay = new Map<string, number[]>();
    hours.forEach((h, idx) => {
      if (!byDay.has(h.dayKey)) {
        byDay.set(h.dayKey, []);
      }
      byDay.get(h.dayKey)!.push(idx);
    });

    let dayCount = 0;
    byDay.forEach((indices, dKey) => {
      let maxIdx = indices[0];
      let minIdx = indices[0];
      let pSum = 0;

      indices.forEach((idx) => {
        const h = hours[idx];
        pSum += h.precipAmount;
        if (h.temp > hours[maxIdx].temp) maxIdx = idx;
        if (h.temp < hours[minIdx].temp) minIdx = idx;
      });

      maxIndices.add(maxIdx);
      minIndices.add(minIdx);

      const firstH = hours[indices[0]];
      const capDayName = firstH.dayName.charAt(0).toUpperCase() + firstH.dayName.slice(1).replace('.', '');
      summaryMap.set(dKey, {
        maxTempIdx: maxIdx,
        minTempIdx: minIdx,
        precipSum: pSum,
        firstHourIdx: indices[0],
        date: firstH.date,
        dayName: capDayName,
      });

      jumperList.push({
        dayKey: dKey,
        label: dayCount === 0 ? 'Dziś' : capDayName,
        firstHourIdx: indices[0],
        date: firstH.date,
      });
      dayCount++;
    });

    return { daySummaryMap: summaryMap, dayMaxIndices: maxIndices, dayMinIndices: minIndices, dayJumperDays: jumperList };
  }, [hours]);

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

  // Group consecutive spans into Day and Night spans aligned EXACTLY with sunrise and sunset
  const exactDayNightSpans = useMemo(() => {
    if (hours.length === 0) return [];
    const totalW = hours.length * colWidth;
    if (sunEvents.length === 0) {
      return [{ isDay: hours[0]?.isDay ?? true, startX: 0, endX: totalW, width: totalW }];
    }

    const spans: { isDay: boolean; startX: number; endX: number; width: number }[] = [];
    
    // Determine whether the start (x=0) is day or night:
    // If first event is sunrise, then before it was NIGHT (isDay: false)
    // If first event is sunset, then before it was DAY (isDay: true)
    let curIsDay = sunEvents[0].type === 'sunrise' ? false : true;
    let curX = 0;

    for (const event of sunEvents) {
      const eventX = Math.max(0, Math.min(totalW, event.x));
      if (eventX > curX) {
        spans.push({
          isDay: curIsDay,
          startX: curX,
          endX: eventX,
          width: eventX - curX,
        });
      }
      curX = eventX;
      curIsDay = event.type === 'sunrise'; // After sunrise it's day; after sunset it's night
    }

    if (curX < totalW) {
      spans.push({
        isDay: curIsDay,
        startX: curX,
        endX: totalW,
        width: totalW - curX,
      });
    }

    return spans;
  }, [hours, colWidth, sunEvents]);

  // Golden Hour & Twilight window (±35 min around sunrise and sunset)
  const twilightSpans = useMemo(() => {
    const halfSpan = colWidth * 0.7; // ~42 minutes window
    return sunEvents.map((ev, idx) => ({
      idx,
      type: ev.type,
      x: ev.x,
      startX: Math.max(0, ev.x - halfSpan),
      width: halfSpan * 2,
    }));
  }, [sunEvents, colWidth]);

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

  // Strict landscape enforcement: always rotate 90deg when held in portrait
  const isRotated = isPortraitViewport;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Try native Screen Orientation Lock to landscape if available
    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch (_) {}

    const handleOrientationCheck = () => {
      setIsPortraitViewport(window.innerWidth < window.innerHeight);
    };
    window.addEventListener('resize', handleOrientationCheck);
    window.addEventListener('orientationchange', handleOrientationCheck);

    return () => {
      window.removeEventListener('resize', handleOrientationCheck);
      window.removeEventListener('orientationchange', handleOrientationCheck);
      try {
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      } catch (_) {}
    };
  }, []);

  // Auto-scroll to current hour ("Teraz") on mount (centered in viewport)
  useEffect(() => {
    if (currentHourArrayIdx >= 0 && scrollContainerRef.current) {
      const doScroll = () => {
        if (!scrollContainerRef.current) return;
        const containerW = scrollContainerRef.current.clientWidth || window.innerWidth;
        const targetScrollLeft = Math.max(0, currentHourArrayIdx * colWidth + colWidth / 2 - containerW / 2);
        scrollContainerRef.current.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      };
      requestAnimationFrame(doScroll);
      const timer = setTimeout(doScroll, 100);
      return () => clearTimeout(timer);
    }
  }, [currentHourArrayIdx, colWidth]);

  const closeHud = useCallback(() => {
    if (activeHourIdx === null || isClosingRef.current) return;
    setIsClosing(true);
    isClosingRef.current = true;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setActiveHourIdx(null);
      setIsClosing(false);
      isClosingRef.current = false;
      closeTimerRef.current = null;
    }, 200);
  }, [activeHourIdx]);

  // Direct DOM update for HUD content during scrubbing (zero React re-renders)
  const updateHudDOM = useCallback((idx: number) => {
    const h = hours[idx];
    if (!h || !hudRef.current) return;

    // Update highlight lines directly in SVG
    const x = (idx * colWidth + colWidth / 2).toString();
    if (highlightLine1Ref.current) {
      highlightLine1Ref.current.setAttribute('x1', x);
      highlightLine1Ref.current.setAttribute('x2', x);
      highlightLine1Ref.current.style.display = '';
    }
    if (highlightLine2Ref.current) {
      highlightLine2Ref.current.setAttribute('x1', x);
      highlightLine2Ref.current.setAttribute('x2', x);
      highlightLine2Ref.current.style.display = '';
    }

    // Update timeline highlight position
    if (timelineHighlightRef.current) {
      timelineHighlightRef.current.style.left = `${idx * colWidth}px`;
      timelineHighlightRef.current.style.width = `${colWidth}px`;
      timelineHighlightRef.current.style.display = '';
    }

    // Dynamic left/right anchoring via DOM
    if (scrollContainerRef.current) {
      const hourX = idx * colWidth + colWidth / 2;
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const viewportWidth = scrollContainerRef.current.clientWidth;
      const visibleX = hourX - scrollLeft;
      const newAnchor = visibleX > viewportWidth / 2 ? 'left' : 'right';
      if (hudAnchorRef.current !== newAnchor) {
        hudAnchorRef.current = newAnchor;
        if (newAnchor === 'left') {
          hudRef.current.style.left = '0.75rem';
          hudRef.current.style.right = 'auto';
        } else {
          hudRef.current.style.right = '0.75rem';
          hudRef.current.style.left = 'auto';
        }
      }
    }

    // Update HUD text content via data attributes and querySelector
    const hourTitle = h.isCurrent ? 'Teraz' : `${h.hourNum.toString().padStart(2, '0')}:00`;
    const dayNight = h.isDay ? 'Dzień' : 'Noc';

    const elTitle = hudRef.current.querySelector('[data-hud="hour-title"]');
    if (elTitle) elTitle.textContent = hourTitle;
    const elDayNight = hudRef.current.querySelector('[data-hud="day-night"]');
    if (elDayNight) elDayNight.textContent = dayNight;
    const elTemp = hudRef.current.querySelector('[data-hud="temp"]');
    if (elTemp) elTemp.textContent = `${h.temp}°`;
    const elApparent = hudRef.current.querySelector('[data-hud="apparent"]');
    if (elApparent) elApparent.textContent = `odcz. ${h.apparentTemp}°`;
    const elCelestialTitle = hudRef.current.querySelector('[data-hud="celestial-title"]');
    if (elCelestialTitle) elCelestialTitle.textContent = h.isDay ? 'Słońce' : 'Księżyc';

    const elSun = hudRef.current.querySelector('[data-hud="sun"]');
    if (elSun) {
      if (h.isDay) {
        elSun.textContent = `${h.sunPercent}%`;
        elSun.className = 'text-xs font-black text-amber-300 tabular-nums my-0.5';
      } else {
        const m = getMoonPhaseInfo(h.date);
        elSun.textContent = `${m.icon} ${m.percent}%`;
        elSun.className = 'text-xs font-black text-indigo-300 tabular-nums my-0.5';
      }
    }
    const elCloudLabel = hudRef.current.querySelector('[data-hud="cloud-label"]');
    if (elCloudLabel) {
      elCloudLabel.textContent = h.isDay ? `chmury ${h.cloudCover}%` : getMoonPhaseInfo(h.date).label;
    }
    const elPrecipAmt = hudRef.current.querySelector('[data-hud="precip-amt"]');
    if (elPrecipAmt) elPrecipAmt.textContent = h.precipAmount > 0 ? `${h.precipAmount.toFixed(1)} mm` : '0.0 mm';
    const elPrecipProb = hudRef.current.querySelector('[data-hud="precip-prob"]');
    if (elPrecipProb) elPrecipProb.textContent = `${h.precipProb}% szans`;
    const elWindSpeed = hudRef.current.querySelector('[data-hud="wind-speed"]');
    if (elWindSpeed) elWindSpeed.textContent = `${h.windSpeed} `;
    const elWindUnit = hudRef.current.querySelector('[data-hud="wind-unit"]');
    if (elWindUnit) elWindUnit.textContent = 'km/h';
    const elGust = hudRef.current.querySelector('[data-hud="gust"]');
    if (elGust) elGust.textContent = `por. ${h.windGusts} km/h`;
    const elHumidity = hudRef.current.querySelector('[data-hud="humidity"]');
    if (elHumidity) elHumidity.textContent = `${h.humidity}% `;
    const elPressure = hudRef.current.querySelector('[data-hud="pressure"]');
    if (elPressure) elPressure.textContent = `${h.pressure} hPa`;

    // Update wind direction arrow
    const elWindArrow = hudRef.current.querySelector('[data-hud="wind-arrow"]');
    if (elWindArrow) (elWindArrow as HTMLElement).style.transform = `rotate(${h.windDir + 180}deg)`;

    // Make HUD visible (in case it was hidden)
    hudRef.current.style.opacity = '1';
    hudRef.current.style.transform = 'translateY(0) scale(1)';
    hudRef.current.style.pointerEvents = 'auto';
  }, [hours, colWidth]);

  const openOrUpdateHud = useCallback((idx: number, isScrubMode = false) => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    isClosingRef.current = false;
    activeHourIdxRef.current = idx;
    
    if (isScrubMode) {
      // PERF: During scrubbing — only DOM manipulation, zero React re-renders
      updateHudDOM(idx);
      return;
    }

    // Normal click mode — update React state
    setIsClosing(false);
    
    // Dynamic left/right anchoring to avoid covering finger
    if (scrollContainerRef.current) {
      const hourX = idx * colWidth + colWidth / 2;
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const viewportWidth = scrollContainerRef.current.clientWidth;
      const visibleX = hourX - scrollLeft;
      const newAnchor = visibleX > viewportWidth / 2 ? 'left' : 'right';
      hudAnchorRef.current = newAnchor;
      setHudAnchor(newAnchor);
    }
    setActiveHourIdx(idx);
  }, [colWidth, updateHudDOM]);

  const scheduleAutoDismiss = useCallback((delayMs: number = 7000) => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }
    autoDismissTimerRef.current = setTimeout(() => {
      closeHud();
    }, delayMs);
  }, [closeHud]);

  const updateScrubPosition = useCallback((pointerCoord: number) => {
    if (!scrollContainerRef.current) return;
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const baseOffset = isRotated ? rect.top : rect.left;
    const relX = pointerCoord - baseOffset + scrollContainerRef.current.scrollLeft;
    const idx = Math.max(0, Math.min(hours.length - 1, Math.floor(relX / colWidth)));
    openOrUpdateHud(idx, true); // PERF: scrub mode = DOM only
  }, [colWidth, hours.length, openOrUpdateHud, isRotated]);

  const startEdgeAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current) return;
    const loop = () => {
      if (!scrollContainerRef.current || currentPointerXRef.current === null || !isScrubbingRef.current) {
        autoScrollRafRef.current = null;
        return;
      }
      const rect = scrollContainerRef.current.getBoundingClientRect();
      const pointerCoord = currentPointerXRef.current;
      const relViewportX = pointerCoord - (isRotated ? rect.top : rect.left);
      const dimension = isRotated ? rect.height : rect.width;
      const edgeThreshold = 45;
      let speed = 0;
      if (relViewportX < edgeThreshold && scrollContainerRef.current.scrollLeft > 0) {
        const factor = Math.max(0, Math.min(1, (edgeThreshold - relViewportX) / edgeThreshold));
        speed = -Math.max(2, Math.round(factor * 10));
      } else if (relViewportX > dimension - edgeThreshold) {
        const maxScroll = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
        if (scrollContainerRef.current.scrollLeft < maxScroll) {
          const factor = Math.max(0, Math.min(1, (relViewportX - (dimension - edgeThreshold)) / edgeThreshold));
          speed = Math.max(2, Math.round(factor * 10));
        }
      }
      if (speed !== 0) {
        scrollContainerRef.current.scrollLeft += speed;
        updateScrubPosition(pointerCoord);
      }
      autoScrollRafRef.current = requestAnimationFrame(loop);
    };
    autoScrollRafRef.current = requestAnimationFrame(loop);
  }, [updateScrubPosition, isRotated]);

  const stopEdgeAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const pointerX = isRotated ? touch.clientY : touch.clientX;
      const pointerY = isRotated ? touch.clientX : touch.clientY;

      touchStartPosRef.current = { x: pointerX, y: pointerY, time: Date.now() };
      isLongPressActiveRef.current = false;
      dragDistanceRef.current = 0;
      currentPointerXRef.current = pointerX;

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      longPressTimerRef.current = setTimeout(() => {
        isLongPressActiveRef.current = true;
        isScrubbingRef.current = true;
        setIsScrubbing(true);

        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(35);
          }
        } catch (_) {}

        // PERF: Initial HUD render needs React state to mount the HUD element
        // After this, scrubbing updates are DOM-only
        if (!scrollContainerRef.current) return;
        const rect = scrollContainerRef.current.getBoundingClientRect();
        const baseOffset = isRotated ? rect.top : rect.left;
        const relX = pointerX - baseOffset + scrollContainerRef.current.scrollLeft;
        const idx = Math.max(0, Math.min(hours.length - 1, Math.floor(relX / colWidth)));
        activeHourIdxRef.current = idx;
        if (scrollContainerRef.current) {
          const hourX = idx * colWidth + colWidth / 2;
          const scrollLeft = scrollContainerRef.current.scrollLeft;
          const viewportWidth = scrollContainerRef.current.clientWidth;
          const visibleX = hourX - scrollLeft;
          const newAnchor = visibleX > viewportWidth / 2 ? 'left' : 'right';
          hudAnchorRef.current = newAnchor;
          setHudAnchor(newAnchor);
        }
        setActiveHourIdx(idx);
        startEdgeAutoScroll();
      }, 200);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const pointerX = isRotated ? touch.clientY : touch.clientX;
      const pointerY = isRotated ? touch.clientX : touch.clientY;
      const dx = Math.abs(pointerX - touchStartPosRef.current.x);
      const dy = Math.abs(pointerY - touchStartPosRef.current.y);
      dragDistanceRef.current = Math.max(dragDistanceRef.current, dx);
      currentPointerXRef.current = pointerX;

      if (!isLongPressActiveRef.current) {
        if (dx > 7 || dy > 7) {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
        return;
      }

      if (e.cancelable) {
        e.preventDefault();
      }
      updateScrubPosition(pointerX);
    };

    const onTouchEnd = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (isLongPressActiveRef.current) {
        justFinishedDraggingRef.current = true;
        setTimeout(() => {
          justFinishedDraggingRef.current = false;
        }, 350);

        isLongPressActiveRef.current = false;
        isScrubbingRef.current = false;
        setIsScrubbing(false);

        // PERF: Sync React state from ref ONCE on touchend
        const finalIdx = activeHourIdxRef.current;
        if (finalIdx !== null) {
          if (scrollContainerRef.current) {
            const hourX = finalIdx * colWidth + colWidth / 2;
            const scrollLeft = scrollContainerRef.current.scrollLeft;
            const viewportWidth = scrollContainerRef.current.clientWidth;
            const visibleX = hourX - scrollLeft;
            const newAnchor = visibleX > viewportWidth / 2 ? 'left' : 'right';
            hudAnchorRef.current = newAnchor;
            setHudAnchor(newAnchor);
          }
          setActiveHourIdx(finalIdx);
        }
        scheduleAutoDismiss(7000);
      }

      currentPointerXRef.current = null;
      stopEdgeAutoScroll();
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      stopEdgeAutoScroll();
    };
  }, [updateScrubPosition, startEdgeAutoScroll, stopEdgeAutoScroll, scheduleAutoDismiss]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const startX = isRotated ? e.clientY : e.clientX;
    const startY = isRotated ? e.clientX : e.clientY;
    dragDistanceRef.current = 0;
    currentPointerXRef.current = startX;

    let isMouseLongPressActive = false;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    longPressTimerRef.current = setTimeout(() => {
      isMouseLongPressActive = true;
      isScrubbingRef.current = true;
      setIsScrubbing(true);
      updateScrubPosition(startX);
      startEdgeAutoScroll();
    }, 200);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentX = isRotated ? moveEvent.clientY : moveEvent.clientX;
      const currentY = isRotated ? moveEvent.clientX : moveEvent.clientY;
      const dx = Math.abs(currentX - startX);
      const dy = Math.abs(currentY - startY);
      dragDistanceRef.current = Math.max(dragDistanceRef.current, dx);
      currentPointerXRef.current = currentX;

      if (!isMouseLongPressActive) {
        if (dx > 8 || dy > 8) {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
        return;
      }

      updateScrubPosition(currentX);
    };

    const onMouseUp = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (isMouseLongPressActive) {
        justFinishedDraggingRef.current = true;
        setTimeout(() => {
          justFinishedDraggingRef.current = false;
        }, 350);
        isScrubbingRef.current = false;
        setIsScrubbing(false);

        // PERF: Sync React state from ref ONCE on mouseup
        const finalIdx = activeHourIdxRef.current;
        if (finalIdx !== null) {
          if (scrollContainerRef.current) {
            const hourX = finalIdx * colWidth + colWidth / 2;
            const scrollLeft = scrollContainerRef.current.scrollLeft;
            const viewportWidth = scrollContainerRef.current.clientWidth;
            const visibleX = hourX - scrollLeft;
            const newAnchor = visibleX > viewportWidth / 2 ? 'left' : 'right';
            hudAnchorRef.current = newAnchor;
            setHudAnchor(newAnchor);
          }
          setActiveHourIdx(finalIdx);
        }
        scheduleAutoDismiss(7000);
      }

      currentPointerXRef.current = null;
      stopEdgeAutoScroll();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };


  // Coordinate-based dismiss when tapping strictly outside the chart card
  useEffect(() => {
    if (activeHourIdx === null) return;
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (isScrubbingRef.current || justFinishedDraggingRef.current) return;
      if (hudRef.current) {
        const hRect = hudRef.current.getBoundingClientRect();
        if (
          e.clientX >= hRect.left &&
          e.clientX <= hRect.right &&
          e.clientY >= hRect.top &&
          e.clientY <= hRect.bottom
        ) {
          return; // Inside HUD, ignore
        }
      }
      closeHud();
    };
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDownOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [activeHourIdx, closeHud]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (autoScrollRafRef.current) cancelAnimationFrame(autoScrollRafRef.current);
    };
  }, []);

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

  // Discrete horizontal isotherm guide lines
  const minIso = Math.floor(stats.minTemp);
  const maxIso = Math.ceil(stats.maxTemp);
  const spanIso = maxIso - minIso;
  const stepIso = spanIso > 25 ? 10 : 5;
  const isotherms: { temp: number; y: number }[] = [];
  const startIso = Math.ceil(minIso / stepIso) * stepIso;
  for (let t = startIso; t <= maxIso; t += stepIso) {
    isotherms.push({ temp: t, y: getTempY(t) });
  }

  const tempSplineD = getSvgSpline(tempPoints);
  const firstX = tempPoints[0]?.x ?? 0;
  const lastX = tempPoints[tempPoints.length - 1]?.x ?? chartWidth;
  const tempAreaD = `${tempSplineD} L ${lastX.toFixed(1)} 104 L ${firstX.toFixed(1)} 104 Z`;

  // Apparent Temperature curve & ambient background (no text values, background only)
  const apparentPoints = hours.map((h, i) => ({
    x: i * colWidth + colWidth / 2,
    y: getTempY(h.apparentTemp),
  }));
  const apparentSplineD = getSvgSpline(apparentPoints);
  const apparentAreaD = `${apparentSplineD} L ${lastX.toFixed(1)} 104 L ${firstX.toFixed(1)} 104 Z`;

  // Chart 2: Wind, Gusts & Cloud Cover (viewBox height: 100)
  // Chart 2: Sun Intensity (Option B: 0-100% -> y: 86 (0%) to 16 (100%))
  const getSunY = (s: number) => {
    return 86 - (s / 100) * 70;
  };
  const sunPoints = hours.map((h, i) => ({
    x: i * colWidth + colWidth / 2,
    y: getSunY(h.sunPercent),
  }));
  const sunSplineD = getSvgSpline(sunPoints);
  const sunAreaD = `${sunSplineD} L ${lastX.toFixed(1)} 86 L ${firstX.toFixed(1)} 86 Z`;

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
      {/* Feature 7: Day Jumper - Floating horizontal thumb navigation bar */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 p-1 rounded-full bg-zinc-950/85 backdrop-blur-2xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.7)] pointer-events-auto select-none">
        {dayJumperDays.map((d, idx) => (
          <button
            key={d.dayKey}
            onClick={() => {
              if (scrollContainerRef.current) {
                const containerW = scrollContainerRef.current.clientWidth || window.innerWidth;
                const targetX = idx === 0 && currentHourArrayIdx >= 0
                  ? Math.max(0, currentHourArrayIdx * colWidth + colWidth / 2 - containerW / 2)
                  : Math.max(0, (d.firstHourIdx + 4) * colWidth - containerW / 3);
                scrollContainerRef.current.scrollTo({ left: targetX, behavior: 'smooth' });
                setActiveDayIndex(idx);
              }
            }}
            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono transition-all cursor-pointer ${
              activeDayIndex === idx
                ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50 shadow-xs scale-105'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Floating Close Button (Landscape Locked) */}
      <div className="absolute top-2 right-2 z-[60] flex items-center pointer-events-auto">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-full shadow-lg bg-zinc-900/70 hover:bg-zinc-800/90 backdrop-blur-xl border border-white/15 text-zinc-200 hover:text-white active:scale-95 transition-all cursor-pointer"
          title="Zamknij (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Scrollable Track (Both charts fit with maximum panoramic width) */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onScroll={(e) => {
          const scrollLeft = e.currentTarget.scrollLeft;
          const currentDayIdx = Math.floor((scrollLeft + 120) / (24 * colWidth));
          setActiveDayIndex(Math.max(0, Math.min(dayJumperDays.length - 1, currentDayIdx)));
        }}
        className="flex-1 min-h-0 overflow-x-auto overflow-y-auto px-2 pt-1.5 pb-8 flex flex-col [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full touch-pan-x cursor-ew-resize pr-12"
      >
        <div
          style={{ width: `${chartWidth}px`, minWidth: '100%' }}
          className="h-full flex flex-col justify-between gap-1.5"
        >
          {/* Lightweight Floating Cursor Pill HUD (glides directly along the active guide line) */}
          {activeHourIdx !== null && (() => {
            const activeHour = hours[activeHourIdx];
            if (!activeHour) return null;
            const hourTitle = activeHour.isCurrent ? 'Teraz' : `${activeHour.hourNum.toString().padStart(2, '0')}:00`;

            return (
              <div
                ref={hudRef}
                style={{
                  left: `${activeHourIdx * colWidth + colWidth / 2}px`,
                  transform: 'translateX(-50%)',
                }}
                className={`absolute top-[23px] z-50 px-3 py-1 rounded-full bg-zinc-950/92 border border-cyan-400/60 backdrop-blur-2xl shadow-[0_8px_28px_rgba(0,0,0,0.9)] flex items-center gap-2.5 transition-all duration-150 ease-out select-none pointer-events-auto whitespace-nowrap ${
                  isClosing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100 animate-in fade-in-0'
                }`}
              >
                {/* Downward pointer caret towards active vertical line */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-x-[4px] border-x-transparent border-t-[5px] border-t-cyan-400/80 pointer-events-none" />

                {/* Hour Badge */}
                <span
                  data-hud="hour-title"
                  className="px-1.5 py-0.5 rounded-full bg-cyan-500/25 border border-cyan-400/40 text-[9px] font-mono font-black text-cyan-300 uppercase tracking-wider"
                >
                  {hourTitle}
                </span>

                {/* Weather Icon */}
                <WeatherIcon code={activeHour.weathercode} isDay={activeHour.isDay} size={15} glow={false} />

                {/* Temperature & Apparent */}
                <div className="flex items-baseline gap-1">
                  <strong data-hud="temp" className="text-xs font-black text-white">{activeHour.temp}°</strong>
                  <span data-hud="apparent" className="text-[8px] text-zinc-400 font-medium">odcz. {activeHour.apparentTemp}°</span>
                </div>

                <div className="w-px h-3.5 bg-white/15" />

                {/* Wind & Gusts */}
                <div className="flex items-center gap-1 text-[8.5px] text-emerald-300 font-medium">
                  <Wind size={10} className="text-emerald-400 shrink-0" />
                  <span className="font-bold tabular-nums">
                    <span data-hud="wind-speed">{activeHour.windSpeed} </span><span data-hud="wind-unit" className="text-[7.5px] font-normal text-zinc-400">km/h</span>
                  </span>
                  <span data-hud="gust" className="text-[7.5px] text-emerald-400/80 font-normal tabular-nums">
                    por. {activeHour.windGusts}
                  </span>
                </div>

                <div className="w-px h-3.5 bg-white/15" />

                {/* Precipitation */}
                <div className="flex items-center gap-1 text-[8.5px] text-cyan-300 font-medium">
                  <Droplets size={10} className="text-cyan-400 shrink-0" />
                  <span data-hud="precip-amt" className="font-bold tabular-nums">
                    {activeHour.precipAmount > 0 ? `${activeHour.precipAmount.toFixed(1)} mm` : '0.0 mm'}
                  </span>
                  <span data-hud="precip-prob" className="text-[7.5px] text-cyan-300/80 font-normal tabular-nums">
                    {activeHour.precipProb}%
                  </span>
                </div>

                <div className="w-px h-3.5 bg-white/15" />

                {/* Sun / Moon celestial info */}
                <div className="flex items-center gap-1 text-[8.5px] text-amber-300 font-medium">
                  {activeHour.isDay ? <Sun size={10} className="text-amber-400 shrink-0" /> : <Moon size={10} className="text-indigo-400 shrink-0" />}
                  <span
                    data-hud="sun"
                    className="font-bold tabular-nums"
                  >
                    {activeHour.isDay ? `${activeHour.sunPercent}%` : `${getMoonPhaseInfo(activeHour.date).percent}%`}
                  </span>
                </div>

                {/* Hidden tags for DOM selector compatibility */}
                <span data-hud="day-night" className="hidden" />
                <span data-hud="celestial-title" className="hidden" />
                <span data-hud="cloud-label" className="hidden" />
                <span data-hud="humidity" className="hidden" />
                <span data-hud="pressure" className="hidden" />
                <span data-hud="wind-arrow" className="hidden" />

                {/* Close button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeHud();
                  }}
                  className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer ml-0.5 shrink-0"
                  title="Zamknij"
                >
                  <X size={8} strokeWidth={2.5} />
                </button>
              </div>
            );
          })()}

          {/* Single-Row Timeline (compact ~20px) */}
          <div
            className="shrink-0 h-[20px] relative overflow-hidden rounded-lg border border-white/10 select-none bg-zinc-950/60 shadow-xs"
            style={{ width: `${chartWidth}px` }}
          >
            {/* Exact Day and Night Background Bands on the timeline */}
            <div className="absolute inset-0 flex pointer-events-none">
              {exactDayNightSpans.map((span, idx) => (
                <div
                  key={`time-span-${idx}`}
                  style={{
                    position: 'absolute',
                    left: `${span.startX}px`,
                    width: `${span.width}px`,
                    height: '100%',
                  }}
                  className={`border-b transition-colors ${
                    span.isDay
                      ? 'bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-amber-500/20 border-amber-400/40'
                      : 'bg-gradient-to-r from-indigo-950/85 via-slate-950/90 to-indigo-950/85 border-indigo-400/30'
                  }`}
                />
              ))}
            </div>

            {/* Twilight / Golden Hour spans on timeline */}
            {twilightSpans.map((tw, idx) => (
              <div
                key={`time-twilight-${idx}`}
                style={{
                  position: 'absolute',
                  left: `${tw.startX}px`,
                  width: `${tw.width}px`,
                  height: '100%',
                }}
                className={`pointer-events-none ${
                  tw.type === 'sunrise'
                    ? 'bg-gradient-to-r from-indigo-950/60 via-rose-500/35 to-amber-500/20'
                    : 'bg-gradient-to-r from-amber-500/20 via-orange-500/35 to-indigo-950/60'
                }`}
              />
            ))}

            {/* Exact Sunrise / Sunset vertical dashed lines on timeline */}
            {sunEvents.map((event, idx) => (
              <div
                key={`time-sun-${idx}`}
                style={{ left: `${event.x}px` }}
                className={`absolute top-0 bottom-0 w-px border-l border-dashed pointer-events-none z-10 ${
                  event.type === 'sunrise' ? 'border-amber-400/80' : 'border-orange-400/80'
                }`}
              />
            ))}

            {/* Scrub highlight overlay (ref-based for perf) */}
            <div
              ref={timelineHighlightRef}
              className="absolute top-0 bottom-0 bg-cyan-500/35 border border-cyan-400 z-30 shadow-[0_0_8px_rgba(34,211,238,0.6)] rounded-sm pointer-events-none"
              style={{
                display: activeHourIdx !== null && isScrubbing ? '' : 'none',
                left: activeHourIdx !== null ? `${activeHourIdx * colWidth}px` : 0,
                width: `${colWidth}px`,
              }}
            />

            {/* Single-Row Grid of Hours with centered date labels */}
            <div
              className="absolute inset-0 grid items-center text-center"
              style={{ gridTemplateColumns: `repeat(${hours.length}, ${colWidth}px)` }}
            >
              {hours.map((h, i) => {
                const isSelected = activeHourIdx === i;
                const isStep = isStepColumn(h, i);
                const showDateLabel = h.hourNum === 12;
                // Leave hours 11, 12, 13 clean for the centered date badge
                const isNearDateLabel = h.hourNum === 11 || h.hourNum === 12 || h.hourNum === 13;
                const showLabel = !isNearDateLabel && (isStep || h.isCurrent || isSelected);

                // Format: "Pt 11.09" (Compact format so it fits cleanly in single row)
                const dayCap = h.dayName.charAt(0).toUpperCase() + h.dayName.slice(1).replace('.', '');
                const dateLabel = showDateLabel
                  ? `${dayCap} ${h.date.getDate().toString().padStart(2, '0')}.${(h.date.getMonth() + 1).toString().padStart(2, '0')}`
                  : '';

                return (
                  <div
                    key={h.idx}
                    data-testid={`hour-btn-${i}`}
                    className="flex items-center justify-center h-full relative cursor-pointer"
                    onClick={() => openOrUpdateHud(i)}
                  >
                    {/* Active selection outline */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-cyan-500/35 border border-cyan-400 z-20 shadow-[0_0_8px_rgba(34,211,238,0.6)] rounded-sm" />
                    )}
                    {h.isCurrent && !isSelected && (
                      <div className="absolute inset-0 bg-blue-500/20 border-b-2 border-blue-400 z-10 rounded-sm" />
                    )}

                    {/* Centered Date Label at hour 12 (Single Row, clean, rain sum moved to precipitation) */}
                    {showDateLabel && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap z-25 flex items-center px-2 py-0.5 rounded-md bg-zinc-950/85 border border-amber-400/40 text-[8px] font-mono tracking-wide leading-none backdrop-blur-md shadow-xs pointer-events-none"
                      >
                        <span className="font-black text-amber-200">{dateLabel}</span>
                      </div>
                    )}

                    {/* Standard hour label */}
                    <span
                      className={`font-mono tabular-nums leading-none z-20 ${
                        isSelected
                          ? 'text-white font-black text-[9px]'
                          : h.isCurrent
                          ? 'text-cyan-300 font-black text-[8px]'
                          : showLabel
                          ? h.isDay
                            ? 'text-amber-100 font-bold text-[8px]'
                            : 'text-blue-100 font-medium text-[8px]'
                          : 'text-zinc-500/50 text-[6px]'
                      }`}
                    >
                      {h.isCurrent
                        ? 'Teraz'
                        : isNearDateLabel
                        ? ''
                        : showLabel
                        ? h.hourNum.toString().padStart(2, '0')
                        : '·'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WYKRES 1: TEMPERATURA & OPADY (flex-1) */}
            <div className="flex-1 min-h-0 rounded-xl bg-zinc-900/40 border border-white/10 py-2 flex flex-col relative shadow-md">
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
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
                    <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.04" />
                  </linearGradient>

                  {/* Night ambient background gradient */}
                  <linearGradient id="landscapeNightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#020617" stopOpacity="0.95" />
                    <stop offset="50%" stopColor="#0a1128" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0.75" />
                  </linearGradient>

                  {/* Temperature line gradient */}
                  <linearGradient id="landscapeTempLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    {hours.map((h, i) => {
                      const pct = ((i + 0.5) / hours.length) * 100;
                      return <stop key={i} offset={`${pct.toFixed(1)}%`} stopColor={getSmoothTempColor(h.temp)} />;
                    })}
                  </linearGradient>

                  {/* Subtle Neomorphic dual shadow filter for elevated temperature curve */}
                  <filter id="landscapeTempNeomorphicShadow" x="-10%" y="-30%" width="120%" height="180%">
                    <feDropShadow dx="0" dy="2.6" stdDeviation="2.4" floodColor="#000000" floodOpacity="0.6" />
                    <feDropShadow dx="0" dy="1.0" stdDeviation="0.8" floodColor="#09090b" floodOpacity="0.4" />
                  </filter>

                  {/* Temperature area glow gradient */}
                  <linearGradient id="landscapeTempAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
                    <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>

                  {/* Apparent temperature ambient fill gradient */}
                  <linearGradient id="landscapeApparentAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.14" />
                    <stop offset="60%" stopColor="#c084fc" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                  </linearGradient>

                  {/* Rain bar vertical gradient */}
                  <linearGradient id="landscapeRainBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>

                {/* Day and Night Background Shading Bands */}
                {exactDayNightSpans.map((span, idx) => (
                  <rect
                    key={`span-1-${idx}`}
                    x={span.startX}
                    y={0}
                    width={span.width}
                    height={110}
                    fill={span.isDay ? 'url(#landscapeDayGrad)' : 'url(#landscapeNightGrad)'}
                  />
                ))}

                {/* Twilight / Golden Hour ambient glow bands in SVG 1 */}
                {twilightSpans.map((tw, idx) => (
                  <rect
                    key={`twilight-1-${idx}`}
                    x={tw.startX}
                    y={0}
                    width={tw.width}
                    height={110}
                    fill={tw.type === 'sunrise' ? 'url(#landscapeDawnGrad)' : 'url(#landscapeDuskGrad)'}
                    className="pointer-events-none"
                  />
                ))}

                {/* Discrete Horizontal Isotherm Guide Lines */}
                {isotherms.map((iso) => (
                  <g key={`iso-line-${iso.temp}`}>
                    <line
                      x1={0}
                      y1={iso.y}
                      x2={chartWidth}
                      y2={iso.y}
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeDasharray="2 4"
                      strokeWidth="0.75"
                      className="pointer-events-none"
                    />
                    <text
                      x={6}
                      y={iso.y - 1.5}
                      fill="rgba(255, 255, 255, 0.35)"
                      fontSize="6.5"
                      fontWeight="bold"
                      className="select-none font-mono pointer-events-none"
                    >
                      {iso.temp}°
                    </text>
                  </g>
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
                    <g key={`sep-${i}`}>
                      <line
                        x1={i * colWidth}
                        y1={0}
                        x2={i * colWidth}
                        y2={110}
                        stroke="rgba(255,255,255,0.16)"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      {/* Isotherm scale on day boundary */}
                      {isotherms.map((iso) => (
                        <text
                          key={`sep-iso-${i}-${iso.temp}`}
                          x={i * colWidth + 5}
                          y={iso.y - 1.5}
                          fill="rgba(255, 255, 255, 0.28)"
                          fontSize="6"
                          fontWeight="bold"
                          className="select-none font-mono pointer-events-none"
                        >
                          {iso.temp}°
                        </text>
                      ))}
                    </g>
                  );
                })}

                {/* Sunrise & Sunset Vertical Guide Lines (Background) */}
                {sunEvents.map((event, idx) => {
                  const isSunrise = event.type === 'sunrise';
                  const color = isSunrise ? '#fbbf24' : '#fb923c';
                  return (
                    <line
                      key={`sun-line-1-${idx}`}
                      x1={event.x}
                      y1={0}
                      x2={event.x}
                      y2={110}
                      stroke={color}
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      strokeOpacity="0.45"
                      className="pointer-events-none"
                    />
                  );
                })}

                {/* Glowing Vertical Guide Line for 'Teraz' in Chart 1 */}
                {(() => {
                  const curHour = hours.find((h) => h.isCurrent);
                  if (!curHour) return null;
                  const curX = hours.indexOf(curHour) * colWidth + colWidth / 2;
                  return (
                    <line
                      x1={curX}
                      y1={0}
                      x2={curX}
                      y2={110}
                      stroke="#06b6d4"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      strokeOpacity="0.75"
                      className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] pointer-events-none"
                    />
                  );
                })()}

                {/* Active Hour Guide Line (ref-based for perf) */}
                <line
                  ref={highlightLine1Ref}
                  x1={activeHourIdx !== null ? activeHourIdx * colWidth + colWidth / 2 : 0}
                  y1={0}
                  x2={activeHourIdx !== null ? activeHourIdx * colWidth + colWidth / 2 : 0}
                  y2={110}
                  stroke="#22d3ee"
                  strokeWidth="1.8"
                  strokeDasharray="3 2"
                  className="drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]"
                  style={{ display: activeHourIdx !== null ? '' : 'none' }}
                />

                {/* Apparent Temperature: Soft ambient background fill (no values, background only) */}
                <path d={apparentAreaD} fill="url(#landscapeApparentAreaGrad)" className="pointer-events-none" />

                {/* Apparent Temperature: Subtle dashed guide curve */}
                <path
                  d={apparentSplineD}
                  fill="none"
                  stroke="rgba(167, 139, 250, 0.45)"
                  strokeWidth="1.6"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                />

                {/* Temperature Area Glow */}
                <path d={tempAreaD} fill="url(#landscapeTempAreaGrad)" />

                {/* Soft ambient thermal under-glow reflecting on glass */}
                <path
                  d={tempSplineD}
                  fill="none"
                  stroke="url(#landscapeTempLineGrad)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.18"
                  className="pointer-events-none"
                />

                {/* Temperature Spline Curve with Neomorphic Dual Shadow */}
                <path
                  d={tempSplineD}
                  fill="none"
                  stroke="url(#landscapeTempLineGrad)"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#landscapeTempNeomorphicShadow)"
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
                    onClick={() => openOrUpdateHud(idx)}
                  />
                ))}

                {/* Temperature Nodes & Degree Values with Tmin/Tmax Extremes & Pulsing 'Teraz' */}
                {tempPoints.map((p, idx) => {
                  const h = hours[idx];
                  const isSelected = activeHourIdx === idx;
                  const isCurrent = h.isCurrent;
                  const isDayMax = dayMaxIndices.has(idx);
                  const isDayMin = dayMinIndices.has(idx);
                  const tColor = getSmoothTempColor(h.temp);

                  // Collision avoidance: if close to a sunrise/sunset badge, place temp label below to avoid overlap
                  const nearSunEvent = sunEvents.some(ev => Math.abs(p.x - ev.x) < 22 && p.y < 25);
                  const textY = nearSunEvent ? p.y + 11.5 : p.y - 5;

                  return (
                    <g key={`temp-node-${idx}`} className="cursor-pointer pointer-events-auto" onClick={() => openOrUpdateHud(idx)}>
                      {/* Active click selection ring */}
                      {isSelected && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="7.5"
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="2"
                          className="animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]"
                        />
                      )}

                      {/* Pulsing 'Teraz' Neon Dot on current hour (animate-pulse for stationary glow, no drift) */}
                      {isCurrent && !isSelected && (
                        <>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="6"
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="1.5"
                            className="animate-pulse"
                          />
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="3.5"
                            fill="#06b6d4"
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            className="drop-shadow-[0_0_8px_rgba(34,211,238,0.95)]"
                          />
                        </>
                      )}

                      {/* Tmax Extreme Halo (Day Peak) */}
                      {isDayMax && !isCurrent && !isSelected && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="6.5"
                          fill="rgba(245, 158, 11, 0.25)"
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          className="animate-pulse"
                        />
                      )}

                      {/* Tmin Extreme Halo (Night Trough) */}
                      {isDayMin && !isCurrent && !isSelected && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="6.5"
                          fill="rgba(56, 189, 248, 0.25)"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                          className="animate-pulse"
                        />
                      )}

                      {/* Regular Node Circle */}
                      {!isCurrent && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isSelected ? 3.8 : isDayMax || isDayMin ? 3.2 : 2}
                          fill={isSelected ? '#22d3ee' : isDayMax ? '#f59e0b' : isDayMin ? '#38bdf8' : tColor}
                          stroke="#09090b"
                          strokeWidth="1"
                        />
                      )}

                      {/* Degree Labels with Badges for Extremes and Current */}
                      {isDayMax ? (
                        <g className="select-none pointer-events-none">
                          <rect
                            x={p.x - 13}
                            y={nearSunEvent ? p.y + 4 : p.y - 17}
                            width="26"
                            height="10"
                            rx="2.5"
                            fill="rgba(245, 158, 11, 0.95)"
                            stroke="#fbbf24"
                            strokeWidth="0.6"
                            className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]"
                          />
                          <text
                            x={p.x}
                            y={nearSunEvent ? p.y + 11.5 : p.y - 9.5}
                            fill="#ffffff"
                            fontSize="7"
                            fontWeight="900"
                            textAnchor="middle"
                            className="font-mono font-black"
                          >
                            ▲{h.temp}°
                          </text>
                        </g>
                      ) : isDayMin ? (
                        <g className="select-none pointer-events-none">
                          <rect
                            x={p.x - 13}
                            y={nearSunEvent ? p.y + 4 : p.y - 17}
                            width="26"
                            height="10"
                            rx="2.5"
                            fill="rgba(14, 165, 233, 0.95)"
                            stroke="#7dd3fc"
                            strokeWidth="0.6"
                            className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]"
                          />
                          <text
                            x={p.x}
                            y={nearSunEvent ? p.y + 11.5 : p.y - 9.5}
                            fill="#ffffff"
                            fontSize="7"
                            fontWeight="900"
                            textAnchor="middle"
                            className="font-mono font-black"
                          >
                            ▼{h.temp}°
                          </text>
                        </g>
                      ) : isCurrent ? (
                        <g className="select-none pointer-events-none">
                          <rect
                            x={p.x - 14}
                            y={nearSunEvent ? p.y + 4 : p.y - 18}
                            width="28"
                            height="11"
                            rx="3"
                            fill="#0891b2"
                            stroke="#67e8f9"
                            strokeWidth="0.8"
                            className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
                          />
                          <text
                            x={p.x}
                            y={nearSunEvent ? p.y + 12 : p.y - 9.5}
                            fill="#ffffff"
                            fontSize="7"
                            fontWeight="900"
                            textAnchor="middle"
                            className="font-mono font-black"
                          >
                            {h.temp}°
                          </text>
                        </g>
                      ) : (
                        <text
                          x={p.x}
                          y={textY}
                          fill={isSelected ? '#22d3ee' : '#ffffff'}
                          fontSize={isSelected ? '9' : '8'}
                          fontWeight="bold"
                          textAnchor="middle"
                          className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] select-none font-mono font-bold"
                        >
                          {h.temp}°
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Precipitation Bars & Probability Columns (Clean, zero clutter) */}
                {/* 1. Translucent Probability Bars (when probability >= 15%) */}
                {hours.map((h, idx) => {
                  if (h.precipProb < 15) return null;
                  const p = tempPoints[idx];
                  const probWidth = Math.max(6, colWidth - 4);
                  const probH = Math.max(3, Math.min(20, Math.round((h.precipProb / 100) * 18)));
                  const probY = 104 - probH;

                  return (
                    <rect
                      key={`prob-bg-${idx}`}
                      x={p.x - probWidth / 2}
                      y={probY}
                      width={probWidth}
                      height={probH}
                      rx="1.5"
                      fill="rgba(56, 189, 248, 0.14)"
                      stroke="rgba(56, 189, 248, 0.25)"
                      strokeWidth="0.5"
                      className="pointer-events-none"
                    />
                  );
                })}

                {/* 2. Solid Precipitation Volume Bars [mm] with mm label on top */}
                {hours.map((h, idx) => {
                  if (h.precipAmount <= 0) return null;

                  const p = tempPoints[idx];
                  const solidWidth = Math.max(6, Math.min(10, colWidth - 8));
                  const maxRain = Math.max(1.5, stats.maxRain);
                  const barH = Math.max(4, Math.min(26, Math.round((h.precipAmount / maxRain) * 24)));
                  const barY = 104 - barH;
                  const isSnow =
                    (h.weathercode >= 71 && h.weathercode <= 77) ||
                    (h.weathercode >= 85 && h.weathercode <= 86);

                  return (
                    <g key={`precip-bar-${idx}`} className="cursor-pointer pointer-events-auto" onClick={() => openOrUpdateHud(idx)}>
                      <rect
                        x={p.x - solidWidth / 2}
                        y={barY}
                        width={solidWidth}
                        height={barH}
                        rx="1.5"
                        fill={isSnow ? '#93c5fd' : 'url(#landscapeRainBarGrad)'}
                        fillOpacity={isSnow ? '0.9' : '0.95'}
                        stroke="#0ea5e9"
                        strokeWidth="0.5"
                      />
                      <text
                        x={p.x}
                        y={barY - 2}
                        fill="#67e8f9"
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="font-mono select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                      >
                        {h.precipAmount.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Discrete Daily Precipitation Sum centered at hour 12 */}
                {hours.map((h, idx) => {
                  if (h.hourNum !== 12) return null;
                  const dayPrecip = daySummaryMap.get(h.dayKey)?.precipSum ?? 0;
                  if (dayPrecip <= 0.1) return null;
                  const p = tempPoints[idx];
                  return (
                    <g key={`day-precip-sum-${idx}`} className="pointer-events-none select-none">
                      <rect
                        x={p.x - 18}
                        y={88}
                        width={36}
                        height={12}
                        rx={3}
                        fill="rgba(8, 47, 73, 0.92)"
                        stroke="rgba(56, 189, 248, 0.55)"
                        strokeWidth="0.8"
                        className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]"
                      />
                      <text
                        x={p.x}
                        y={96.5}
                        fill="#38bdf8"
                        fontSize="7"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="font-mono font-bold"
                      >
                        💧{dayPrecip.toFixed(1)}mm
                      </text>
                    </g>
                  );
                })}

                {/* Sunrise & Sunset Badges (Rendered LAST so they are always on top and never occluded by temperature) */}
                {sunEvents.map((event, idx) => {
                  const isSunrise = event.type === 'sunrise';
                  const color = isSunrise ? '#fbbf24' : '#fb923c';
                  const badgeX = Math.max(22, Math.min(chartWidth - 22, event.x));
                  const closestHourIdx = Math.max(0, Math.min(hours.length - 1, Math.round(event.x / colWidth)));

                  return (
                    <g
                      key={`sun-badge-top-${idx}`}
                      className="cursor-pointer pointer-events-auto select-none group"
                      onClick={() => openOrUpdateHud(closestHourIdx)}
                    >
                      <rect
                        x={badgeX - 18}
                        y={2}
                        width={36}
                        height={12}
                        rx={6}
                        fill={isSunrise ? '#451a03' : '#270e06'}
                        fillOpacity="0.98"
                        stroke={color}
                        strokeWidth="1"
                        className="drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] transition-transform group-hover:scale-105"
                      />
                      <circle cx={badgeX - 11} cy={8} r={2.2} fill={color} />
                      <text
                        x={badgeX + 3}
                        y={11.5}
                        fill={isSunrise ? '#fef08a' : '#fed7aa'}
                        fontSize="7.5"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="font-mono font-bold select-none"
                      >
                        {isSunrise ? `↑${event.timeStr}` : `↓${event.timeStr}`}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* WYKRES 2: WIATR, PORYWY & NASŁONECZNIENIE (flex-1) */}
          <div className="flex-1 min-h-0 rounded-xl bg-zinc-900/40 border border-white/10 py-2 flex flex-col relative shadow-md">
            {/* Sticky Corner Badge (always pinned at left edge during horizontal scroll) */}
            <div className="sticky left-2 top-0 z-10 flex items-center gap-1.5 pointer-events-none self-start -mb-6">
              <span className="text-[10px] font-bold text-amber-300/90 bg-zinc-950/85 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-amber-400/25 flex items-center gap-1.5 shadow-md">
                <Sun size={11} className="text-amber-400 shrink-0" />
                <span>Słońce, wiatr & porywy</span>
              </span>
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
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
                    <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.04" />
                  </linearGradient>

                  {/* Night ambient background gradient */}
                  <linearGradient id="landscapeNightGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#020617" stopOpacity="0.95" />
                    <stop offset="50%" stopColor="#0a1128" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0.75" />
                  </linearGradient>

                  {/* Linear gradient for Sun / Solar Intensity Area */}
                  <linearGradient id="landscapeSunAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0.02" />
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
                {exactDayNightSpans.map((span, idx) => (
                  <rect
                    key={`span-2-${idx}`}
                    x={span.startX}
                    y={0}
                    width={span.width}
                    height={100}
                    fill={span.isDay ? 'url(#landscapeDayGrad2)' : 'url(#landscapeNightGrad2)'}
                  />
                ))}

                {/* Twilight / Golden Hour ambient glow bands in SVG 2 */}
                {twilightSpans.map((tw, idx) => (
                  <rect
                    key={`twilight-2-${idx}`}
                    x={tw.startX}
                    y={0}
                    width={tw.width}
                    height={100}
                    fill={tw.type === 'sunrise' ? 'url(#landscapeDawnGrad2)' : 'url(#landscapeDuskGrad2)'}
                    className="pointer-events-none"
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

                {/* Sun Guide Line (100% and 50%) */}
                <line x1="0" y1="16" x2={chartWidth} y2="16" stroke="rgba(251,191,36,0.2)" strokeDasharray="2 2" />
                <text x="4" y="13.5" fill="rgba(251,191,36,0.65)" fontSize="6.5" fontWeight="bold" className="select-none font-mono">100% słońca</text>
                <line x1="0" y1="48" x2={chartWidth} y2="48" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 2" />
                <text x="4" y="45.5" fill="rgba(255,255,255,0.2)" fontSize="6" fontWeight="medium" className="select-none font-mono">50%</text>

                {/* Active Hour Guide Line (ref-based for perf) */}
                <line
                  ref={highlightLine2Ref}
                  x1={activeHourIdx !== null ? activeHourIdx * colWidth + colWidth / 2 : 0}
                  y1={0}
                  x2={activeHourIdx !== null ? activeHourIdx * colWidth + colWidth / 2 : 0}
                  y2={100}
                  stroke="#22d3ee"
                  strokeWidth="1.8"
                  strokeDasharray="3 2"
                  className="drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]"
                  style={{ display: activeHourIdx !== null ? '' : 'none' }}
                />

                {/* Glowing Vertical Guide Line for 'Teraz' in Chart 2 (Feature 8) */}
                {(() => {
                  const curHour = hours.find((h) => h.isCurrent);
                  if (!curHour) return null;
                  const curX = hours.indexOf(curHour) * colWidth + colWidth / 2;
                  return (
                    <line
                      x1={curX}
                      y1={0}
                      x2={curX}
                      y2={100}
                      stroke="#06b6d4"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      strokeOpacity="0.75"
                      className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] pointer-events-none"
                    />
                  );
                })()}



                {/* Sun Intensity Area & Spline: Warm Golden Solar Profile (Option B: Weighted Optical Sun Index) */}
                <path d={sunAreaD} fill="url(#landscapeSunAreaGrad)" />
                <path
                  d={sunSplineD}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] pointer-events-none"
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
                    onClick={() => openOrUpdateHud(idx)}
                  />
                ))}

                {/* Wind Gusts: Dynamic Color-Scale Dashes & Values */}
                {windPoints.map((p, idx) => {
                  const h = hours[idx];
                  const isSelected = activeHourIdx === idx;
                  // Show gust marker for every hour with gust data
                  const hasGust = h.windGusts > h.windSpeed || h.windGusts >= 8;
                  if (!hasGust && !isSelected) return null;

                  const gustY = getWindY(h.windGusts);
                  const showGustNum = true;
                  const halfWidth = 4.5;
                  const gustColor = getSmoothWindColor(h.windGusts);

                  return (
                    <g key={`gust-${idx}`} className="cursor-pointer pointer-events-auto" onClick={() => openOrUpdateHud(idx)}>
                      {/* Wind Flare: Energy flare polygon connecting baseline wind point to gust */}
                      {h.windGusts > h.windSpeed + 2 && (
                        <polygon
                          points={`${p.x - 3.5},${gustY} ${p.x + 3.5},${gustY} ${p.x + 1},${p.y} ${p.x - 1},${p.y}`}
                          fill="url(#landscapeWindFlareGrad)"
                          className="pointer-events-none"
                        />
                      )}

                      {/* Whisker connecting wind speed point to gust tick */}
                      <line
                        x1={p.x}
                        y1={p.y}
                        x2={p.x}
                        y2={gustY}
                        stroke={isSelected ? '#22d3ee' : gustColor}
                        strokeWidth="1"
                        strokeDasharray="1.5 1.5"
                        strokeOpacity="0.45"
                      />
                      {/* Horizontal gust dash in dynamic color scale */}
                      <line
                        x1={p.x - halfWidth}
                        y1={gustY}
                        x2={p.x + halfWidth}
                        y2={gustY}
                        stroke={isSelected ? '#22d3ee' : gustColor}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                      />
                      {/* Numerical gust value colored in scale */}
                      {showGustNum && (
                        <text
                          x={p.x}
                          y={gustY - 3}
                          fill={isSelected ? '#22d3ee' : gustColor}
                          fontSize="7"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="font-mono select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
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

                {/* Wind Speed Points & ALL Numbers (Every single hour has its value) */}
                {windPoints.map((p, idx) => {
                  const h = hours[idx];
                  const isSelected = activeHourIdx === idx;
                  const isCurrent = h.isCurrent;
                  const wColor = getSmoothWindColor(h.windSpeed);

                  return (
                    <g key={`wind-${idx}`} className="cursor-pointer pointer-events-auto" onClick={() => openOrUpdateHud(idx)}>
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
                      {/* Full display: show speed for every single hour */}
                      <text
                        x={p.x}
                        y={p.y + 9}
                        fill={isSelected ? '#22d3ee' : '#6ee7b7'}
                        fontSize={isSelected ? '8.5' : '7.5'}
                        fontWeight="bold"
                        textAnchor="middle"
                        className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] select-none font-mono font-bold"
                      >
                        {h.windSpeed}
                      </text>
                    </g>
                  );
                })}

                {/* Wind Direction Miniature Arrows along bottom track (y = 92) - displayed on EVERY hour */}
                {hours.map((h, idx) => {
                  const p = windPoints[idx];
                  const isSelected = activeHourIdx === idx;

                  return (
                    <g
                      key={`arrow-${idx}`}
                      transform={`translate(${p.x}, 92) rotate(${h.windDir + 180})`}
                      className="cursor-pointer pointer-events-auto"
                      onClick={() => openOrUpdateHud(idx)}
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
