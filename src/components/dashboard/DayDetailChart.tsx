'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { HourlyData } from '@/lib/types';
import { ArrowUp } from 'lucide-react';

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

// Smooth temperature color gradient:
// Sub-zero frost (violet/indigo) -> cool sky -> soft teal -> warm gold -> rich amber -> sunset coral
const TEMP_COLOR_STOPS: ColorStop[] = [
  { value: -10, rgb: [167, 139, 250] }, // -10°C: Violet frost (violet-400)
  { value: -2,  rgb: [129, 140, 248] }, // -2°C:  Cold indigo (indigo-400)
  { value: 4,   rgb: [96, 165, 250] },  // 4°C:   Chilly blue (blue-400)
  { value: 10,  rgb: [56, 189, 248] },  // 10°C:  Crisp sky (sky-400)
  { value: 16,  rgb: [45, 212, 191] },  // 16°C:  Soft teal (teal-400)
  { value: 21,  rgb: [251, 191, 36] },  // 21°C:  Warm gold (amber-400)
  { value: 26,  rgb: [251, 146, 60] },  // 26°C:  Warm amber-orange (orange-400)
  { value: 32,  rgb: [248, 113, 113] }, // 32°C:  Warm coral (red-400)
  { value: 38,  rgb: [244, 63, 94] },   // 38°C:  Hot crimson-rose (rose-500)
];

function getSmoothTempColor(temp: number): string {
  return interpolateMultiStops(temp, TEMP_COLOR_STOPS);
}

// Smooth wind speed color gradient:
// Calm (muted zinc) -> Gentle (soft slate) -> Moderate (sky blue) -> Brisk (teal) -> Strong (gold) -> Gale (coral)
const WIND_COLOR_STOPS: ColorStop[] = [
  { value: 0,  rgb: [156, 163, 175] }, // 0 km/h: calm muted gray (zinc-400)
  { value: 7,  rgb: [125, 180, 215] }, // 7 km/h: gentle cool slate
  { value: 13, rgb: [56, 189, 248] },  // 13 km/h: fresh sky blue (sky-400)
  { value: 19, rgb: [45, 212, 191] },  // 19 km/h: brisk soft teal (teal-400)
  { value: 27, rgb: [251, 191, 36] },  // 27 km/h: warm gold (amber-400)
  { value: 37, rgb: [251, 146, 60] },  // 37 km/h: strong orange (orange-400)
  { value: 50, rgb: [248, 113, 113] }, // 50+ km/h: gale coral (red-400)
];

function getSmoothWindColor(speed: number): string {
  return interpolateMultiStops(speed, WIND_COLOR_STOPS);
}

// Geometry configuration: 28px colWidth to fit 12-14 hours on screen simultaneously
const COL_WIDTH = 28;

export function DayDetailChart({ dateStr, isToday, currentIdx, hourlyData }: DayDetailChartProps) {
  const colWidth = COL_WIDTH;
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll screen so the expanded chart is not hidden behind the bottom toolbar
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

  // Extract all hours matching the selected date
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
          timeLabel: hourNum.toString().padStart(2, '0'),
          temp: Math.round(hourlyData.temperature_2m[i] ?? 0),
          apparentTemp: Math.round(hourlyData.apparent_temperature?.[i] ?? hourlyData.temperature_2m[i] ?? 0),
          weathercode: hourlyData.weathercode[i] ?? 0,
          isDay: hourlyData.is_day[i] === 1,
          cloudCover: Math.round(hourlyData.cloudcover?.[i] ?? 0),
          precipAmount: hourlyData.precipitation?.[i] ?? 0,
          precipProb: hourlyData.precipitation_probability?.[i] ?? 0,
          windSpeed: Math.round(hourlyData.windspeed_10m?.[i] ?? 0),
          windDir: Math.round(hourlyData.winddirection_10m?.[i] ?? 0),
        });
      }
    }
    return list;
  }, [hourlyData, dateStr]);

  // Daily statistics for summary header
  const stats = useMemo(() => {
    if (hours.length === 0) {
      return { minTemp: 0, maxTemp: 0, avgCloud: 0, totalRain: 0, maxRain: 0, hasRain: false };
    }
    const temps = hours.map((h) => h.temp);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const totalRain = hours.reduce((acc, h) => acc + h.precipAmount, 0);
    const maxRain = Math.max(...hours.map((h) => h.precipAmount));
    const avgCloud = Math.round(hours.reduce((acc, h) => acc + h.cloudCover, 0) / hours.length);
    const hasRain = totalRain > 0.1 || hours.some((h) => h.precipProb >= 20);

    return { minTemp, maxTemp, avgCloud, totalRain, maxRain, hasRain };
  }, [hours]);

  // Auto-scroll horizontal chart: "Teraz" on the left for today, 6:00 AM on the left for other days
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
      <div className="p-4 text-center text-xs text-zinc-500 bg-white/[0.02] rounded-2xl border border-white/5 my-2">
        Brak szczegółowych danych godzinowych dla tego dnia.
      </div>
    );
  }

  const chartWidth = hours.length * colWidth;
  const svgHeight = 100;

  // Temperature scale mapping (HERO chart with plenty of breathing room)
  const tempSpan = Math.max(3, stats.maxTemp - stats.minTemp);
  const getTempY = (t: number) => {
    // Maps temperature comfortably between Y=20 (maxTemp) and Y=58 (minTemp)
    return 58 - ((t - stats.minTemp) / tempSpan) * 38;
  };

  // Cloud cover scale mapping (subtle background reference)
  const getCloudY = (c: number) => {
    return 64 - (c / 100) * 44;
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

  // Gradient areas
  const firstX = tempPoints[0]?.x ?? 0;
  const lastX = tempPoints[tempPoints.length - 1]?.x ?? chartWidth;
  const tempAreaD = `${tempSplineD} L ${lastX.toFixed(1)} 68 L ${firstX.toFixed(1)} 68 Z`;
  const cloudAreaD = `${cloudSplineD} L ${lastX.toFixed(1)} 68 L ${firstX.toFixed(1)} 68 Z`;

  // Find peak and lowest temperature points to highlight
  const maxTempIdx = hours.findIndex(h => h.temp === stats.maxTemp);
  const minTempIdx = hours.findIndex(h => h.temp === stats.minTemp);

  // Max rain cap for bar scaling
  const maxRainCap = Math.max(1.5, Math.ceil(stats.maxRain * 1.25 * 10) / 10);

  return (
    <div
      ref={containerRef}
      className="my-2 -mx-2.5 sm:-mx-3.5 p-2 sm:p-2.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex flex-col gap-1"
    >
      {/* Header with Title, Range & Compact Legend */}
      <div className="flex items-center justify-between px-2 pt-0.5 pb-1.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-white tracking-wider uppercase">
            Przebieg doby (24h)
          </span>
          <span className="text-[8.5px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/5 font-mono text-zinc-400">
            <strong className="text-amber-300">{stats.maxTemp}°</strong> / <span className="text-cyan-300">{stats.minTemp}°</span>
          </span>
        </div>

        {/* Compact Legend */}
        <div className="flex items-center gap-2.5 text-[8px] text-zinc-400 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 rounded-full bg-gradient-to-r from-sky-400 to-amber-400 shadow-[0_0_3px_rgba(56,189,248,0.5)]" />
            <span className="text-zinc-300">Temp</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-xs bg-cyan-400/90" />
            <span className="text-cyan-300">Opady</span>
          </span>
          <span className="flex items-center gap-1">
            <ArrowUp size={7.5} className="text-zinc-400 rotate-45" />
            <span className="text-zinc-300">Wiatr</span>
          </span>
        </div>
      </div>

      {/* Horizontally Scrollable Chart Area */}
      <div
        ref={scrollContainerRef}
        data-no-swipe="true"
        className="overflow-x-auto [&::-webkit-scrollbar]{display:none} relative py-1 rounded-xl bg-white/[0.01]"
      >
        <div style={{ width: `${chartWidth}px` }} className="relative flex flex-col select-none">
          {/* Top Row: Hours with Day/Night and Current Hour indicator */}
          <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, ${colWidth}px)` }}>
            {hours.map((h) => {
              const isCurrent = isToday && h.idx === currentIdx;
              return (
                <div
                  key={h.idx}
                  data-current={isCurrent ? 'true' : undefined}
                  className={`flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
                    isCurrent
                      ? 'bg-blue-500/25 border border-blue-400/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                      : h.isDay
                      ? 'bg-white/[0.03] border border-white/5'
                      : 'bg-black/25 border border-white/[0.02]'
                  }`}
                >
                  <span
                    className={`text-[9px] tabular-nums font-mono leading-tight ${
                      isCurrent
                        ? 'text-blue-100 font-bold'
                        : h.isDay
                        ? 'text-zinc-200 font-medium'
                        : 'text-zinc-500 font-normal'
                    }`}
                  >
                    {isCurrent ? 'Teraz' : h.timeLabel}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Unified SVG Visualizer Layer: Prominent Dynamic Temperature Hero + Subtle Clouds */}
          <div className="relative w-full" style={{ height: `${svgHeight}px` }}>
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${chartWidth} ${svgHeight}`}
              preserveAspectRatio="none"
            >
              <defs>
                {/* Dynamic Temperature Horizontal Gradient (adapts smoothly to temperature across the day) */}
                <linearGradient id={`tempLineGrad-${dateStr}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  {hours.map((h, i) => {
                    const pct = ((i + 0.5) / hours.length) * 100;
                    return <stop key={i} offset={`${pct.toFixed(1)}%`} stopColor={getSmoothTempColor(h.temp)} />;
                  })}
                </linearGradient>

                {/* Temperature Gradient Area (Subtle glassmorphic depth glow) */}
                <linearGradient id={`tempAreaGrad-${dateStr}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.16" />
                  <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                </linearGradient>

                {/* Cloud Cover Gradient Area (Subtle background) */}
                <linearGradient id={`cloudAreaGrad-${dateStr}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Night Sky Background Shading across night hours */}
              {hours.map((h, i) => {
                if (h.isDay) return null;
                return (
                  <rect
                    key={`night-${i}`}
                    x={i * colWidth}
                    y={0}
                    width={colWidth}
                    height={svgHeight}
                    fill="#020617"
                    fillOpacity="0.22"
                  />
                );
              })}

              {/* Horizontal Reference Grid Lines */}
              <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <line x1="0" y1="39" x2={chartWidth} y2="39" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
              <line x1="0" y1="58" x2={chartWidth} y2="58" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

              {/* Guide Line for Current Hour (Teraz) */}
              {isToday && currentIdx >= 0 && (() => {
                const curHourItem = hours.find(h => h.idx === currentIdx);
                if (!curHourItem) return null;
                const curX = hours.indexOf(curHourItem) * colWidth + colWidth / 2;
                return (
                  <line
                    x1={curX}
                    y1={6}
                    x2={curX}
                    y2={svgHeight}
                    stroke="#3b82f6"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.45"
                  />
                );
              })()}

              {/* 1. Subtle Cloud Cover Line in Background (dashed, non-dominating) */}
              <path d={cloudAreaD} fill={`url(#cloudAreaGrad-${dateStr})`} />
              <path
                d={cloudSplineD}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeLinecap="round"
                opacity="0.35"
              />

              {/* 2. Temperature Area & Glowing Dynamic Gradient Spline (HERO) */}
              <path d={tempAreaD} fill={`url(#tempAreaGrad-${dateStr})`} />
              <path
                d={tempSplineD}
                fill="none"
                stroke={`url(#tempLineGrad-${dateStr})`}
                strokeWidth="2.4"
                strokeLinecap="round"
                className="drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
              />

              {/* 3. Temperature Nodes & Degree Labels (Dynamic Smooth Gradient) */}
              {tempPoints.map((p, idx) => {
                const isCurrent = isToday && hours[idx].idx === currentIdx;
                const isPeak = idx === maxTempIdx;
                const isLow = idx === minTempIdx && stats.maxTemp !== stats.minTemp;
                const tColor = getSmoothTempColor(hours[idx].temp);

                return (
                  <g key={idx}>
                    {/* Current Hour Pulse */}
                    {isCurrent && (
                      <circle cx={p.x} cy={p.y} r="5" fill="none" stroke="#60a5fa" strokeWidth="1.5" className="animate-pulse" />
                    )}

                    {/* Peak / Low Highlight Halos */}
                    {(isPeak || isLow) && (
                      <circle cx={p.x} cy={p.y} r="4.2" fill="none" stroke={tColor} strokeWidth="1" opacity="0.75" />
                    )}

                    {/* Main Dot with matching dynamic temperature color */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isPeak || isCurrent ? "2.8" : "2.2"}
                      fill={tColor}
                      stroke="#09090b"
                      strokeWidth="1"
                    />

                    {/* Degree Label: Clean crisp white text for perfect clarity and elegance */}
                    <text
                      x={p.x}
                      y={p.y - 6}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight={isPeak || isCurrent ? "bold" : "600"}
                      textAnchor="middle"
                      className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                    >
                      {hours[idx].temp}°
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Precipitation Columns: ONLY mm amount and bars, anchored directly to bottom baseline */}
            <div
              className="absolute inset-0 grid pointer-events-none"
              style={{ gridTemplateColumns: `repeat(${hours.length}, ${colWidth}px)` }}
            >
              {hours.map((h, idx) => {
                const hasAmount = h.precipAmount > 0;
                const barHeight = hasAmount
                  ? Math.max(6, Math.min(24, Math.round((h.precipAmount / maxRainCap) * 22)))
                  : 0;

                return (
                  <div key={idx} className="flex flex-col items-center justify-end h-full pb-0.5">
                    {hasAmount ? (
                      <>
                        <span className="text-[7.5px] tabular-nums font-extrabold text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.8)] leading-none mb-0.5">
                          {h.precipAmount.toFixed(1)}mm
                        </span>
                        <div
                          className="w-3 rounded-t-sm bg-gradient-to-t from-blue-600 to-cyan-400 border-t border-x border-cyan-300/50 shadow-[0_0_6px_rgba(34,211,238,0.4)]"
                          style={{ height: `${barHeight}px` }}
                        />
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 1: Dedicated Precipitation Probability (%) Row (directly under rain bars) */}
          <div
            className="grid py-1 border-t border-white/10 items-center"
            style={{ gridTemplateColumns: `repeat(${hours.length}, ${colWidth}px)` }}
          >
            {hours.map((h) => (
              <div
                key={h.idx}
                className="flex flex-col items-center justify-center py-0.5 px-0.5"
              >
                {h.precipProb >= 15 ? (
                  <span
                    className={`text-[8px] tabular-nums leading-none ${
                      h.precipProb >= 70
                        ? 'text-cyan-200 font-extrabold drop-shadow-[0_0_4px_rgba(34,211,238,0.5)]'
                        : h.precipProb >= 40
                        ? 'text-cyan-300 font-semibold'
                        : 'text-cyan-400/75 font-medium'
                    }`}
                  >
                    {h.precipProb}%
                  </span>
                ) : (
                  <span className="text-[7.5px] text-zinc-600 leading-none">·</span>
                )}
              </div>
            ))}
          </div>

          {/* Row 2: Dedicated Wind Speed Row [km/h] with Smooth Direction Arrows & Values Gradient */}
          <div
            className="grid py-1 border-t border-white/5 items-center"
            style={{ gridTemplateColumns: `repeat(${hours.length}, ${colWidth}px)` }}
          >
            {hours.map((h) => {
              const windColor = getSmoothWindColor(h.windSpeed);
              return (
                <div
                  key={h.idx}
                  className="flex items-center justify-center gap-0.5 py-0.5 px-0.5"
                  title={`Wiatr: ${h.windSpeed} km/h, kierunek: ${h.windDir}°`}
                >
                  <ArrowUp
                    size={7.5}
                    style={{
                      transform: `rotate(${h.windDir + 180}deg)`,
                      color: windColor,
                    }}
                    className="shrink-0 transition-transform"
                    strokeWidth={2.5}
                  />
                  <span
                    style={{ color: windColor }}
                    className="text-[8.5px] font-mono tabular-nums font-semibold leading-none"
                  >
                    {h.windSpeed}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
