'use client';

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { HourlyData } from '@/lib/types';
import { ArrowUp, X, Droplets, Wind, Cloud, Gauge, Sun } from 'lucide-react';
import { WeatherIcon } from '@/components/ui/WeatherIcon';
import { getWeatherInfo } from '@/lib/weather-codes';
import { getCloudCoverInfo, degreesToCardinal } from '@/lib/utils';

interface DayDetailChartProps {
  dateStr: string;
  isToday: boolean;
  currentIdx: number;
  hourlyData: HourlyData;
}

// Bezier Spline generator for smooth SVG curves
function getSvgSpline(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

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

// Multi-stop linear color interpolator for continuous, smooth value transitions
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

// Temperature color gradient
const TEMP_COLOR_STOPS: ColorStop[] = [
  { value: -10, rgb: [167, 139, 250] }, // Violet frost
  { value: -2,  rgb: [129, 140, 248] }, // Cold indigo
  { value: 4,   rgb: [96, 165, 250] },  // Chilly blue
  { value: 10,  rgb: [56, 189, 248] },  // Crisp sky
  { value: 16,  rgb: [45, 212, 191] },  // Soft teal
  { value: 21,  rgb: [251, 191, 36] },  // Warm gold
  { value: 26,  rgb: [251, 146, 60] },  // Warm orange
  { value: 32,  rgb: [248, 113, 113] }, // Coral
  { value: 38,  rgb: [244, 63, 94] },   // Crimson
];

function getSmoothTempColor(temp: number): string {
  return interpolateMultiStops(temp, TEMP_COLOR_STOPS);
}

// Dynamic, high-contrast wind speed color gradient (Beaufort-inspired)
const WIND_COLOR_STOPS: ColorStop[] = [
  { value: 0,  rgb: [148, 163, 184] }, // Cisza: Muted slate
  { value: 7,  rgb: [52, 211, 153] },  // Słaby: Fresh emerald green
  { value: 13, rgb: [56, 189, 248] },  // Łagodny: Sky cyan
  { value: 18, rgb: [250, 204, 21] },  // Umiarkowany: Bright yellow
  { value: 24, rgb: [251, 146, 60] },  // Wyraźny: Warm amber / orange
  { value: 32, rgb: [248, 113, 113] }, // Dość silny: Coral red
  { value: 45, rgb: [192, 132, 252] }, // Silny / porywisty: Vivid purple
];

function getSmoothWindColor(speed: number): string {
  return interpolateMultiStops(speed, WIND_COLOR_STOPS);
}

// Optimized column width for max visible hours on mobile while keeping labels legible
const COL_WIDTH = 32;

export function DayDetailChart({ dateStr, isToday, currentIdx, hourlyData }: DayDetailChartProps) {
  const colWidth = COL_WIDTH;
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Extract hours matching the selected date
  const hours = useMemo(() => {
    const list = [];
    for (let i = 0; i < hourlyData.time.length; i++) {
      const timeStr = hourlyData.time[i];
      if (timeStr.startsWith(dateStr)) {
        const hourNum = parseInt(timeStr.split('T')[1].split(':')[0], 10);
        list.push({
          idx: i,
          timeStr,
          hourNum,
          timeLabel: hourNum.toString(), // Clean number without minutes: e.g. 12, 13, 14
          temp: Math.round(hourlyData.temperature_2m[i] ?? 0),
          apparentTemp: Math.round(hourlyData.apparent_temperature?.[i] ?? hourlyData.temperature_2m[i] ?? 0),
          weathercode: hourlyData.weathercode[i] ?? 0,
          isDay: hourlyData.is_day[i] === 1,
          cloudCover: Math.round(hourlyData.cloudcover?.[i] ?? 0),
          precipAmount: hourlyData.precipitation?.[i] ?? 0,
          precipProb: hourlyData.precipitation_probability?.[i] ?? 0,
          windSpeed: Math.round(hourlyData.windspeed_10m?.[i] ?? 0),
          windDir: Math.round(hourlyData.winddirection_10m?.[i] ?? 0),
          windGusts: Math.round(hourlyData.windgusts_10m?.[i] ?? hourlyData.windspeed_10m?.[i] ?? 0),
          humidity: Math.round(hourlyData.relativehumidity_2m?.[i] ?? 0),
          uvIndex: Math.round(hourlyData.uv_index?.[i] ?? 0),
          pressure: Math.round(hourlyData.surface_pressure?.[i] ?? 1013),
        });
      }
    }
    return list;
  }, [hourlyData, dateStr]);

  // Active touched/scrubbed hour state & lifecycle transitions
  const [activeHourIdx, setActiveHourIdx] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  // Refs for tracking long-press, drag state and preventing race conditions
  const isScrubbingRef = useRef<boolean>(false);
  const isClosingRef = useRef<boolean>(false);
  const isLongPressActiveRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const currentPointerXRef = useRef<number | null>(null);
  const justFinishedDraggingRef = useRef<boolean>(false);
  const dragDistanceRef = useRef<number>(0);

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

  const openOrUpdateHud = useCallback((idx: number) => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    isClosingRef.current = false;
    setActiveHourIdx(idx);
  }, []);

  const scheduleAutoDismiss = useCallback((delayMs: number = 7000) => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }
    autoDismissTimerRef.current = setTimeout(() => {
      closeHud();
    }, delayMs);
  }, [closeHud]);

  // Update scrub position based on touch/pointer X
  const updateScrubPosition = useCallback((clientX: number) => {
    if (!scrollContainerRef.current) return;
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const relX = clientX - rect.left + scrollContainerRef.current.scrollLeft;
    const idx = Math.max(0, Math.min(hours.length - 1, Math.floor(relX / colWidth)));
    openOrUpdateHud(idx);
  }, [colWidth, hours.length, openOrUpdateHud]);

  // Continuous edge auto-scrolling when holding finger or mouse near the boundaries while scrubbing
  const startEdgeAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current) return;

    const loop = () => {
      if (!scrollContainerRef.current || currentPointerXRef.current === null || !isScrubbingRef.current) {
        autoScrollRafRef.current = null;
        return;
      }

      const rect = scrollContainerRef.current.getBoundingClientRect();
      const pointerX = currentPointerXRef.current;
      const relViewportX = pointerX - rect.left;
      const edgeThreshold = 45;
      let speed = 0;

      if (relViewportX < edgeThreshold && scrollContainerRef.current.scrollLeft > 0) {
        const factor = Math.max(0, Math.min(1, (edgeThreshold - relViewportX) / edgeThreshold));
        speed = -Math.max(2, Math.round(factor * 10));
      } else if (relViewportX > rect.width - edgeThreshold) {
        const maxScroll = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
        if (scrollContainerRef.current.scrollLeft < maxScroll) {
          const factor = Math.max(0, Math.min(1, (relViewportX - (rect.width - edgeThreshold)) / edgeThreshold));
          speed = Math.max(2, Math.round(factor * 10));
        }
      }

      if (speed !== 0) {
        scrollContainerRef.current.scrollLeft += speed;
        updateScrubPosition(pointerX);
      }

      autoScrollRafRef.current = requestAnimationFrame(loop);
    };

    autoScrollRafRef.current = requestAnimationFrame(loop);
  }, [updateScrubPosition]);

  const stopEdgeAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  // Native touch gesture engine on scrollContainer:
  // Immediate movement scrolls the chart normally; holding finger for >= 500ms activates the HUD & scrubbing
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const clientX = touch.clientX;
      const clientY = touch.clientY;

      touchStartPosRef.current = { x: clientX, y: clientY, time: Date.now() };
      isLongPressActiveRef.current = false;
      dragDistanceRef.current = 0;
      currentPointerXRef.current = clientX;

      // Clear any prior pending long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // START LONG-PRESS TIMER (500ms = pół sekundy)
      longPressTimerRef.current = setTimeout(() => {
        // User held finger still for 500ms -> ACTIVATE HUD & SCRUBBER!
        isLongPressActiveRef.current = true;
        isScrubbingRef.current = true;
        setIsScrubbing(true);

        // Haptic feedback if supported (35ms clean bump)
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(35);
          }
        } catch (_) {}

        // Open HUD and lock on current hour
        updateScrubPosition(clientX);
        startEdgeAutoScroll();
      }, 500);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      dragDistanceRef.current = Math.max(dragDistanceRef.current, dx);
      currentPointerXRef.current = touch.clientX;

      // IF LONG PRESS IS NOT ACTIVE YET:
      if (!isLongPressActiveRef.current) {
        // If finger moves more than 7px before 500ms has elapsed:
        if (dx > 7 || dy > 7) {
          // It's a normal scroll/swipe! Cancel the long press timer!
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          // Do NOT preventDefault! Let native horizontal scroll of the chart take place!
        }
        return;
      }

      // IF LONG PRESS IS ACTIVE (user held > 500ms and is now scrubbing):
      // Prevent the page from scrolling vertically
      if (e.cancelable) {
        e.preventDefault();
      }
      // Smoothly update HUD for each hour as finger moves
      updateScrubPosition(touch.clientX);
    };

    const onTouchEnd = () => {
      // Cancel long press timer if lifted before 500ms
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (isLongPressActiveRef.current) {
        // Finger was scrubbing via long press:
        justFinishedDraggingRef.current = true;
        setTimeout(() => {
          justFinishedDraggingRef.current = false;
        }, 350);

        isLongPressActiveRef.current = false;
        isScrubbingRef.current = false;
        setIsScrubbing(false);
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

  // Desktop mouse dragging support with long-press or drag
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
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
    }, 450);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = Math.abs(moveEvent.clientX - startX);
      const dy = Math.abs(moveEvent.clientY - startY);
      dragDistanceRef.current = Math.max(dragDistanceRef.current, dx);
      currentPointerXRef.current = moveEvent.clientX;

      if (!isMouseLongPressActive) {
        if (dx > 8 || dy > 8) {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
        return;
      }

      updateScrubPosition(moveEvent.clientX);
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

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          // Inside container, ignore
          return;
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

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (autoScrollRafRef.current) cancelAnimationFrame(autoScrollRafRef.current);
    };
  }, []);

  // Auto-scroll screen so the expanded chart is fully visible above bottom toolbar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const bottomNavOffset = 90;
        const targetBottom = window.innerHeight - bottomNavOffset;
        if (rect.bottom > targetBottom) {
          window.scrollBy({
            top: rect.bottom - targetBottom + 20,
            behavior: 'smooth',
          });
        }
      }
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  // Daily statistics for header
  const stats = useMemo(() => {
    if (hours.length === 0) {
      return { minTemp: 0, maxTemp: 0, avgCloud: 0, totalRain: 0, maxRain: 0, maxWind: 0 };
    }
    const temps = hours.map((h) => h.temp);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const totalRain = hours.reduce((acc, h) => acc + h.precipAmount, 0);
    const maxRain = Math.max(...hours.map((h) => h.precipAmount));
    const maxWind = Math.max(...hours.map((h) => h.windSpeed));
    const avgCloud = Math.round(hours.reduce((acc, h) => acc + h.cloudCover, 0) / hours.length);

    return { minTemp, maxTemp, avgCloud, totalRain, maxRain, maxWind };
  }, [hours]);

  // Horizontal scroll alignment: align "Teraz" for today, 6 AM for other days
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!scrollContainerRef.current) return;

      let targetHourIndex = -1;
      if (isToday) {
        targetHourIndex = hours.findIndex((h) => h.idx === currentIdx);
        if (targetHourIndex === -1) {
          const currentHour = new Date().getHours();
          targetHourIndex = hours.findIndex((h) => h.hourNum === currentHour);
        }
      } else {
        targetHourIndex = hours.findIndex((h) => h.hourNum === 6);
      }

      if (targetHourIndex >= 0) {
        const targetScrollLeft = targetHourIndex * colWidth;
        scrollContainerRef.current.scrollTo({
          left: targetScrollLeft,
          behavior: 'smooth',
        });
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [isToday, currentIdx, hours, colWidth]);

  if (hours.length === 0) {
    return (
      <div className="p-3 text-center text-xs text-zinc-500 bg-zinc-900/40 backdrop-blur-xl rounded-xl border border-white/5 my-1.5">
        Brak szczegółowych danych godzinowych dla tego dnia.
      </div>
    );
  }

  const chartWidth = hours.length * colWidth;
  const tempSvgHeight = 60;

  // Temperature scale mapping: maps between Y=14 (maxTemp) and Y=44 (minTemp)
  const tempSpan = Math.max(3, stats.maxTemp - stats.minTemp);
  const getTempY = (t: number) => {
    return 44 - ((t - stats.minTemp) / tempSpan) * 30;
  };

  // Cloud cover ceiling scale mapping:
  // 0% clouds = Y=0 (clear top)
  // 50% clouds = Y=27 (mid-level)
  // 100% clouds = Y=54 (descends to bottom)
  const getCloudY = (c: number) => {
    return Math.max(1, (c / 100) * 54);
  };

  // SVG Points
  const tempPoints = hours.map((h, i) => ({
    x: i * colWidth + colWidth / 2,
    y: getTempY(h.temp),
  }));

  const cloudPoints = hours.map((h, i) => ({
    x: i * colWidth + colWidth / 2,
    y: getCloudY(h.cloudCover),
  }));

  const tempSplineD = getSvgSpline(tempPoints);
  const cloudSplineD = getSvgSpline(cloudPoints);

  const firstX = tempPoints[0]?.x ?? 0;
  const lastX = tempPoints[tempPoints.length - 1]?.x ?? chartWidth;
  const tempAreaD = `${tempSplineD} L ${lastX.toFixed(1)} 54 L ${firstX.toFixed(1)} 54 Z`;

  // Cloud ceiling path starts at (firstX, 0), follows spline of cloud ceiling down, and closes at (lastX, 0)
  const cloudCeilingAreaD = `M ${firstX.toFixed(1)} 0 L ${cloudSplineD.slice(1)} L ${lastX.toFixed(1)} 0 Z`;

  const maxTempIdx = hours.findIndex(h => h.temp === stats.maxTemp);
  const minTempIdx = hours.findIndex(h => h.temp === stats.minTemp);
  const maxRainCap = Math.max(1.5, Math.ceil(stats.maxRain * 1.25 * 10) / 10);

  return (
    <div
      ref={containerRef}
      data-no-swipe="true"
      className="my-1.5 -mx-2 sm:-mx-3 p-2 rounded-2xl bg-zinc-900/55 border border-white/10 backdrop-blur-2xl shadow-xl flex flex-col gap-1.5 overflow-hidden"
    >
      {/* Header: Title, Range & Clean Visual Legend */}
      <div className="flex items-center justify-between px-1.5 pb-1 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-white tracking-wider uppercase whitespace-nowrap">
            Przebieg doby
          </span>
          <span className="text-[8.5px] px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-zinc-300 whitespace-nowrap">
            <strong className="text-amber-300">{stats.maxTemp}°</strong> / <span className="text-cyan-300">{stats.minTemp}°</span>
          </span>
        </div>

        {/* Unified Legend for all 4 parameters */}
        <div className="flex items-center gap-2 text-[8px] font-medium text-zinc-400 whitespace-nowrap">
          <span className="flex items-center gap-0.5">
            <span className="w-1.5 h-0.5 rounded-full bg-amber-400" />
            <span className="text-zinc-300">Temp</span>
          </span>
          <span className="flex items-center gap-0.5">
            <span className="w-1.5 h-0.5 rounded-xs bg-slate-300/40 border-t border-slate-300/80" />
            <span className="text-slate-300">Chmury</span>
          </span>
          <span className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-xs bg-cyan-400" />
            <span className="text-cyan-300">Opady</span>
          </span>
          <span className="flex items-center gap-0.5 pr-1">
            <span className="text-emerald-400 font-bold leading-none">↗</span>
            <span className="text-emerald-300">Wiatr</span>
          </span>
        </div>
      </div>

      {/* Interactive Scrubber HUD: Detailed weather popup for touched hour */}
      {activeHourIdx !== null && (() => {
        const activeHour = hours[activeHourIdx];
        if (!activeHour) return null;

        const info = getWeatherInfo(activeHour.weathercode, activeHour.isDay);
        const cloudInfo = getCloudCoverInfo(activeHour.cloudCover);
        const hourTitle = isToday && activeHour.idx === currentIdx
          ? 'Teraz'
          : `${activeHour.hourNum.toString().padStart(2, '0')}:00`;

        return (
          <div
            className={`mx-0.5 p-2 rounded-xl bg-zinc-950/85 border border-cyan-400/40 backdrop-blur-2xl shadow-[0_8px_25px_rgba(0,0,0,0.6)] flex flex-col gap-1.5 transition-all duration-200 ease-out select-none relative ${
              isClosing
                ? 'opacity-0 -translate-y-2 scale-[0.98] pointer-events-none'
                : 'opacity-100 translate-y-0 scale-100 animate-in fade-in-0 slide-in-from-top-2'
            }`}
          >
            {/* Top Command Bar: Hour badge, Weather condition & Temp, Close button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex flex-col shrink-0 items-start">
                  <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/30 text-[10px] font-mono font-black text-cyan-300 uppercase tracking-wider">
                    {hourTitle}
                  </span>
                  <span className="text-[7.5px] text-zinc-400 font-semibold uppercase tracking-wider pl-0.5 mt-0.5">
                    {activeHour.isDay ? 'Dzień' : 'Noc'}
                  </span>
                </div>

                <div className="w-px h-6 bg-white/10 shrink-0" />

                <div className="flex items-center gap-1.5 min-w-0">
                  <WeatherIcon code={activeHour.weathercode} isDay={activeHour.isDay} size={24} glow={false} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate leading-tight">
                      {info.label}
                    </span>
                    <span className="text-[9.5px] text-zinc-300 tabular-nums leading-tight mt-0.5">
                      <strong className="text-white font-bold">{activeHour.temp}°</strong>
                      <span className="text-zinc-400 ml-1.5">odcz. {activeHour.apparentTemp}°</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeHud();
                }}
                className="w-6 h-6 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
                title="Zamknij podgląd"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>

            {/* Bottom Cockpit Metrics Grid: 4 micro-cards (Chmury, Opady, Wiatr, Warunki) */}
            <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-white/10">
              {/* 1. Zachmurzenie */}
              <div className="flex flex-col justify-between p-1 rounded-lg bg-white/[0.04] border border-white/5 min-w-0">
                <div className="flex items-center gap-1 text-slate-300">
                  <Cloud size={10} className="text-slate-300 shrink-0" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 truncate">Chmury</span>
                </div>
                <span className="text-xs font-black text-white tabular-nums my-0.5">
                  {activeHour.cloudCover}%
                </span>
                <span className="text-[7.5px] text-slate-300/90 font-medium truncate leading-none">
                  {cloudInfo.label}
                </span>
              </div>

              {/* 2. Opady */}
              <div className="flex flex-col justify-between p-1 rounded-lg bg-white/[0.04] border border-white/5 min-w-0">
                <div className="flex items-center gap-1 text-cyan-400">
                  <Droplets size={10} className="text-cyan-400 shrink-0" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 truncate">Opady</span>
                </div>
                <span className="text-xs font-black text-cyan-300 tabular-nums my-0.5">
                  {activeHour.precipAmount > 0 ? `${activeHour.precipAmount.toFixed(1)} mm` : '0.0 mm'}
                </span>
                <span className="text-[7.5px] text-cyan-300/90 font-medium truncate leading-none tabular-nums">
                  {activeHour.precipProb}% szans
                </span>
              </div>

              {/* 3. Wiatr i porywy */}
              <div className="flex flex-col justify-between p-1 rounded-lg bg-white/[0.04] border border-white/5 min-w-0">
                <div className="flex items-center gap-1 text-emerald-400">
                  <Wind size={10} className="text-emerald-400 shrink-0" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 truncate">Wiatr</span>
                </div>
                <div className="flex items-center gap-0.5 my-0.5 leading-none">
                  <ArrowUp
                    size={8}
                    style={{ transform: `rotate(${activeHour.windDir + 180}deg)` }}
                    className="text-emerald-400 shrink-0"
                    strokeWidth={3}
                  />
                  <span className="text-xs font-black text-emerald-300 tabular-nums truncate">
                    {activeHour.windSpeed} <span className="text-[7.5px] font-normal text-zinc-400">km/h</span>
                  </span>
                </div>
                <span className="text-[7.5px] text-emerald-400/90 font-medium truncate leading-none tabular-nums">
                  por. {activeHour.windGusts} km/h
                </span>
              </div>

              {/* 4. Warunki / Wilgotność / Ciśnienie */}
              <div className="flex flex-col justify-between p-1 rounded-lg bg-white/[0.04] border border-white/5 min-w-0">
                <div className="flex items-center gap-1 text-amber-400">
                  <Gauge size={10} className="text-amber-400 shrink-0" />
                  <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 truncate">Warunki</span>
                </div>
                <span className="text-xs font-black text-zinc-100 tabular-nums my-0.5">
                  {activeHour.humidity}% <span className="text-[7.5px] font-normal text-zinc-400">wilg.</span>
                </span>
                <span className="text-[7.5px] text-zinc-300/90 font-medium truncate leading-none tabular-nums">
                  {activeHour.pressure} hPa{activeHour.uvIndex > 0 ? ` · UV ${activeHour.uvIndex}` : ''}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Unified Synchronized Horizontal Scroll Container with Touch Drag Scrubber */}
      <div
        ref={scrollContainerRef}
        data-no-swipe="true"
        onMouseDown={handleMouseDown}
        className="overflow-x-auto [&::-webkit-scrollbar]{display:none} relative py-0.5 select-none cursor-ew-resize touch-pan-x"
      >
        <div style={{ width: `${chartWidth}px` }} className="relative flex flex-col gap-1">
          
          {/* ================= 1. ROW OF HOURS ================= */}
          <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, ${colWidth}px)` }}>
            {hours.map((h, idx) => {
              const isCurrent = isToday && h.idx === currentIdx;
              const isScrubActive = activeHourIdx === idx;
              const isEvenHour = h.hourNum % 2 === 0;
              const shouldShowLabel = isCurrent || isScrubActive || isEvenHour;

              return (
                <div
                  key={h.idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (justFinishedDraggingRef.current) return;
                    openOrUpdateHud(idx);
                    scheduleAutoDismiss(7000);
                  }}
                  className={`flex flex-col items-center justify-center py-0.5 rounded-md transition-all cursor-pointer ${
                    isScrubActive
                      ? 'bg-cyan-500/40 border border-cyan-300 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.7)] scale-105 z-10'
                      : isCurrent
                      ? 'bg-blue-500/30 border border-blue-400/50 shadow-[0_0_8px_rgba(59,130,246,0.35)]'
                      : h.isDay
                      ? 'bg-white/[0.03] hover:bg-white/[0.08]'
                      : 'bg-zinc-950/40 border-b border-white/[0.04] hover:bg-zinc-900/50'
                  }`}
                >
                  {shouldShowLabel ? (
                    <span
                      className={`text-[9px] tabular-nums font-mono leading-tight ${
                        isScrubActive
                          ? 'text-cyan-100 font-black'
                          : isCurrent
                          ? 'text-blue-200 font-bold'
                          : h.isDay
                          ? 'text-zinc-200 font-semibold'
                          : 'text-zinc-400 font-medium'
                      }`}
                    >
                      {isCurrent ? 'Teraz' : h.hourNum.toString().padStart(2, '0')}
                    </span>
                  ) : (
                    <span className="text-[9px] text-zinc-600 font-bold leading-tight select-none">
                      ·
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* ================= 2. UPPER ZONE: TEMPERATURA + ZACHMURZENIE (PUŁAP Z GÓRY) + IKONY ================= */}
          <div className="relative w-full rounded-xl bg-zinc-900/40 border border-white/5 overflow-hidden">
            {/* SVG Visualizer for Cloud Cover & Temperature */}
            <div className="relative w-full" style={{ height: `${tempSvgHeight}px` }}>
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${chartWidth} ${tempSvgHeight}`}
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Temperature Gradient */}
                  <linearGradient id={`tempLineGrad-${dateStr}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    {hours.map((h, i) => {
                      const pct = ((i + 0.5) / hours.length) * 100;
                      return <stop key={i} offset={`${pct.toFixed(1)}%`} stopColor={getSmoothTempColor(h.temp)} />;
                    })}
                  </linearGradient>

                  {/* Temperature Area Glow */}
                  <linearGradient id={`tempAreaGrad-${dateStr}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
                    <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                  </linearGradient>

                  {/* Cloud Ceiling Gradient (Descending from top: darker misty veil down to translucent edge) */}
                  <linearGradient id={`cloudCeilingGrad-${dateStr}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.28" />
                    <stop offset="70%" stopColor="#94a3b8" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#64748b" stopOpacity="0.06" />
                  </linearGradient>
                </defs>

                {/* Night Sky Background Shading */}
                {hours.map((h, i) => {
                  if (h.isDay) return null;
                  return (
                    <rect
                      key={`night-${i}`}
                      x={i * colWidth}
                      y={0}
                      width={colWidth}
                      height={tempSvgHeight}
                      fill="#020617"
                      fillOpacity="0.18"
                    />
                  );
                })}

                {/* Reference Helper Lines: 50% (Y=27) and 100% (Y=54) Cloud Cover */}
                <line
                  x1="0"
                  y1="27"
                  x2={chartWidth}
                  y2="27"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="0.8"
                  strokeDasharray="2 3"
                />
                <line
                  x1="0"
                  y1="54"
                  x2={chartWidth}
                  y2="54"
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth="0.8"
                  strokeDasharray="2 3"
                />

                {/* Reference Labels on chart edge */}
                <text x="3" y="25" fill="rgba(203,213,225,0.4)" fontSize="6.5" fontStyle="italic" className="select-none">
                  50%
                </text>
                <text x="3" y="52" fill="rgba(203,213,225,0.4)" fontSize="6.5" fontStyle="italic" className="select-none">
                  100%
                </text>

                {/* Guide line for Current Hour (Teraz) */}
                {isToday && currentIdx >= 0 && (() => {
                  const curHourItem = hours.find(h => h.idx === currentIdx);
                  if (!curHourItem) return null;
                  const curX = hours.indexOf(curHourItem) * colWidth + colWidth / 2;
                  return (
                    <line
                      x1={curX}
                      y1={2}
                      x2={curX}
                      y2={tempSvgHeight}
                      stroke="#60a5fa"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.5"
                    />
                  );
                })()}

                {/* Guide line & Active Touch Scrubber for Touched Hour */}
                {activeHourIdx !== null && (() => {
                  const scrubX = activeHourIdx * colWidth + colWidth / 2;
                  return (
                    <line
                      x1={scrubX}
                      y1={0}
                      x2={scrubX}
                      y2={tempSvgHeight}
                      stroke="#22d3ee"
                      strokeWidth="1.6"
                      strokeDasharray="3 2"
                      className="drop-shadow-[0_0_6px_rgba(34,211,238,0.9)]"
                    />
                  );
                })()}

                {/* 1. CLOUD CEILING LAYER (SCHODZI OD GÓRY W DÓŁ PROPORCJONALNIE DO %) */}
                <path d={cloudCeilingAreaD} fill={`url(#cloudCeilingGrad-${dateStr})`} />
                <path
                  d={cloudSplineD}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                  strokeLinecap="round"
                  opacity="0.45"
                />

                {/* 2. TEMPERATURE LAYER (KRZYWA TEMPERATURY HERO) */}
                <path d={tempAreaD} fill={`url(#tempAreaGrad-${dateStr})`} />
                <path
                  d={tempSplineD}
                  fill="none"
                  stroke={`url(#tempLineGrad-${dateStr})`}
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  className="drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
                />

                {/* 3. TEMPERATURE NODES & DEGREE LABELS (FOR EVERY HOUR) */}
                {tempPoints.map((p, idx) => {
                  const isCurrent = isToday && hours[idx].idx === currentIdx;
                  const isPeak = idx === maxTempIdx;
                  const isLow = idx === minTempIdx && stats.maxTemp !== stats.minTemp;
                  const isScrubActive = activeHourIdx === idx;
                  const tColor = getSmoothTempColor(hours[idx].temp);

                  return (
                    <g key={idx}>
                      {isCurrent && (
                        <circle cx={p.x} cy={p.y} r="4.5" fill="none" stroke="#60a5fa" strokeWidth="1.5" className="animate-pulse" />
                      )}
                      {(isPeak || isLow) && (
                        <circle cx={p.x} cy={p.y} r="3.8" fill="none" stroke={tColor} strokeWidth="1" opacity="0.8" />
                      )}
                      {/* Active Scrubber Target Ring */}
                      {isScrubActive && (
                        <g>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="7.5"
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth="2"
                            className="drop-shadow-[0_0_8px_rgba(34,211,238,1)] animate-pulse"
                          />
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="3.5"
                            fill="#a5f3fc"
                          />
                        </g>
                      )}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isPeak || isCurrent || isScrubActive ? "2.5" : "2"}
                        fill={isScrubActive ? "#22d3ee" : tColor}
                        stroke="#09090b"
                        strokeWidth="1"
                      />
                      <text
                        x={p.x}
                        y={p.y - 5.5}
                        fill="#ffffff"
                        fontSize="8.5"
                        fontWeight={isPeak || isCurrent || isScrubActive ? "bold" : "600"}
                        textAnchor="middle"
                        className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                      >
                        {hours[idx].temp}°
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Compact Row of Weather Condition Icons */}
            <div
              className="grid py-0.5 border-t border-white/5 items-center text-center"
              style={{ gridTemplateColumns: `repeat(${hours.length}, ${colWidth}px)` }}
            >
              {hours.map((h) => (
                <div key={h.idx} className="flex items-center justify-center h-4.5">
                  <WeatherIcon code={h.weathercode} isDay={h.isDay} size={14} glow={false} />
                </div>
              ))}
            </div>
          </div>

          {/* ================= 3. LOWER ZONE: OPADY [mm / %] + WIATR [km/h] ================= */}
          <div className="rounded-xl bg-zinc-900/40 border border-white/5 p-1 flex flex-col gap-0.5">
            {/* Dynamic Width Rain Bars: Height = [mm], Width = [%] */}
            <div
              className="grid items-end h-9.5 px-0.5"
              style={{ gridTemplateColumns: `repeat(${hours.length}, ${colWidth}px)` }}
            >
              {hours.map((h, idx) => {
                const hasAmount = h.precipAmount > 0;
                // Height scales with mm (volume of rain)
                const barHeight = hasAmount
                  ? Math.max(3, Math.min(16, Math.round((h.precipAmount / maxRainCap) * 15)))
                  : 0;
                // Width scales dynamically with probability % (chance of rain)
                // 15% -> 5px, 50% -> 11px, 85% -> 18px, 100% -> 21px
                const barWidth = Math.max(4, Math.min(21, Math.round((h.precipProb / 100) * 17) + 4));

                return (
                  <div key={idx} className="flex flex-col items-center justify-end h-full">
                    {hasAmount ? (
                      <>
                        <span className="text-[7.5px] tabular-nums font-extrabold text-cyan-300 drop-shadow-[0_0_3px_rgba(34,211,238,0.7)] leading-none mb-0.5">
                          {h.precipAmount.toFixed(1)}
                        </span>
                        <div
                          className="rounded-t-sm bg-gradient-to-t from-blue-600 to-cyan-400 border-t border-x border-cyan-300/50 shadow-[0_0_5px_rgba(34,211,238,0.3)] transition-all"
                          style={{ height: `${barHeight}px`, width: `${barWidth}px` }}
                        />
                        <span className="text-[6.5px] text-cyan-200 font-semibold leading-none mt-0.5">
                          {h.precipProb}%
                        </span>
                      </>
                    ) : h.precipProb >= 20 ? (
                      <span className="text-[6.5px] text-cyan-400/60 leading-none mb-0.5">
                        {h.precipProb}%
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Visual Dynamic Wind Speed & Direction Row */}
            <div
              className="grid py-1 border-t border-white/5 items-center"
              style={{ gridTemplateColumns: `repeat(${hours.length}, ${colWidth}px)` }}
            >
              {hours.map((h, idx) => {
                const isScrubActive = activeHourIdx === idx;
                const windColor = getSmoothWindColor(h.windSpeed);
                const speedBarPercent = Math.min(100, Math.max(15, (h.windSpeed / 35) * 100));

                return (
                  <div
                    key={h.idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (justFinishedDraggingRef.current) return;
                      openOrUpdateHud(idx);
                      scheduleAutoDismiss(7000);
                    }}
                    className={`flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-lg transition-all cursor-pointer ${
                      isScrubActive ? 'ring-1.5 ring-cyan-400 bg-cyan-500/25 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'hover:bg-white/10'
                    }`}
                    style={{
                      backgroundColor: isScrubActive ? undefined : `${windColor}14`,
                    }}
                    title={`Wiatr: ${h.windSpeed} km/h, kierunek: ${h.windDir}°`}
                  >
                    {/* Direction arrow + Speed with dynamic color */}
                    <div className="flex items-center gap-0.5">
                      <ArrowUp
                        size={8}
                        style={{
                          transform: `rotate(${h.windDir + 180}deg)`,
                          color: windColor,
                        }}
                        className="shrink-0 transition-transform"
                        strokeWidth={3}
                      />
                      <span
                        style={{ color: windColor }}
                        className="text-[8.5px] font-mono tabular-nums font-extrabold leading-none"
                      >
                        {h.windSpeed}
                      </span>
                    </div>

                    {/* Visual speed intensity bar */}
                    <div className="w-4 h-1 bg-white/10 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${speedBarPercent}%`,
                          backgroundColor: windColor,
                          boxShadow: `0 0 4px ${windColor}90`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
