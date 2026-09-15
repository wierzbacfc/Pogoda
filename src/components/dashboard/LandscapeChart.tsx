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
  ChevronLeft,
  ChevronRight,
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

// Crisp, tight Cardinal-Hermite Spline for Solar Profiles (tension 0.10 ensures crisp, realistic data tracking)
function getTightSunSpline(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (n === 2) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;

  const dx: number[] = [];
  const dy: number[] = [];
  const m: number[] = [];
  for (let k = 0; k < n - 1; k++) {
    const dX = points[k + 1].x - points[k].x;
    const dY = points[k + 1].y - points[k].y;
    dx.push(dX);
    dy.push(dY);
    m.push(dX === 0 ? 0 : dY / dX);
  }

  const tangents: number[] = [m[0]];
  for (let k = 1; k < n - 1; k++) {
    if (m[k - 1] * m[k] <= 0) {
      tangents.push(0); // Flat tangent at extrema
    } else {
      tangents.push((m[k - 1] + m[k]) / 2);
    }
  }
  tangents.push(m[n - 2]);

  for (let k = 0; k < n - 1; k++) {
    if (dy[k] === 0) {
      tangents[k] = 0;
      tangents[k + 1] = 0;
    } else {
      const alpha = tangents[k] / m[k];
      const beta = tangents[k + 1] / m[k];
      const dist = alpha * alpha + beta * beta;
      if (dist > 9) {
        const tau = 3 / Math.sqrt(dist);
        tangents[k] = tau * alpha * m[k];
        tangents[k + 1] = tau * beta * m[k];
      }
    }
  }

  // Crisp tension 0.10: tight control points prevent exaggerated curved domes and follow genuine data slopes
  const tension = 0.10;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let k = 0; k < n - 1; k++) {
    const p1 = points[k];
    const p2 = points[k + 1];
    const dX = dx[k];
    if (Math.abs(p1.y - p2.y) < 0.2) {
      d += ` L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    } else {
      const cp1x = p1.x + dX * tension;
      const cp1y = p1.y + tangents[k] * dX * tension;
      const cp2x = p2.x - dX * tension;
      const cp2y = p2.y - tangents[k + 1] * dX * tension;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
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
        const totalClouds = weather.hourly.cloudcover?.[i] ?? 0;
        if (totalClouds >= 95) {
          sunPercent = 0;
        } else {
          const hasLayerData = (cLow + cMid + cHigh) > 10;
          const layerObstruction = cLow * 1.0 + cMid * 0.75 + cHigh * 0.35;
          const cloudObstruction = hasLayerData
            ? Math.max(totalClouds, Math.min(100, layerObstruction))
            : totalClouds;
          sunPercent = Math.max(0, Math.min(100, Math.round(100 - cloudObstruction)));
        }
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

  // Continuous Seamless Day/Night Atmosphere Gradient stops across the full time range
  const atmosphereStops = useMemo(() => {
    if (sunEvents.length === 0 || hours.length === 0) return [];
    const totalW = hours.length * colWidth;
    // Wide atmospheric transition (~66px = ~3.0 hours) for silky-smooth organic sky blend
    const blendPx = colWidth * 3.0;

    interface Stop {
      offset: number;
      color: string;
      opacity: number;
    }
    const stops: Stop[] = [];

    const startsAsDay = sunEvents[0].type === 'sunset';
    let currentPhase: 'night' | 'day' = startsAsDay ? 'day' : 'night';

    // Harmonious sky palette: midnight obsidian for night, ambient atmospheric navy for day
    const nightColor = '#020617';
    const dayColor = '#082847';
    const nightOpacity = 0.88;
    const dayOpacity = 0.40;

    stops.push({
      offset: 0,
      color: currentPhase === 'day' ? dayColor : nightColor,
      opacity: currentPhase === 'day' ? dayOpacity : nightOpacity,
    });

    for (const ev of sunEvents) {
      const isSunrise = ev.type === 'sunrise';
      const eventPct = (ev.x / totalW) * 100;
      const blendPct = (blendPx / totalW) * 100;

      const startPct = Math.max(0, eventPct - blendPct);
      const endPct = Math.min(100, eventPct + blendPct);

      if (isSunrise) {
        // NIGHT -> DAWN -> DAY: silky smooth, monotonic brightening of the sky
        stops.push({ offset: startPct, color: nightColor, opacity: nightOpacity });
        stops.push({ offset: Math.max(0, eventPct - blendPct * 0.50), color: '#071426', opacity: 0.76 });
        stops.push({ offset: eventPct, color: '#081c33', opacity: 0.60 });
        stops.push({ offset: Math.min(100, eventPct + blendPct * 0.50), color: '#082440', opacity: 0.48 });
        stops.push({ offset: endPct, color: dayColor, opacity: dayOpacity });
        currentPhase = 'day';
      } else {
        // DAY -> DUSK -> NIGHT: silky smooth, monotonic darkening of the sky
        stops.push({ offset: startPct, color: dayColor, opacity: dayOpacity });
        stops.push({ offset: Math.max(0, eventPct - blendPct * 0.50), color: '#082440', opacity: 0.48 });
        stops.push({ offset: eventPct, color: '#081c33', opacity: 0.60 });
        stops.push({ offset: Math.min(100, eventPct + blendPct * 0.50), color: '#071426', opacity: 0.76 });
        stops.push({ offset: endPct, color: nightColor, opacity: nightOpacity });
        currentPhase = 'night';
      }
    }

    stops.push({
      offset: 100,
      color: currentPhase === 'day' ? dayColor : nightColor,
      opacity: currentPhase === 'day' ? dayOpacity : nightOpacity,
    });

    stops.sort((a, b) => a.offset - b.offset);
    return stops;
  }, [sunEvents, hours.length, colWidth]);

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

  // Golden Hour & Twilight window (±40 min around sunrise and sunset for deep atmospheric glow)
  const twilightSpans = useMemo(() => {
    const halfSpan = colWidth * 1.35; // ~80 minutes window
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

  // Chart 2: Sun Intensity - Crisp, authentic daytime solar envelopes from sunrise to sunset
  // y: 86 at horizon (0% sun), y: 30 at peak sun (100% sun) - leaves top 30px clear for wind speed & gusts
  const getSunY = (s: number) => {
    return 86 - (Math.max(0, Math.min(100, s)) / 100) * 56;
  };

  interface SunPoint {
    x: number;
    y: number;
    hourIdx: number;
    sunPercent: number;
  }

  interface SunSegment {
    srX: number;
    ssX: number;
    points: SunPoint[];
    strokeD: string;
    areaD: string;
  }

  const sunSegments = useMemo(() => {
    if (hours.length === 0 || sunEvents.length === 0) return [];
    const segments: SunSegment[] = [];

    const sunrises = sunEvents.filter((e) => e.type === 'sunrise');
    const sunsets = sunEvents.filter((e) => e.type === 'sunset');

    // Case 1: Timeline starts in daylight before the first sunrise
    if (sunEvents[0].type === 'sunset' && hours[0]?.isDay) {
      const firstSunset = sunEvents[0];
      const pts: SunPoint[] = [];
      for (let i = 0; i < hours.length; i++) {
        const h = hours[i];
        const hx = i * colWidth + colWidth / 2;
        if (hx < firstSunset.x && h.isDay) {
          pts.push({ x: hx, y: getSunY(h.sunPercent), hourIdx: i, sunPercent: h.sunPercent });
        }
      }
      if (pts.length > 0) {
        const curveCoords = [{ x: 0, y: pts[0].y }, ...pts.map(p => ({ x: p.x, y: p.y })), { x: firstSunset.x, y: 86 }];
        const strokeD = getTightSunSpline(curveCoords);
        const areaD = `${strokeD} L ${firstSunset.x.toFixed(1)} 86 L 0 86 Z`;
        segments.push({ srX: 0, ssX: firstSunset.x, points: pts, strokeD, areaD });
      }
    }

    // Case 2: Regular sunrise-to-sunset pairs
    for (const sr of sunrises) {
      const ss = sunsets.find((s) => s.x > sr.x && s.x - sr.x < 24 * colWidth);
      const ssX = ss ? ss.x : Math.min(hours.length * colWidth, sr.x + 14 * colWidth);

      const pts: SunPoint[] = [];
      for (let i = 0; i < hours.length; i++) {
        const h = hours[i];
        const hx = i * colWidth + colWidth / 2;
        // Strictly include daylight hours that occur strictly between sunrise and sunset
        if (hx > sr.x && hx < ssX && h.isDay) {
          pts.push({
            x: hx,
            y: getSunY(h.sunPercent),
            hourIdx: i,
            sunPercent: h.sunPercent,
          });
        }
      }

      if (pts.length === 0) continue;

      const curveCoords = [
        { x: sr.x, y: 86 },
        ...pts.map((p) => ({ x: p.x, y: p.y })),
        { x: ssX, y: 86 },
      ];

      const strokeD = getTightSunSpline(curveCoords);
      const areaD = `${strokeD} L ${ssX.toFixed(1)} 86 L ${sr.x.toFixed(1)} 86 Z`;

      segments.push({
        srX: sr.x,
        ssX,
        points: pts,
        strokeD,
        areaD,
      });
    }

    return segments;
  }, [hours, colWidth, sunEvents]);

  // HUD interaction with dynamic anchor (left/right) to never cover active hour
  const [hudAnchor, setHudAnchor] = useState<'left' | 'right'>('right');

  // Track physical device dimensions and portrait mode
  const [viewportDims, setViewportDims] = useState<{ w: number; h: number }>(() => {
    if (typeof window === 'undefined') return { w: 872, h: 392 };
    return { w: window.innerWidth, h: window.innerHeight };
  });
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
      setViewportDims({ w: window.innerWidth, h: window.innerHeight });
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

    // Dynamic floating cursor positioning directly on active column
    if (scrollContainerRef.current) {
      const hourX = idx * colWidth + colWidth / 2;
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const viewportWidth = scrollContainerRef.current.clientWidth;
      const visibleX = hourX - scrollLeft;
      const newAnchor = visibleX > viewportWidth / 2 ? 'left' : 'right';
      
      if (hudAnchorRef.current !== newAnchor) {
        hudAnchorRef.current = newAnchor;
        if (newAnchor === 'left') {
          hudRef.current.classList.remove('right-3');
          hudRef.current.classList.add('left-3');
        } else {
          hudRef.current.classList.remove('left-3');
          hudRef.current.classList.add('right-3');
        }
      }
    }

    // Update HUD text content via data attributes and querySelector
    const hourTitle = h.isCurrent ? 'Teraz' : `${h.hourNum.toString().padStart(2, '0')}:00`;
    const dayNight = h.isDay ? 'Dzień' : 'Noc';
    const info = getWeatherInfo(h.weathercode, h.isDay);
    const cloudInfo = getCloudCoverInfo(h.cloudCover);

    const elTitle = hudRef.current.querySelector('[data-hud="hour-title"]');
    if (elTitle) elTitle.textContent = hourTitle;
    const elDayNight = hudRef.current.querySelector('[data-hud="day-night"]');
    if (elDayNight) elDayNight.textContent = dayNight;
    
    const elWeatherLabel = hudRef.current.querySelector('[data-hud="weather-label"]');
    if (elWeatherLabel) elWeatherLabel.textContent = info.label;
    
    const elTemp = hudRef.current.querySelector('[data-hud="temp"]');
    if (elTemp) elTemp.textContent = `${h.temp}°`;
    const elApparent = hudRef.current.querySelector('[data-hud="apparent"]');
    if (elApparent) elApparent.textContent = `odcz. ${h.apparentTemp}°`;
    
    const elCloudCover = hudRef.current.querySelector('[data-hud="cloud-cover"]');
    if (elCloudCover) elCloudCover.textContent = h.isDay ? `${h.sunPercent}% słońce` : `${h.cloudCover}%`;
    const elCloudLabel = hudRef.current.querySelector('[data-hud="cloud-label"]');
    if (elCloudLabel) elCloudLabel.textContent = cloudInfo.label;
    
    const elPrecipAmt = hudRef.current.querySelector('[data-hud="precip-amt"]');
    if (elPrecipAmt) elPrecipAmt.textContent = h.precipAmount > 0 ? `${h.precipAmount.toFixed(1)} mm` : '0.0 mm';
    const elPrecipProb = hudRef.current.querySelector('[data-hud="precip-prob"]');
    if (elPrecipProb) elPrecipProb.textContent = `${h.precipProb}% szans`;
    
    const elWindSpeed = hudRef.current.querySelector('[data-hud="wind-speed"]');
    if (elWindSpeed) elWindSpeed.textContent = `${h.windSpeed}`;
    const elGust = hudRef.current.querySelector('[data-hud="gust"]');
    if (elGust) elGust.textContent = `por. ${h.windGusts} km/h`;
    
    const elHumidity = hudRef.current.querySelector('[data-hud="humidity"]');
    if (elHumidity) elHumidity.textContent = `${h.humidity}%`;
    const elPressure = hudRef.current.querySelector('[data-hud="pressure"]');
    if (elPressure) elPressure.textContent = `${h.pressure} hPa${h.uvIndex > 0 ? ` · UV ${h.uvIndex}` : ''}`;

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

  // Keyboard navigation for HUD
  useEffect(() => {
    if (activeHourIdx === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && activeHourIdx > 0) {
        openOrUpdateHud(activeHourIdx - 1);
        if (scrollContainerRef.current) {
          const hourX = (activeHourIdx - 1) * colWidth + colWidth / 2;
          const sl = scrollContainerRef.current.scrollLeft;
          if (hourX < sl + 50) scrollContainerRef.current.scrollBy({ left: -colWidth * 3, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowRight' && activeHourIdx < hours.length - 1) {
        openOrUpdateHud(activeHourIdx + 1);
        if (scrollContainerRef.current) {
          const hourX = (activeHourIdx + 1) * colWidth + colWidth / 2;
          const sl = scrollContainerRef.current.scrollLeft;
          const cw = scrollContainerRef.current.clientWidth;
          if (hourX > sl + cw - 50) scrollContainerRef.current.scrollBy({ left: colWidth * 3, behavior: 'smooth' });
        }
      } else if (e.key === 'Escape') {
        closeHud();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeHourIdx, hours.length, openOrUpdateHud, closeHud, colWidth]);

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

  const availableWidth = typeof window !== 'undefined'
    ? Math.max(viewportDims.w, viewportDims.h) - 16
    : 600;
  const chartWidth = Math.max(hours.length * colWidth, availableWidth);

  // --- SVG Coordinates & Scales ---

  // Chart 1: Temperature & Precipitation (viewBox height: 110)
  const tempSpan = Math.max(4, stats.maxTemp - stats.minTemp);
  const getTempY = (t: number) => {
    return 70 - ((t - stats.minTemp) / tempSpan) * 48;
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
              width: `${Math.max(viewportDims.w, viewportDims.h)}px`,
              height: `${Math.min(viewportDims.w, viewportDims.h)}px`,
              transform: 'rotate(90deg) translateY(-100%)',
            }
          : undefined
      }
    >
      {/* Feature 7: Day Jumper - Floating horizontal thumb navigation bar */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 p-1 rounded-full bg-zinc-950/85 backdrop-blur-2xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.7)] pointer-events-auto select-none">
        {dayJumperDays.map((d, idx) => {
          const dPrecip = daySummaryMap.get(d.dayKey)?.precipSum ?? 0;
          return (
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
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono transition-all cursor-pointer ${
                activeDayIndex === idx
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50 shadow-xs scale-105'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{d.label}</span>
              {dPrecip > 0.1 && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.9)]" title={`Opady: ${dPrecip.toFixed(1)} mm`} />
              )}
            </button>
          );
        })}
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

      {/* Rich Glassmorphic HUD anchored to screen edge (never covers finger) */}
      {activeHourIdx !== null && (() => {
        const activeHour = hours[activeHourIdx];
        if (!activeHour) return null;
        const hourTitle = activeHour.isCurrent ? 'Teraz' : `${activeHour.hourNum.toString().padStart(2, '0')}:00`;
        const info = getWeatherInfo(activeHour.weathercode, activeHour.isDay);
        const cloudInfo = getCloudCoverInfo(activeHour.cloudCover);

        return (
          <div
            ref={hudRef}
            className={`absolute top-4 ${hudAnchorRef.current === 'left' ? 'left-3' : 'right-3'} z-[110] w-[260px] p-2.5 rounded-2xl bg-black/90 border border-cyan-400/50 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.85)] flex flex-col gap-1.5 transition-all duration-200 ease-out select-none pointer-events-auto ${
              isClosing ? 'opacity-0 translate-y-2 scale-[0.98] pointer-events-none' : 'opacity-100 translate-y-0 scale-100 animate-in fade-in-0 slide-in-from-bottom-2'
            }`}
          >
            {/* Top Command Bar: Hour badge, Weather condition & Temp, Navigation */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="flex flex-col shrink-0 items-start">
                  <span data-hud="hour-title" className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-[10px] font-mono font-black text-cyan-300 uppercase tracking-wider">
                    {hourTitle}
                  </span>
                  <span data-hud="day-night" className="text-[7.5px] text-zinc-400 font-semibold uppercase tracking-wider pl-0.5 mt-0.5">
                    {activeHour.isDay ? 'Dzień' : 'Noc'}
                  </span>
                </div>

                <div className="w-px h-6 bg-white/10 shrink-0 mx-0.5" />

                <div className="flex items-center gap-1 min-w-0">
                  <WeatherIcon code={activeHour.weathercode} isDay={activeHour.isDay} size={22} glow={false} />
                  <div className="flex flex-col min-w-0">
                    <span data-hud="weather-label" className="text-[10px] font-bold text-white truncate leading-tight">
                      {info.label}
                    </span>
                    <span className="text-[9px] text-zinc-300 tabular-nums leading-tight mt-0.5">
                      <strong data-hud="temp" className="text-white font-bold">{activeHour.temp}°</strong>
                      <span data-hud="apparent" className="text-zinc-400 ml-1">odcz. {activeHour.apparentTemp}°</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation & Close */}
              <div className="flex items-center gap-0.5 shrink-0 bg-white/5 rounded-full p-0.5 border border-white/5">
                <button
                  onClick={(e) => { e.stopPropagation(); if (activeHourIdx > 0) openOrUpdateHud(activeHourIdx - 1); }}
                  className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer disabled:opacity-30"
                  disabled={activeHourIdx === 0}
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (activeHourIdx < hours.length - 1) openOrUpdateHud(activeHourIdx + 1); }}
                  className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer disabled:opacity-30"
                  disabled={activeHourIdx === hours.length - 1}
                >
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
                <div className="w-px h-3 bg-white/10 mx-0.5" />
                <button
                  onClick={(e) => { e.stopPropagation(); closeHud(); }}
                  className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Bottom Cockpit Metrics Grid: 4 micro-cards (Chmury, Opady, Wiatr, Warunki) */}
            <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-white/10">
              {/* 1. Zachmurzenie & Słońce */}
              <div className="flex flex-col justify-between p-1 rounded-lg bg-white/[0.04] border border-white/5 min-w-0">
                <div className="flex items-center gap-1 text-slate-300">
                  {activeHour.isDay && activeHour.sunPercent > 20 ? (
                    <Sun size={9} className="text-amber-400 shrink-0" />
                  ) : (
                    <Cloud size={9} className="text-slate-300 shrink-0" />
                  )}
                  <span className="text-[7.5px] font-bold uppercase tracking-wider text-zinc-400 truncate">
                    {activeHour.isDay ? 'Niebo' : 'Chmury'}
                  </span>
                </div>
                <span data-hud="cloud-cover" className="text-[10px] font-black text-white tabular-nums my-0.5">
                  {activeHour.isDay ? `${activeHour.sunPercent}% słońce` : `${activeHour.cloudCover}%`}
                </span>
                <span data-hud="cloud-label" className="text-[7px] text-slate-300/90 font-medium truncate leading-none">
                  {cloudInfo.label}
                </span>
              </div>

              {/* 2. Opady */}
              <div className="flex flex-col justify-between p-1 rounded-lg bg-white/[0.04] border border-white/5 min-w-0">
                <div className="flex items-center gap-1 text-cyan-400">
                  <Droplets size={9} className="text-cyan-400 shrink-0" />
                  <span className="text-[7.5px] font-bold uppercase tracking-wider text-zinc-400 truncate">Opady</span>
                </div>
                <span data-hud="precip-amt" className="text-[10px] font-black text-cyan-300 tabular-nums my-0.5">
                  {activeHour.precipAmount > 0 ? `${activeHour.precipAmount.toFixed(1)} mm` : '0.0 mm'}
                </span>
                <span data-hud="precip-prob" className="text-[7px] text-cyan-300/90 font-medium truncate leading-none tabular-nums">
                  {activeHour.precipProb}% szans
                </span>
              </div>

              {/* 3. Wiatr i porywy */}
              <div className="flex flex-col justify-between p-1 rounded-lg bg-white/[0.04] border border-white/5 min-w-0">
                <div className="flex items-center gap-1 text-emerald-400">
                  <Wind size={9} className="text-emerald-400 shrink-0" />
                  <span className="text-[7.5px] font-bold uppercase tracking-wider text-zinc-400 truncate">Wiatr</span>
                </div>
                <div className="flex items-center gap-0.5 my-0.5 leading-none">
                  <ArrowUp
                    data-hud="wind-arrow"
                    size={8}
                    style={{ transform: `rotate(${activeHour.windDir + 180}deg)` }}
                    className="text-emerald-400 shrink-0"
                    strokeWidth={3}
                  />
                  <span className="text-[10px] font-black text-emerald-300 tabular-nums truncate">
                    <span data-hud="wind-speed">{activeHour.windSpeed}</span> <span className="text-[7px] font-normal text-zinc-400">km/h</span>
                  </span>
                </div>
                <span data-hud="gust" className="text-[7px] text-emerald-400/90 font-medium truncate leading-none tabular-nums">
                  por. {activeHour.windGusts} km/h
                </span>
              </div>

              {/* 4. Warunki / Wilgotność / Ciśnienie */}
              <div className="flex flex-col justify-between p-1 rounded-lg bg-white/[0.04] border border-white/5 min-w-0">
                <div className="flex items-center gap-1 text-amber-400">
                  <Gauge size={9} className="text-amber-400 shrink-0" />
                  <span className="text-[7.5px] font-bold uppercase tracking-wider text-zinc-400 truncate">Warunki</span>
                </div>
                <span className="text-[10px] font-black text-zinc-100 tabular-nums my-0.5">
                  <span data-hud="humidity">{activeHour.humidity}%</span> <span className="text-[7px] font-normal text-zinc-400">wilg.</span>
                </span>
                <span data-hud="pressure" className="text-[7px] text-zinc-300/90 font-medium truncate leading-none tabular-nums">
                  {activeHour.pressure} hPa{activeHour.uvIndex > 0 ? ` · UV ${activeHour.uvIndex}` : ''}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Scrollable Track (Both charts fit with maximum panoramic width) */}
      <div
        ref={scrollContainerRef}
        id="landscapeChartScrollContainer"
        onMouseDown={handleMouseDown}
        onScroll={(e) => {
          const scrollLeft = e.currentTarget.scrollLeft;
          const currentDayIdx = Math.floor((scrollLeft + 120) / (24 * colWidth));
          setActiveDayIndex(Math.max(0, Math.min(dayJumperDays.length - 1, currentDayIdx)));
        }}
        className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-2 pt-1.5 pb-8 flex flex-col [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full touch-pan-x cursor-ew-resize pr-10"
      >
        <div
          style={{ width: `${chartWidth}px`, minWidth: '100%' }}
          className="h-full flex flex-col gap-0"
        >
          {/* HUD MOVED TO ROOT */}

          {/* WYKRES 1: TEMPERATURA & OPADY (flex-1, seamless middle panel) */}
          <div className="flex-1 min-h-0 rounded-none border-x border-b border-white/10 bg-zinc-900/40 py-1 flex flex-col relative shadow-none">
            {/* Visualizer: Temperature Curve + Precipitation Bars */}
            <div className="flex-1 min-h-0 relative w-full">
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox={`0 0 ${chartWidth} 110`}
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Continuous Seamless Day/Night Atmosphere Panorama */}
                  <linearGradient id="landscapeAtmosphereGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    {atmosphereStops.map((st, i) => (
                      <stop
                        key={`atm-stop-1-${i}`}
                        offset={`${st.offset.toFixed(2)}%`}
                        stopColor={st.color}
                        stopOpacity={st.opacity}
                      />
                    ))}
                  </linearGradient>

                  {/* Vertical sky depth gradient */}
                  <linearGradient id="landscapeVerticalDepthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
                    <stop offset="65%" stopColor="#000000" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
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
                    <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.09" />
                    <stop offset="60%" stopColor="#818cf8" stopOpacity="0.02" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                  </linearGradient>

                  {/* Refined Neomorphic Rain & Snow Bar Liquid Gradients */}
                  <linearGradient id="landscapeRainBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="40%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#0369a1" />
                  </linearGradient>

                  <linearGradient id="landscapeSnowBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e0f2fe" />
                    <stop offset="50%" stopColor="#bae6fd" />
                    <stop offset="100%" stopColor="#7dd3fc" />
                  </linearGradient>

                  <linearGradient id="landscapeProbGlassGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
                  </linearGradient>

                  {/* Dawn / Sunrise Golden Hour atmospheric glow band */}
                  <linearGradient id="landscapeDawnGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#030712" stopOpacity="0" />
                    <stop offset="25%" stopColor="#6366f1" stopOpacity="0.18" />
                    <stop offset="48%" stopColor="#f43f5e" stopOpacity="0.38" />
                    <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.42" />
                    <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>

                  {/* Dusk / Sunset Golden Hour atmospheric glow band */}
                  <linearGradient id="landscapeDuskGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                    <stop offset="20%" stopColor="#fbbf24" stopOpacity="0.25" />
                    <stop offset="45%" stopColor="#f97316" stopOpacity="0.45" />
                    <stop offset="68%" stopColor="#e11d48" stopOpacity="0.35" />
                    <stop offset="88%" stopColor="#4338ca" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* 1. Continuous Seamless Atmosphere Background */}
                <rect x="0" y="0" width={chartWidth} height={110} fill="url(#landscapeAtmosphereGrad)" />
                <rect x="0" y="0" width={chartWidth} height={110} fill="url(#landscapeVerticalDepthGrad)" className="pointer-events-none" />

                {/* Discrete Horizontal Isotherm Guide Lines with Neomorphic Left Scale */}
                {isotherms.map((iso) => {
                  const isZero = iso.temp === 0;
                  return (
                    <g key={`iso-line-${iso.temp}`}>
                      <line
                        x1={0}
                        y1={iso.y}
                        x2={chartWidth}
                        y2={iso.y}
                        stroke={isZero ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.08)'}
                        strokeDasharray={isZero ? '4 2' : '3 4'}
                        strokeWidth={isZero ? 1 : 0.75}
                        className="pointer-events-none"
                      />
                      {/* Neomorphic scale pill on left margin */}
                      <g className="pointer-events-none select-none">
                        <rect
                          x={2}
                          y={iso.y - 5.5}
                          width={16}
                          height={10}
                          rx={2.5}
                          fill="rgba(9, 9, 11, 0.85)"
                          stroke={isZero ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.14)'}
                          strokeWidth="0.5"
                          className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                        />
                        <text
                          x={10}
                          y={iso.y + 1.8}
                          fill={isZero ? '#38bdf8' : 'rgba(255, 255, 255, 0.65)'}
                          fontSize="6"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="font-mono font-bold"
                        >
                          {iso.temp}°
                        </text>
                      </g>
                    </g>
                  );
                })}

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

                {/* Apparent Temperature: Refined, crisp dashed guide curve in background */}
                <path
                  d={apparentSplineD}
                  fill="none"
                  stroke="rgba(196, 181, 253, 0.50)"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
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

                {/* Discrete Precipitation Instrument Baseline (y = 105) */}
                <line
                  x1={0}
                  y1={105}
                  x2={chartWidth}
                  y2={105}
                  stroke="rgba(56, 189, 248, 0.16)"
                  strokeWidth="0.75"
                  className="pointer-events-none"
                />
                <text
                  x={6}
                  y={102.5}
                  fill="rgba(56, 189, 248, 0.38)"
                  fontSize="6"
                  fontWeight="bold"
                  className="select-none font-mono pointer-events-none"
                >
                  mm
                </text>

                {/* Unified Neomorphic Glass Precipitation Capsules */}
                {hours.map((h, idx) => {
                  const hasAmount = h.precipAmount > 0;
                  const hasProb = h.precipProb >= 15;
                  if (!hasAmount && !hasProb) return null;

                  const p = tempPoints[idx];
                  const capsuleW = 14;
                  const capsuleX = p.x - capsuleW / 2;
                  const yBase = 105;
                  const maxRain = Math.max(1.5, stats.maxRain);
                  const amountH = hasAmount ? Math.max(4, Math.min(26, Math.round((h.precipAmount / maxRain) * 23) + 3)) : 0;
                  const probH = Math.max(amountH, Math.min(28, Math.round((h.precipProb / 100) * 26)));
                  const yProb = yBase - probH;
                  const yAmount = yBase - amountH;
                  const isSnow =
                    (h.weathercode >= 71 && h.weathercode <= 77) ||
                    (h.weathercode >= 85 && h.weathercode <= 86);

                  return (
                    <g
                      key={`precip-col-${idx}`}
                      className="cursor-pointer pointer-events-auto group"
                      onClick={() => openOrUpdateHud(idx)}
                    >
                      {/* 1. Neomorphic Glass Probability Track (Outer Capsule) */}
                      {hasProb && (
                        <rect
                          x={capsuleX}
                          y={yProb}
                          width={capsuleW}
                          height={probH}
                          rx="3.5"
                          fill="url(#landscapeProbGlassGrad)"
                          stroke="rgba(56, 189, 248, 0.3)"
                          strokeWidth="0.6"
                          strokeDasharray={!hasAmount ? '2 1.5' : undefined}
                          className="transition-opacity group-hover:opacity-100 pointer-events-none"
                        />
                      )}

                      {/* 2. Glowing Liquid Precipitation Column (Inner Fill mm) */}
                      {hasAmount && (
                        <>
                          <rect
                            x={capsuleX}
                            y={yAmount}
                            width={capsuleW}
                            height={amountH}
                            rx="3.5"
                            fill={isSnow ? 'url(#landscapeSnowBarGrad)' : 'url(#landscapeRainBarGrad)'}
                            stroke={isSnow ? '#bfdbfe' : '#38bdf8'}
                            strokeWidth="0.75"
                            className="drop-shadow-[0_2px_5px_rgba(2,132,199,0.5)] transition-all group-hover:brightness-125 pointer-events-none"
                          />
                          {/* Gloss Sheen Reflection Line */}
                          <line
                            x1={capsuleX + 2.2}
                            y1={yAmount + 2}
                            x2={capsuleX + 2.2}
                            y2={yBase - 2}
                            stroke="rgba(255, 255, 255, 0.45)"
                            strokeWidth="0.8"
                            strokeLinecap="round"
                            className="pointer-events-none"
                          />
                        </>
                      )}

                      {/* 3. Precipitation & Probability Floating Data Labels */}
                      {hasAmount && h.precipAmount >= 0.1 ? (
                        <text
                          x={p.x}
                          y={yAmount - 2.5}
                          fill="#67e8f9"
                          fontSize="7.5"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="font-mono tabular-nums select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                        >
                          {h.precipAmount.toFixed(1)}
                        </text>
                      ) : !hasAmount && h.precipProb >= 40 ? (
                        <text
                          x={p.x}
                          y={yProb - 2.5}
                          fill="rgba(56, 189, 248, 0.85)"
                          fontSize="6.5"
                          fontWeight="medium"
                          textAnchor="middle"
                          className="font-mono tabular-nums select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                        >
                          {h.precipProb}%
                        </text>
                      ) : null}
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

          {/* Single-Row Timeline (compact ~21px, seamlessly fused to charts) MOVED TO CENTER */}
          <div
            className="shrink-0 h-[21px] relative overflow-hidden border-x border-b border-white/10 select-none bg-zinc-900/55 shadow-md backdrop-blur-xl z-20"
            style={{ width: `${chartWidth}px` }}
          >
            {/* Seamless Atmosphere Background on Timeline */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none select-none" viewBox={`0 0 ${chartWidth} 21`} preserveAspectRatio="none">
              <rect x="0" y="0" width={chartWidth} height={21} fill="url(#landscapeAtmosphereGrad)" />
            </svg>

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
                const curHourObj = hours.find((x) => x.isCurrent);
                const isToday = curHourObj && h.date.toDateString() === curHourObj.date.toDateString();
                const curHNum = curHourObj?.hourNum ?? -99;
                // If current hour is near 12 on today, shift date badge to 16:00 to avoid overlapping "Teraz"
                const targetHour = isToday && Math.abs(curHNum - 12) <= 2 ? 16 : 12;
                const showDateLabel = h.hourNum === targetHour;
                const dayPrecip = daySummaryMap.get(h.dayKey)?.precipSum ?? 0;
                // Leave 1 hour before/after clean (or 2 hours if rain badge is attached) for clean breathing room
                const isNearDateLabel = Math.abs(h.hourNum - targetHour) <= (dayPrecip > 0.1 ? 2 : 1);
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

                    {/* Centered Date Label with Integrated Daily Precipitation Sum Badge */}
                    {showDateLabel && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap z-25 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-950/90 border border-amber-400/40 text-[8px] font-mono tracking-wide leading-none backdrop-blur-md shadow-md pointer-events-none"
                      >
                        <span className="font-black text-amber-200">{dateLabel}</span>
                        {dayPrecip > 0.1 && (
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-cyan-950/85 border border-cyan-400/50 text-cyan-300 font-bold text-[7.5px] leading-none shadow-[0_0_6px_rgba(34,211,238,0.3)]">
                            💧{dayPrecip.toFixed(1)}mm
                          </span>
                        )}
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

          {/* WYKRES 2: WIATR, PORYWY & NASŁONECZNIENIE (flex-1, seamless bottom panel) */}
          <div className="flex-1 min-h-0 rounded-b-xl rounded-t-none border-x border-b border-white/10 bg-zinc-900/40 py-1 flex flex-col relative shadow-md">
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
                  {/* Continuous Seamless Day/Night Atmosphere Panorama (Chart 2) */}
                  <linearGradient id="landscapeAtmosphereGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                    {atmosphereStops.map((st, i) => (
                      <stop
                        key={`atm-stop-2-${i}`}
                        offset={`${st.offset.toFixed(2)}%`}
                        stopColor={st.color}
                        stopOpacity={st.opacity}
                      />
                    ))}
                  </linearGradient>

                  {/* Refined subtle translucent solar glow gradient */}
                  <linearGradient id="landscapeSunAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
                    <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Linear gradient for wind line */}
                  <linearGradient id="landscapeWindLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    {hours.map((h, i) => {
                      const pct = ((i + 0.5) / hours.length) * 100;
                      return <stop key={i} offset={`${pct.toFixed(1)}%`} stopColor={getSmoothWindColor(h.windSpeed)} />;
                    })}
                  </linearGradient>

                  {/* Dawn / Sunrise Golden Hour atmospheric glow band (Chart 2) */}
                  <linearGradient id="landscapeDawnGrad2" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#030712" stopOpacity="0" />
                    <stop offset="25%" stopColor="#6366f1" stopOpacity="0.18" />
                    <stop offset="48%" stopColor="#f43f5e" stopOpacity="0.38" />
                    <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.42" />
                    <stop offset="85%" stopColor="#38bdf8" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>

                  {/* Dusk / Sunset Golden Hour atmospheric glow band (Chart 2) */}
                  <linearGradient id="landscapeDuskGrad2" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                    <stop offset="20%" stopColor="#fbbf24" stopOpacity="0.25" />
                    <stop offset="45%" stopColor="#f97316" stopOpacity="0.45" />
                    <stop offset="68%" stopColor="#e11d48" stopOpacity="0.35" />
                    <stop offset="88%" stopColor="#4338ca" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* 1. Continuous Seamless Atmosphere Background */}
                <rect x="0" y="0" width={chartWidth} height={100} fill="url(#landscapeAtmosphereGrad2)" />
                <rect x="0" y="0" width={chartWidth} height={100} fill="url(#landscapeVerticalDepthGrad)" className="pointer-events-none" />

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

                {/* Sun Guide Lines (100% słońca at y=30, 50% at y=58) */}
                <line x1="0" y1="30" x2={chartWidth} y2="30" stroke="rgba(251,191,36,0.24)" strokeDasharray="2 2" />
                <text x="4" y="27.5" fill="rgba(251,191,36,0.75)" fontSize="6.5" fontWeight="bold" className="select-none font-mono">100% słońca</text>
                <line x1="0" y1="58" x2={chartWidth} y2="58" stroke="rgba(255,255,255,0.06)" strokeDasharray="2 2" />
                <text x="4" y="55.5" fill="rgba(255,255,255,0.25)" fontSize="6" fontWeight="medium" className="select-none font-mono">50%</text>

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



                {/* Daytime Solar Profiles: Crisp solar envelopes from sunrise to sunset (clean, non-intrusive) */}
                {sunSegments.map((seg, sIdx) => {
                  const activePt = seg.points.find((p) => p.hourIdx === activeHourIdx);
                  return (
                    <g key={`sun-segment-${sIdx}`} className="pointer-events-none">
                      {/* Soft golden solar veil fill */}
                      <path d={seg.areaD} fill="url(#landscapeSunAreaGrad)" />
                      {/* Crisp solar intensity curve */}
                      <path
                        d={seg.strokeD}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.3"
                        strokeOpacity="0.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-[0_0_4px_rgba(245,158,11,0.45)]"
                      />
                      {/* Highlighted solar marker on active/selected hour */}
                      {activePt && (
                        <g>
                          <circle
                            cx={activePt.x}
                            cy={activePt.y}
                            r={3.5}
                            fill="#fef08a"
                            stroke="#f59e0b"
                            strokeWidth="1.5"
                            className="drop-shadow-[0_0_6px_rgba(245,158,11,0.9)]"
                          />
                        </g>
                      )}
                    </g>
                  );
                })}

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
 
