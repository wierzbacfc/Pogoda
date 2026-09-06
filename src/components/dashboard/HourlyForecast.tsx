'use client';

import { HourlyData } from '@/lib/types';
import { formatTemp, formatTime, getDateKeyFromHour } from '@/lib/utils';
import { WeatherIcon } from '@/components/ui/WeatherIcon';
import { Clock, Droplets } from 'lucide-react';
import React, { useMemo } from 'react';

interface HourlyForecastProps {
  hourlyData: HourlyData;
  currentIdx: number;
}

export function HourlyForecast({ hourlyData, currentIdx }: HourlyForecastProps) {
  const items = useMemo(() => {
    const arr = [];
    let currentDayStr = getDateKeyFromHour(hourlyData.time[currentIdx]);

    // Range: current hour to +36 hours
    const endIdx = Math.min(currentIdx + 36, hourlyData.time.length);
    for (let i = currentIdx; i < endIdx; i++) {
      const timeStr = hourlyData.time[i];
      const dayStr = getDateKeyFromHour(timeStr);

      if (dayStr !== currentDayStr) {
        arr.push({ type: 'separator', key: `sep-${i}`, text: 'JUTRO' });
        currentDayStr = dayStr;
      }

      arr.push({ type: 'hour', key: `hr-${i}`, index: i });
    }

    return arr;
  }, [hourlyData, currentIdx]);

// Cubic Bezier Spline generator for smooth SVG curves
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

  // 12-hour precipitation forecast data (always computed for permanent visibility)
  const next12Precip = useMemo(() => {
    const sliceEnd = Math.min(currentIdx + 12, hourlyData.time.length);
    const data = [];
    let hasRain = false;
    let maxRain = 0;

    for (let i = currentIdx; i < sliceEnd; i++) {
      const prob = hourlyData.precipitation_probability?.[i] || 0;
      const amount = hourlyData.precipitation?.[i] || 0;
      if (prob >= 15 || amount >= 0.1) hasRain = true;
      if (amount > maxRain) maxRain = amount;
      data.push({
        time: formatTime(hourlyData.time[i]),
        prob,
        amount,
      });
    }

    return { data, maxRain, hasRain };
  }, [hourlyData, currentIdx]);

  return (
    <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-3.5 shadow-xl flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between text-zinc-400 px-1">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] uppercase tracking-wider font-bold">Prognoza godzinowa</span>
        </div>
        <span className="text-[10px] text-zinc-500 font-medium tracking-tight">Kolejne 36h</span>
      </div>

      {/* Horizontal Scroll Track optimized for Xiaomi 11 width */}
      <div data-no-swipe="true" className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]{display:none} py-0.5 px-0.5">
        {items.map((item) => {
          if (item.type === 'separator') {
            return (
              <div key={item.key} className="flex-shrink-0 flex items-center px-1">
                <div
                  className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold border-l border-white/15 pl-1.5 py-2"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  {item.text}
                </div>
              </div>
            );
          }

          const i = item.index as number;
          const isActive = i === currentIdx;
          const temp = hourlyData.temperature_2m[i];
          const timeLabel = isActive ? 'Teraz' : formatTime(hourlyData.time[i]);
          const isDay = hourlyData.is_day[i] === 1;
          const weatherCode = hourlyData.weathercode[i];
          const precipProb = hourlyData.precipitation_probability?.[i] || 0;

          return (
            <div
              key={item.key}
              className={`flex-shrink-0 w-[49px] flex flex-col items-center gap-1.5 py-2 px-1 rounded-2xl transition-all ${
                isActive
                  ? 'bg-blue-500/25 border border-blue-400/50 shadow-[0_0_16px_rgba(59,130,246,0.35)]'
                  : 'bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] active:scale-95 cursor-pointer'
              }`}
            >
              {/* Hour time */}
              <span className={`text-[10px] font-semibold tabular-nums ${isActive ? 'text-blue-200' : 'text-zinc-400'}`}>
                {timeLabel}
              </span>

              {/* Weather icon */}
              <div className="my-0.5">
                <WeatherIcon code={weatherCode} isDay={isDay} size={22} />
              </div>

              {/* Temperature */}
              <span className="text-xs font-bold text-white tabular-nums tracking-tight">
                {formatTemp(temp)}
              </span>

              {/* Micro badge: Clean Rain probability (no confusing 'k') */}
              {precipProb >= 15 ? (
                <span className="text-[9px] text-cyan-400 font-extrabold tabular-nums flex items-center gap-0.5">
                  <Droplets size={8} className="shrink-0 text-cyan-400" />
                  {precipProb}%
                </span>
              ) : (
                <span className="text-[9px] text-zinc-600 font-mono">·</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Hybrid Precipitation Chart: Permanently visible with smooth spline curve and mm bars */}
      <div className="pt-2 border-t border-white/5 animate-in fade-in duration-300">
        {/* Chart Card */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-2 flex flex-col gap-1.5 relative overflow-hidden">
          {/* Main Visualizer Area (SVG + Overlayed Bars) */}
          <div className="relative h-20 w-full">
            {/* SVG Background Layer: Grid lines, scale labels, probability spline & glow area */}
            {(() => {
              const svgPoints = next12Precip.data.map((col, idx) => {
                const x = idx * 29 + 17; // Centers across 360 width
                const y = 64 - (col.prob / 100) * 52; // 0% -> 64, 50% -> 38, 100% -> 12
                return { x, y, prob: col.prob, amount: col.amount };
              });

              const splineD = getSvgSpline(svgPoints);
              const lastX = svgPoints[svgPoints.length - 1].x;
              const firstX = svgPoints[0].x;
              const areaD = `${splineD} L ${lastX.toFixed(1)} 64 L ${firstX.toFixed(1)} 64 Z`;

              return (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 360 76"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="probAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
                      <stop offset="85%" stopColor="#22d3ee" stopOpacity="0.04" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Reference Grid Lines (100% and 50%) */}
                  <line x1="8" y1="12" x2="322" y2="12" stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
                  <text x="354" y="14" fill="rgba(255,255,255,0.35)" fontSize="7" textAnchor="end" fontFamily="monospace">
                    100%
                  </text>

                  <line x1="8" y1="38" x2="322" y2="38" stroke="rgba(255,255,255,0.10)" strokeDasharray="3 3" />
                  <text x="354" y="40" fill="rgba(255,255,255,0.35)" fontSize="7" textAnchor="end" fontFamily="monospace">
                    50%
                  </text>

                  {/* 0% Baseline */}
                  <line x1="8" y1="64" x2="352" y2="64" stroke="rgba(255,255,255,0.08)" />

                  {/* Probability Fill Area */}
                  {next12Precip.hasRain && (
                    <path d={areaD} fill="url(#probAreaGrad)" />
                  )}

                  {/* Probability Glowing Neon Line */}
                  <path
                    d={splineD}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth={next12Precip.hasRain ? "2" : "1.2"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={next12Precip.hasRain ? "drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]" : "opacity-40"}
                  />

                  {/* Probability Anchor Nodes and % Badges */}
                  {svgPoints.map((p, idx) => {
                    if (p.prob < 20) return null;
                    return (
                      <g key={idx}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="2"
                          fill="#22d3ee"
                          stroke="#09090b"
                          strokeWidth="1"
                        />
                        {p.prob >= 35 && (
                          <text
                            x={p.x}
                            y={Math.max(8, p.y - 4)}
                            fill="#a5f3fc"
                            fontSize="6.5"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {p.prob}%
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              );
            })()}

            {/* Bars Overlay Layer: Translucent mm columns anchored to baseline */}
            <div className="absolute inset-0 grid grid-cols-12 items-end px-1 pb-3 pointer-events-none">
              {(() => {
                const maxRainCap = Math.max(1.5, Math.ceil((next12Precip.maxRain || 0) * 1.25 * 10) / 10);

                return next12Precip.data.map((col, idx) => {
                  const hasAmount = col.amount > 0;
                  const barHeight = hasAmount
                    ? Math.max(8, Math.min(38, Math.round((col.amount / maxRainCap) * 36)))
                    : 3;
                  const mmLabel = hasAmount
                    ? col.amount.toFixed(1)
                    : col.prob >= 20
                    ? '0'
                    : '-';

                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full gap-0.5">
                      {/* Exact mm amount label above bar */}
                      <span
                        className={`text-[8px] tabular-nums font-bold leading-none select-none ${
                          hasAmount
                            ? 'text-cyan-300 drop-shadow-[0_0_4px_rgba(34,211,238,0.5)]'
                            : col.prob >= 20
                            ? 'text-cyan-400/70'
                            : 'text-zinc-600'
                        }`}
                      >
                        {mmLabel}
                      </span>

                      {/* Translucent Glass Bar for Rain Amount */}
                      <div
                        className={`w-3.5 rounded-t-md transition-all duration-300 ${
                          hasAmount
                            ? 'bg-gradient-to-t from-blue-700/80 to-blue-500/60 border-t border-x border-blue-400/40 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                            : 'bg-white/[0.04] rounded-full'
                        }`}
                        style={{ height: `${barHeight}px` }}
                      />
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Hour Labels Row */}
          <div className="grid grid-cols-12 text-center px-1">
            {next12Precip.data.map((col, idx) => {
              const isHighlight = col.prob >= 30 || col.amount > 0;
              return (
                <span
                  key={idx}
                  className={`text-[9px] tabular-nums leading-none ${
                    isHighlight ? 'text-zinc-200 font-semibold' : 'text-zinc-500'
                  }`}
                >
                  {col.time.split(':')[0]}
                </span>
              );
            })}
          </div>

          {/* Legend Row */}
          <div className="flex items-center justify-between text-[9px] text-zinc-400 px-1 pt-1.5 mt-0.5 border-t border-white/5 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2 rounded-xs bg-blue-500/60 border border-blue-400/40 inline-block" />
              <span>Słupki: ilość wody [mm/h]</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)] inline-block" />
              <span>Linia: szansa [%]</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
