'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { HourlyData } from '@/lib/types';
import { WeatherIcon } from '@/components/ui/WeatherIcon';
import { Cloud, CloudRain, Droplets, Thermometer, Wind } from 'lucide-react';
import { getCloudCoverInfo } from '@/lib/utils';

interface DayDetailChartProps {
  dateStr: string;
  isToday: boolean;
  currentIdx: number;
  hourlyData: HourlyData;
}

type ChartMode = 'all' | 'temp' | 'clouds' | 'precip';

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

export function DayDetailChart({ dateStr, isToday, currentIdx, hourlyData }: DayDetailChartProps) {
  const [mode, setMode] = useState<ChartMode>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentHourRef = useRef<HTMLDivElement>(null);

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
          timeLabel: `${hourNum.toString().padStart(2, '0')}:00`,
          temp: Math.round(hourlyData.temperature_2m[i] ?? 0),
          apparentTemp: Math.round(hourlyData.apparent_temperature?.[i] ?? hourlyData.temperature_2m[i] ?? 0),
          weathercode: hourlyData.weathercode[i] ?? 0,
          isDay: hourlyData.is_day[i] === 1,
          cloudCover: Math.round(hourlyData.cloudcover?.[i] ?? 0),
          precipAmount: hourlyData.precipitation?.[i] ?? 0,
          precipProb: hourlyData.precipitation_probability?.[i] ?? 0,
          windSpeed: Math.round(hourlyData.windspeed_10m?.[i] ?? 0),
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

  // Auto-scroll to current hour when expanding today's date
  useEffect(() => {
    if (isToday && currentHourRef.current) {
      currentHourRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [isToday]);

  if (hours.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-zinc-500 bg-white/[0.02] rounded-2xl border border-white/5 my-2">
        Brak szczegółowych danych godzinowych dla tego dnia.
      </div>
    );
  }

  // Geometry configuration
  const colWidth = 46;
  const chartWidth = hours.length * colWidth;
  const svgHeight = 126;

  // Temperature scale mapping
  const tempSpan = Math.max(2, stats.maxTemp - stats.minTemp);
  const getTempY = (t: number) => {
    // Map temp into Y range [20, 66] (leaving lower area for rain bars and cloud status)
    return 66 - ((t - stats.minTemp) / tempSpan) * 44;
  };

  // Cloud cover scale mapping (0-100% -> Y range [18, 76])
  const getCloudY = (c: number) => {
    return 76 - (c / 100) * 56;
  };

  // Precip probability scale mapping (0-100% -> Y range [18, 76])
  const getPrecipY = (p: number) => {
    return 76 - (p / 100) * 56;
  };

  // SVG Points
  const tempPoints = hours.map((h, i) => ({
    x: i * colWidth + colWidth / 2,
    y: getTempY(h.temp),
  }));

  const apparentTempPoints = hours.map((h, i) => ({
    x: i * colWidth + colWidth / 2,
    y: getTempY(h.apparentTemp),
  }));

  const cloudPoints = hours.map((h, i) => ({
    x: i * colWidth + colWidth / 2,
    y: getCloudY(h.cloudCover),
  }));

  const precipPoints = hours.map((h, i) => ({
    x: i * colWidth + colWidth / 2,
    y: getPrecipY(h.precipProb),
  }));

  const tempSplineD = getSvgSpline(tempPoints);
  const apparentTempSplineD = getSvgSpline(apparentTempPoints);
  const cloudSplineD = getSvgSpline(cloudPoints);
  const precipSplineD = getSvgSpline(precipPoints);

  // Gradient area under temperature curve
  const firstX = tempPoints[0]?.x ?? 0;
  const lastX = tempPoints[tempPoints.length - 1]?.x ?? chartWidth;
  const tempAreaD = `${tempSplineD} L ${lastX.toFixed(1)} 76 L ${firstX.toFixed(1)} 76 Z`;
  const cloudAreaD = `${cloudSplineD} L ${lastX.toFixed(1)} 78 L ${firstX.toFixed(1)} 78 Z`;
  const precipAreaD = `${precipSplineD} L ${lastX.toFixed(1)} 78 L ${firstX.toFixed(1)} 78 Z`;

  // Max rain cap for bar scaling
  const maxRainCap = Math.max(1.5, Math.ceil(stats.maxRain * 1.25 * 10) / 10);
  const cloudSummary = getCloudCoverInfo(stats.avgCloud);

  return (
    <div ref={containerRef} className="my-2 p-3 rounded-2xl bg-zinc-950/75 border border-white/10 backdrop-blur-xl animate-in slide-in-from-top-1 fade-in duration-200 shadow-xl flex flex-col gap-2">
      {/* Header with Title, Mode Switcher & Stats */}
      <div className="flex flex-col gap-2 pb-2 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
              Przebieg doby (24h)
            </span>
          </div>

          {/* Metric View Mode Pills */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/5">
            <button
              onClick={() => setMode('all')}
              className={`px-2 py-0.5 text-[9px] font-semibold rounded-md transition-all ${
                mode === 'all'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Wszystko
            </button>
            <button
              onClick={() => setMode('temp')}
              className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-md transition-all ${
                mode === 'temp'
                  ? 'bg-amber-500/80 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Temp
            </button>
            <button
              onClick={() => setMode('clouds')}
              className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-md transition-all ${
                mode === 'clouds'
                  ? 'bg-slate-500/80 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Chmury
            </button>
            <button
              onClick={() => setMode('precip')}
              className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-md transition-all ${
                mode === 'precip'
                  ? 'bg-cyan-500/80 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Opady
            </button>
          </div>
        </div>

        {/* Quick Day Stats Badges */}
        <div className="flex items-center justify-between text-[10px] text-zinc-400 px-0.5">
          <div className="flex items-center gap-1">
            <Thermometer size={11} className="text-amber-400" />
            <span className="font-medium">
              {stats.minTemp}° do <strong className="text-zinc-200">{stats.maxTemp}°</strong>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Cloud size={11} className="text-slate-300" />
            <span className="font-medium">
              {cloudSummary.label} ({stats.avgCloud}%)
            </span>
          </div>

          <div className="flex items-center gap-1">
            <CloudRain size={11} className="text-cyan-400" />
            <span className="font-medium">
              {stats.totalRain > 0 ? (
                <strong className="text-cyan-300">{stats.totalRain.toFixed(1)} mm</strong>
              ) : (
                <span className="text-emerald-400/90">Sucho ✨</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Horizontally Scrollable Chart Area */}
      <div
        ref={scrollContainerRef}
        data-no-swipe="true"
        className="overflow-x-auto [&::-webkit-scrollbar]{display:none} relative py-1 rounded-xl bg-white/[0.01]"
      >
        <div style={{ width: `${chartWidth}px` }} className="relative flex flex-col select-none">
          {/* Top Row: Hours and Weather Icons */}
          <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, ${colWidth}px)` }}>
            {hours.map((h) => {
              const isCurrent = isToday && h.idx === currentIdx;
              return (
                <div
                  key={h.idx}
                  ref={isCurrent ? currentHourRef : null}
                  data-current={isCurrent ? 'true' : undefined}
                  className={`flex flex-col items-center gap-1 pb-1 pt-0.5 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-blue-500/15 border border-blue-400/40 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <span
                    className={`text-[10px] tabular-nums font-semibold ${
                      isCurrent ? 'text-blue-300 font-bold' : 'text-zinc-400'
                    }`}
                  >
                    {isCurrent ? 'Teraz' : h.timeLabel}
                  </span>
                  <div className="my-0.5">
                    <WeatherIcon code={h.weathercode} isDay={h.isDay} size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unified SVG Visualizer Layer */}
          <div className="relative w-full" style={{ height: `${svgHeight}px` }}>
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${chartWidth} ${svgHeight}`}
              preserveAspectRatio="none"
            >
              <defs>
                {/* Temperature Gradient Area */}
                <linearGradient id={`tempAreaGrad-${dateStr}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
                  <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>

                {/* Cloud Cover Gradient Area */}
                <linearGradient id={`cloudAreaGrad-${dateStr}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.25" />
                  <stop offset="80%" stopColor="#94a3b8" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
                </linearGradient>

                {/* Precipitation Probability Area */}
                <linearGradient id={`precipAreaGrad-${dateStr}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                  <stop offset="85%" stopColor="#06b6d4" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Horizontal Reference Grid Lines */}
              <line x1="0" y1="22" x2={chartWidth} y2="22" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1="0" y1="44" x2={chartWidth} y2="44" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <line x1="0" y1="66" x2={chartWidth} y2="66" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              {/* Baseline */}
              <line x1="0" y1="104" x2={chartWidth} y2="104" stroke="rgba(255,255,255,0.08)" />

              {/* --- MODE: CLOUDS ONLY --- */}
              {mode === 'clouds' && (
                <>
                  <path d={cloudAreaD} fill={`url(#cloudAreaGrad-${dateStr})`} />
                  <path
                    d={cloudSplineD}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_6px_rgba(148,163,184,0.5)]"
                  />
                  {cloudPoints.map((p, idx) => (
                    <g key={idx}>
                      <circle cx={p.x} cy={p.y} r="2.5" fill="#94a3b8" stroke="#09090b" strokeWidth="1" />
                      <text
                        x={p.x}
                        y={Math.max(12, p.y - 5)}
                        fill="#cbd5e1"
                        fontSize="8.5"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {hours[idx].cloudCover}%
                      </text>
                    </g>
                  ))}
                </>
              )}

              {/* --- MODE: PRECIP ONLY --- */}
              {mode === 'precip' && (
                <>
                  {stats.hasRain && <path d={precipAreaD} fill={`url(#precipAreaGrad-${dateStr})`} />}
                  <path
                    d={precipSplineD}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]"
                  />
                  {precipPoints.map((p, idx) => {
                    const prob = hours[idx].precipProb;
                    if (prob < 15) return null;
                    return (
                      <g key={idx}>
                        <circle cx={p.x} cy={p.y} r="2.5" fill="#06b6d4" stroke="#09090b" strokeWidth="1" />
                        <text
                          x={p.x}
                          y={Math.max(12, p.y - 5)}
                          fill="#67e8f9"
                          fontSize="8.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {prob}%
                        </text>
                      </g>
                    );
                  })}
                </>
              )}

              {/* --- MODE: TEMP ONLY --- */}
              {mode === 'temp' && (
                <>
                  {/* Apparent Temp Dashed Curve */}
                  <path
                    d={apparentTempSplineD}
                    fill="none"
                    stroke="#a78bfa"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                  {/* Actual Temp Area & Curve */}
                  <path d={tempAreaD} fill={`url(#tempAreaGrad-${dateStr})`} />
                  <path
                    d={tempSplineD}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                  />
                  {tempPoints.map((p, idx) => {
                    const isCurrent = isToday && hours[idx].idx === currentIdx;
                    return (
                      <g key={idx}>
                        {isCurrent && (
                          <circle cx={p.x} cy={p.y} r="6" fill="none" stroke="#60a5fa" strokeWidth="1.5" className="animate-pulse" />
                        )}
                        <circle cx={p.x} cy={p.y} r="3" fill="#fbbf24" stroke="#09090b" strokeWidth="1" />
                        <text
                          x={p.x}
                          y={p.y - 6}
                          fill="#ffffff"
                          fontSize="9.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {hours[idx].temp}°
                        </text>
                      </g>
                    );
                  })}
                </>
              )}

              {/* --- MODE: ALL (COMBINED DEFAULT) --- */}
              {mode === 'all' && (
                <>
                  {/* Subtle Cloud Cover Backfill */}
                  <path d={cloudAreaD} fill={`url(#cloudAreaGrad-${dateStr})`} opacity="0.4" />

                  {/* Temperature Area & Glowing Spline */}
                  <path d={tempAreaD} fill={`url(#tempAreaGrad-${dateStr})`} />
                  <path
                    d={tempSplineD}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                  />

                  {/* Temperature Nodes & Degree Labels */}
                  {tempPoints.map((p, idx) => {
                    const isCurrent = isToday && hours[idx].idx === currentIdx;
                    return (
                      <g key={idx}>
                        {isCurrent && (
                          <circle cx={p.x} cy={p.y} r="5.5" fill="none" stroke="#60a5fa" strokeWidth="1.5" className="animate-pulse" />
                        )}
                        <circle cx={p.x} cy={p.y} r="2.8" fill="#fbbf24" stroke="#09090b" strokeWidth="1" />
                        <text
                          x={p.x}
                          y={p.y - 6}
                          fill="#ffffff"
                          fontSize="9.5"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {hours[idx].temp}°
                        </text>
                      </g>
                    );
                  })}
                </>
              )}
            </svg>

            {/* Precipitation Columns (Overlay anchored to baseline) */}
            <div
              className="absolute inset-0 grid pointer-events-none"
              style={{ gridTemplateColumns: `repeat(${hours.length}, ${colWidth}px)` }}
            >
              {hours.map((h, idx) => {
                const hasAmount = h.precipAmount > 0;
                const hasProb = h.precipProb >= 15;
                const barHeight = hasAmount
                  ? Math.max(7, Math.min(26, Math.round((h.precipAmount / maxRainCap) * 24)))
                  : hasProb
                  ? 3
                  : 0;

                return (
                  <div key={idx} className="flex flex-col items-center justify-end h-[104px] pb-0.5">
                    {/* MM amount or Probability text */}
                    {hasAmount ? (
                      <span className="text-[7.5px] tabular-nums font-bold text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.7)] leading-none mb-0.5">
                        {h.precipAmount.toFixed(1)}
                      </span>
                    ) : hasProb ? (
                      <span className="text-[7px] tabular-nums font-semibold text-cyan-400/80 leading-none mb-0.5">
                        {h.precipProb}%
                      </span>
                    ) : (
                      <span className="text-[7px] text-zinc-700 leading-none mb-0.5">·</span>
                    )}

                    {/* Translucent Glass Bar for Rain */}
                    {barHeight > 0 && (
                      <div
                        className={`w-3 rounded-t-sm transition-all duration-300 ${
                          hasAmount
                            ? 'bg-gradient-to-t from-blue-600/90 to-cyan-400/80 border-t border-x border-cyan-300/50 shadow-[0_0_6px_rgba(34,211,238,0.4)]'
                            : 'bg-cyan-500/25 rounded-full'
                        }`}
                        style={{ height: `${barHeight}px` }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Indicators Row: Cloud Cover and Rain Details */}
          <div
            className="grid pt-1 border-t border-white/5"
            style={{ gridTemplateColumns: `repeat(${hours.length}, ${colWidth}px)` }}
          >
            {hours.map((h) => {
              const isCurrent = isToday && h.idx === currentIdx;
              return (
                <div
                  key={h.idx}
                  className={`flex flex-col items-center gap-1 py-1 px-0.5 rounded-lg transition-all ${
                    isCurrent ? 'bg-blue-500/10' : ''
                  }`}
                >
                  {/* Cloud cover metric & mini gauge */}
                  <div className="flex items-center gap-0.5 text-[8.5px] font-medium text-slate-300">
                    <Cloud size={8} className="text-slate-400" />
                    <span>{h.cloudCover}%</span>
                  </div>

                  <div className="w-6 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-slate-300 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(10, h.cloudCover))}%` }}
                    />
                  </div>

                  {/* Wind / Rain info */}
                  <div className="text-[8px] text-zinc-500 flex items-center gap-0.5 mt-0.5">
                    {h.precipAmount > 0 ? (
                      <span className="text-cyan-400 font-bold flex items-center">
                        <Droplets size={7} className="mr-0.5" />
                        {h.precipAmount.toFixed(1)}mm
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Wind size={7} className="mr-0.5 text-zinc-600" />
                        {h.windSpeed}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart Legend */}
      <div className="flex items-center justify-between text-[9px] text-zinc-400 px-1 pt-1 border-t border-white/5 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)] inline-block" />
          <span>Temperatura (°C)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 rounded-xs bg-slate-400/60 inline-block" />
          <span>Zachmurzenie (%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-xs bg-cyan-400/80 border border-cyan-300/40 inline-block" />
          <span>Opady (mm / %)</span>
        </div>
      </div>
    </div>
  );
}
