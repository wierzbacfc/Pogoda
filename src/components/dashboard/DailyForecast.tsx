'use client';

import { useState } from 'react';
import { DailyData, HourlyData } from '@/lib/types';
import { getDayLabel, getDateKeyFromHour, isWeekendDay } from '@/lib/utils';
import { WeatherIcon } from '@/components/ui/WeatherIcon';
import { Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { DayDetailChart } from './DayDetailChart';

interface DailyForecastProps {
  dailyData: DailyData;
  hourlyData: HourlyData;
  currentIdx: number;
  dailyStartIdx: number;
}

export function DailyForecast({ dailyData, hourlyData, currentIdx, dailyStartIdx }: DailyForecastProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedDayDate, setExpandedDayDate] = useState<string | null>(null);

  const totalDays = Math.min(14, dailyData.time.length - dailyStartIdx);
  const visibleDaysCount = isExpanded ? totalDays : Math.min(7, totalDays);
  
  let globalMin = Infinity;
  let globalMax = -Infinity;
  
  for (let i = 0; i < visibleDaysCount; i++) {
    const idx = dailyStartIdx + i;
    if (dailyData.temperature_2m_min[idx] < globalMin) globalMin = dailyData.temperature_2m_min[idx];
    if (dailyData.temperature_2m_max[idx] > globalMax) globalMax = dailyData.temperature_2m_max[idx];
  }

  const rangeSpan = Math.max(1, globalMax - globalMin);
  const todayDateKey = getDateKeyFromHour(hourlyData.time[currentIdx]);
  const currentTemp = hourlyData.temperature_2m[currentIdx] || 0;

  const getDotGlowColor = (temp: number) => {
    if (temp < 10) return 'rgba(56, 189, 248, 0.95)';
    if (temp < 18) return 'rgba(45, 212, 191, 0.95)';
    if (temp < 24) return 'rgba(251, 191, 36, 0.95)';
    return 'rgba(249, 115, 22, 0.95)';
  };


  return (
    <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 shadow-xl flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between text-zinc-400 mb-2.5 px-1">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] uppercase tracking-wider font-bold">
            Prognoza {isExpanded ? '14-dniowa' : '7-dniowa'}
          </span>
        </div>
        <span className="text-[10px] text-zinc-500 font-medium">
          {visibleDaysCount} z {totalDays} dni
        </span>
      </div>

      {/* Days List */}
      <div className="flex flex-col divide-y divide-white/5">
        {Array.from({ length: visibleDaysCount }).map((_, i) => {
          const idx = dailyStartIdx + i;
          const dateStr = dailyData.time[idx];
          const minTemp = dailyData.temperature_2m_min[idx];
          const maxTemp = dailyData.temperature_2m_max[idx];
          const weatherCode = dailyData.weathercode[idx];
          const precipProb = dailyData.precipitation_probability_max?.[idx] || 0;
          const precipSum = dailyData.precipitation_sum?.[idx] ?? 0;
          const isToday = i === 0;
          const isDayExpanded = expandedDayDate === dateStr;

          // Bar positioning
          const leftPercent = Math.max(0, Math.min(100, ((minTemp - globalMin) / rangeSpan) * 100));
          const widthPercent = Math.max(8, Math.min(100 - leftPercent, ((maxTemp - minTemp) / rangeSpan) * 100));

          // Current temp dot on Today's bar
          const currentDotPercent = isToday
            ? Math.max(0, Math.min(100, ((currentTemp - minTemp) / Math.max(1, maxTemp - minTemp)) * 100))
            : null;

          return (
            <div key={dateStr} className="flex flex-col">
              <div
                onClick={() => setExpandedDayDate(prev => prev === dateStr ? null : dateStr)}
                className={`flex items-center gap-2 py-2.5 hover:bg-white/[0.04] active:bg-white/[0.06] transition-all px-1.5 -mx-1.5 rounded-xl cursor-pointer ${
                  isDayExpanded ? 'bg-white/[0.03]' : ''
                }`}
              >
                {/* Day label (Tightened width to eliminate dead space before icon) */}
                {(() => {
                  const isWeekend = isWeekendDay(dateStr);
                  const dayName = getDayLabel(dateStr, i, todayDateKey);
                  return (
                    <div
                      className={`w-9.5 text-xs shrink-0 ${
                        isToday
                          ? 'text-blue-400 font-bold'
                          : isWeekend
                          ? 'text-amber-300/90 font-semibold'
                          : 'text-zinc-300 font-semibold'
                      }`}
                    >
                      {dayName}
                    </div>
                  );
                })()}

                {/* Weather icon */}
                <div className="w-6 flex justify-center shrink-0">
                  <WeatherIcon code={weatherCode} isDay={true} size={21} />
                </div>

                {/* Radar Droplet Gauge (Slightly enlarged, distinct droplet, Ring = %, Liquid = mm) */}
                <div className="w-15 shrink-0 flex items-center gap-1.5 pl-0.5">
                  {precipProb >= 15 || precipSum > 0 ? (
                    <>
                      {/* Circular Progress Ring + Centered Vivid Liquid Droplet */}
                      <div className="relative w-5.5 h-5.5 flex items-center justify-center shrink-0">
                        {/* Outer probability ring */}
                        <svg className="w-5.5 h-5.5 -rotate-90" viewBox="0 0 36 36">
                          <circle
                            cx="18"
                            cy="18"
                            r="15.9155"
                            fill="none"
                            stroke="rgba(255,255,255,0.15)"
                            strokeWidth="3"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="15.9155"
                            fill="none"
                            stroke={precipProb >= 60 ? '#22d3ee' : '#38bdf8'}
                            strokeWidth="3.2"
                            strokeDasharray={`${precipProb}, 100`}
                            strokeLinecap="round"
                            className="drop-shadow-[0_0_4px_rgba(34,211,238,0.85)] transition-all duration-300"
                          />
                        </svg>

                        {/* Centered Vivid Liquid Droplet for precipitation mm */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <svg viewBox="0 0 16 22" className="w-3 h-3.5 overflow-visible">
                            <defs>
                              <clipPath id={`drop-clip-${idx}`}>
                                <path d="M8 1.5 C8 1.5 2 9.5 2 14.5 A6 6 0 0 0 14 14.5 C14 9.5 8 1.5 8 1.5 Z" />
                              </clipPath>
                              <linearGradient id={`drop-grad-${idx}`} x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor={precipSum >= 8 ? '#e11d48' : '#0284c7'} />
                                <stop offset="100%" stopColor={precipSum >= 8 ? '#fb7185' : '#38bdf8'} />
                              </linearGradient>
                            </defs>
                            {/* Glass droplet contour */}
                            <path
                              d="M8 1.5 C8 1.5 2 9.5 2 14.5 A6 6 0 0 0 14 14.5 C14 9.5 8 1.5 8 1.5 Z"
                              fill="rgba(255,255,255,0.12)"
                              stroke={precipSum >= 5 ? 'rgba(56,189,248,0.85)' : 'rgba(255,255,255,0.4)'}
                              strokeWidth="1.3"
                            />
                            {/* Vivid liquid fill level */}
                            <g clipPath={`url(#drop-clip-${idx})`}>
                              <rect
                                x="0"
                                y={22 - Math.max(3, Math.min(21, (Math.min(precipSum, 15) / 15) * 19 + 3))}
                                width="16"
                                height="22"
                                fill={`url(#drop-grad-${idx})`}
                                className="drop-shadow-[0_0_3px_rgba(56,189,248,0.9)]"
                              />
                            </g>
                            {/* Specular glass reflection highlight */}
                            <circle cx="5.5" cy="11.5" r="1" fill="#ffffff" opacity="0.85" />
                          </svg>
                        </div>
                      </div>

                      {/* Probability and Amount */}
                      <div className="flex flex-col justify-center leading-none">
                        <span className="text-[10px] text-cyan-300 font-extrabold tabular-nums leading-tight">
                          {precipProb}%
                        </span>
                        {precipSum >= 0.05 ? (
                          <span className="text-[8px] text-zinc-100 font-semibold tabular-nums leading-tight">
                            {precipSum >= 10 ? Math.round(precipSum) : precipSum.toFixed(1)} mm
                          </span>
                        ) : (
                          <span className="text-[7.5px] text-zinc-400 font-medium tabular-nums leading-tight">
                            &lt;0.1 mm
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="w-full text-center text-[10px] text-zinc-600 font-medium">--</div>
                  )}
                </div>

                {/* Min Temp */}
                <div className="text-xs text-zinc-400 font-medium tabular-nums w-6 text-right shrink-0">
                  {Math.round(minTemp)}°
                </div>

                {/* Dynamic Range Bar */}
                <div className="flex-1 h-1.5 bg-white/10 rounded-full relative mx-1">
                  <div
                    className="absolute h-full rounded-full bg-gradient-to-r from-teal-400 via-amber-400 to-orange-500 shadow-sm"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                    }}
                  />

                  {/* Current temperature dot on today's row with dynamic glow */}
                  {isToday && currentDotPercent !== null && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full border-2 border-zinc-900 z-10 transition-all"
                      style={{
                        left: `calc(${leftPercent}% + (${widthPercent}% * ${currentDotPercent / 100}) - 5px)`,
                        boxShadow: `0 0 10px ${getDotGlowColor(currentTemp)}`,
                      }}
                    />
                  )}
                </div>

                {/* Max Temp */}
                <div className="text-xs text-zinc-100 font-bold tabular-nums w-6 text-left shrink-0">
                  {Math.round(maxTemp)}°
                </div>

                {/* Expand chevron */}
                <div className="shrink-0 w-3 text-right">
                  <ChevronRight
                    size={11}
                    className={`text-zinc-500 transition-transform duration-200 ${
                      isDayExpanded ? 'rotate-90 text-blue-400' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Inline Day 24h Detail Chart (Temperature, Clouds, Rain) */}
              {isDayExpanded && (
                <DayDetailChart
                  dateStr={dateStr}
                  isToday={isToday}
                  currentIdx={currentIdx}
                  hourlyData={hourlyData}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Expand / Collapse toggle button */}
      {totalDays > 7 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-2.5 pt-2 border-t border-white/5 text-xs font-semibold text-blue-400 hover:text-blue-300 active:scale-98 transition-all flex items-center justify-center gap-1 py-1 rounded-xl bg-white/[0.02]"
        >
          <span>{isExpanded ? 'Zwiń do 7 dni' : `Pokaż pełne ${totalDays} dni`}</span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </div>
  );
}
