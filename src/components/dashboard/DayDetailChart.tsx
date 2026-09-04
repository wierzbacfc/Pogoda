'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { HourlyData } from '@/lib/types';
import { ArrowUp } from 'lucide-react';
import { WeatherIcon } from '@/components/ui/WeatherIcon';

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

// Wind speed color gradient
const WIND_COLOR_STOPS: ColorStop[] = [
  { value: 0,  rgb: [156, 163, 175] }, // Muted gray
  { value: 8,  rgb: [125, 180, 215] }, // Gentle slate
  { value: 14, rgb: [56, 189, 248] },  // Sky blue
  { value: 20, rgb: [45, 212, 191] },  // Fresh teal
  { value: 28, rgb: [251, 191, 36] },  // Gold
  { value: 38, rgb: [251, 146, 60] },  // Orange
  { value: 50, rgb: [248, 113, 113] }, // Red
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
        });
      }
    }
    return list;
  }, [hourlyData, dateStr]);

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

      {/* Unified Synchronized Horizontal Scroll Container */}
      <div
        ref={scrollContainerRef}
        data-no-swipe="true"
        className="overflow-x-auto [&::-webkit-scrollbar]{display:none} relative py-0.5 select-none"
      >
        <div style={{ width: `${chartWidth}px` }} className="relative flex flex-col gap-1">
          
          {/* ================= 1. ROW OF HOURS ================= */}
          <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, ${colWidth}px)` }}>
            {hours.map((h) => {
              const isCurrent = isToday && h.idx === currentIdx;
              return (
                <div
                  key={h.idx}
                  className={`flex flex-col items-center justify-center py-0.5 rounded-md transition-all ${
                    isCurrent
                      ? 'bg-blue-500/30 border border-blue-400/50 shadow-[0_0_8px_rgba(59,130,246,0.35)]'
                      : h.isDay
                      ? 'bg-white/[0.03]'
                      : 'bg-zinc-950/40 border-b border-white/[0.04]'
                  }`}
                >
                  <span
                    className={`text-[9px] tabular-nums font-mono leading-tight ${
                      isCurrent
                        ? 'text-blue-200 font-bold'
                        : h.isDay
                        ? 'text-zinc-200 font-medium'
                        : 'text-zinc-400 font-normal'
                    }`}
                  >
                    {isCurrent ? 'Teraz' : h.timeLabel}
                  </span>
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

                {/* 3. TEMPERATURE NODES & DEGREE LABELS */}
                {tempPoints.map((p, idx) => {
                  const isCurrent = isToday && hours[idx].idx === currentIdx;
                  const isPeak = idx === maxTempIdx;
                  const isLow = idx === minTempIdx && stats.maxTemp !== stats.minTemp;
                  const tColor = getSmoothTempColor(hours[idx].temp);

                  return (
                    <g key={idx}>
                      {isCurrent && (
                        <circle cx={p.x} cy={p.y} r="4.5" fill="none" stroke="#60a5fa" strokeWidth="1.5" className="animate-pulse" />
                      )}
                      {(isPeak || isLow) && (
                        <circle cx={p.x} cy={p.y} r="3.8" fill="none" stroke={tColor} strokeWidth="1" opacity="0.8" />
                      )}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isPeak || isCurrent ? "2.5" : "2"}
                        fill={tColor}
                        stroke="#09090b"
                        strokeWidth="1"
                      />
                      <text
                        x={p.x}
                        y={p.y - 5.5}
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

            {/* Compact Wind Speed & Direction Row */}
            <div
              className="grid py-0.5 border-t border-white/5 items-center"
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
                      size={6.5}
                      style={{
                        transform: `rotate(${h.windDir + 180}deg)`,
                        color: windColor,
                      }}
                      className="shrink-0 transition-transform"
                      strokeWidth={2.5}
                    />
                    <span
                      style={{ color: windColor }}
                      className="text-[7.5px] font-mono tabular-nums font-semibold leading-none"
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
    </div>
  );
}
