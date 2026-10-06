'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  RefreshCw,
  Sun,
  Sunset,
  Sunrise,
  Cloud,
  CloudSun,
  Clock,
  Sparkles,
  Info,
  Calendar,
  Compass,
  CheckCircle2,
  AlertCircle,
  Moon,
} from 'lucide-react';
import { City } from '@/lib/types';
import {
  getTwoHourSunshineNowcast,
  TwoHourSunshineNowcast,
  SunshineInterval,
  getCardinalName,
} from '@/lib/solar-ray';
import { useBottomSheetGestures } from '@/hooks/useBottomSheetGestures';

interface SolarHorizonModalProps {
  isOpen: boolean;
  onClose: () => void;
  city: City;
}

export default function SolarHorizonModal({ isOpen, onClose, city }: SolarHorizonModalProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nowcast, setNowcast] = useState<TwoHourSunshineNowcast | null>(null);
  const [selectedIntervalIndex, setSelectedIntervalIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Gesture handling for smooth sheet drag-down dismissal
  const {
    isDragging,
    sheetStyle,
    backdropOpacity,
    dragHandlers,
    handlePointerDown,
  } = useBottomSheetGestures({
    isOpen,
    onClose,
    modalId: 'sunshine-probability',
    threshold: 80,
  });

  // Load 2-hour nowcast data
  const loadData = useCallback(
    async (showRefreshIndicator = false) => {
      if (!city.latitude || !city.longitude) return;
      if (showRefreshIndicator) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await getTwoHourSunshineNowcast(city.latitude, city.longitude, new Date());
        setNowcast(result);
        setSelectedIntervalIndex(0);
      } catch (err) {
        console.error('Failed to load 2-hour sunshine nowcast:', err);
        setError('Nie udało się pobrać danych nasłonecznienia. Spróbuj ponownie za chwilę.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [city.latitude, city.longitude]
  );

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Lock background body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeInterval = nowcast?.intervals?.[selectedIntervalIndex] || nowcast?.intervals?.[0];
  const solarPos = nowcast?.solarPos;
  const cardinal = solarPos ? getCardinalName(solarPos.azimuth) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300"
        style={{ opacity: backdropOpacity }}
        onClick={onClose}
      />

      {/* Main Sheet Container */}
      <div
        style={sheetStyle}
        className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] bg-zinc-950/90 text-white rounded-t-3xl sm:rounded-3xl border border-white/15 shadow-[0_-12px_48px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden backdrop-blur-2xl transition-transform"
      >
        {/* Drag Handle for mobile */}
        <div
          {...dragHandlers}
          onPointerDown={handlePointerDown}
          className="w-full flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing sm:hidden shrink-0 touch-none"
        >
          <div className="w-12 h-1.5 rounded-full bg-white/25" />
        </div>

        {/* Header Bar */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/25 to-yellow-400/20 border border-amber-400/35 flex items-center justify-center text-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.25)]">
              <Sun size={21} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-wide">Prawdopodobieństwo Słońca</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300">
                  Najbliższe 2h
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {city.name} • Twoja dokładna pozycja • Co 15 minut
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Odśwież dane"
              aria-label="Odśwież dane"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin text-amber-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95"
              title="Zamknij"
              aria-label="Zamknij okno"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 overscroll-contain">
          {loading ? (
            /* Skeleton Loading State */
            <div className="space-y-4 animate-pulse">
              <div className="h-44 rounded-3xl bg-white/5 border border-white/10" />
              <div className="h-60 rounded-3xl bg-white/5 border border-white/10" />
              <div className="h-28 rounded-3xl bg-white/5 border border-white/10" />
            </div>
          ) : error ? (
            <div className="p-6 rounded-3xl bg-red-950/40 border border-red-500/30 text-center space-y-3">
              <AlertCircle size={32} className="mx-auto text-red-400" />
              <p className="text-sm text-red-200">{error}</p>
              <button
                onClick={() => loadData()}
                className="px-4 py-2 rounded-full bg-red-500/20 border border-red-500/40 text-xs font-semibold text-red-200 hover:bg-red-500/30 transition-all cursor-pointer"
              >
                Ponów próbę
              </button>
            </div>
          ) : nowcast ? (
            <>
              {/* 1. HERO CARD: NOW & 2-HOUR SUMMARY */}
              <div
                className={`relative overflow-hidden p-5 rounded-3xl border transition-all ${
                  nowcast.currentProbability >= 60
                    ? 'bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-zinc-950/80 border-amber-400/40 shadow-[0_8px_32px_rgba(251,191,36,0.15)]'
                    : nowcast.currentProbability >= 25
                    ? 'bg-gradient-to-br from-amber-600/20 via-orange-600/15 to-zinc-950/80 border-amber-400/30 shadow-[0_8px_32px_rgba(249,115,22,0.15)]'
                    : nowcast.totalSunshineMinutes > 0
                    ? 'bg-gradient-to-br from-zinc-900/80 via-amber-950/20 to-zinc-950/80 border-white/15'
                    : 'bg-zinc-900/70 border-zinc-700/30'
                }`}
              >
                {/* Background decorative glow */}
                <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-white/10 border border-white/15 text-zinc-200">
                      {nowcast.currentProbability >= 50 ? (
                        <Sparkles size={11} className="text-amber-300" />
                      ) : nowcast.solarPos.elevation <= 0 ? (
                        <Moon size={11} className="text-indigo-300" />
                      ) : (
                        <CloudSun size={11} className="text-amber-300" />
                      )}
                      Szansa na słońce w Twoim punkcie
                    </span>
                    <h3 className="text-lg font-bold text-white tracking-tight">{nowcast.summaryTitle}</h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-3xl font-black text-amber-300 tracking-tighter">
                      {nowcast.currentProbability}%
                    </div>
                    <div className="text-[10px] uppercase font-semibold text-zinc-400">Teraz ({nowcast.intervals[0]?.time})</div>
                  </div>
                </div>

                <p className="text-xs text-zinc-300/90 leading-relaxed mb-4">
                  {nowcast.summaryDescription}
                </p>

                {/* Telemetry pill badges */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-xs">
                  <div className="bg-white/5 p-2 rounded-2xl border border-white/5 text-center">
                    <span className="text-[10px] text-zinc-400 block mb-0.5">Łącznie słońca (2h)</span>
                    <span className="font-bold text-amber-300 text-sm">
                      ~{nowcast.totalSunshineMinutes} min
                    </span>
                    <span className="text-[10px] text-zinc-400 block">na 120 minut</span>
                  </div>

                  <div className="bg-white/5 p-2 rounded-2xl border border-white/5 text-center">
                    <span className="text-[10px] text-zinc-400 block mb-0.5">Kąt słońca</span>
                    <span className="font-semibold text-white text-sm">
                      {nowcast.solarPos.elevation > 0 ? `+${nowcast.solarPos.elevation}°` : `${nowcast.solarPos.elevation}°`}
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      {nowcast.solarPos.isGoldenHour ? 'Złota godzina' : nowcast.solarPos.elevation > 0 ? `${cardinal}` : 'pod horyzontem'}
                    </span>
                  </div>

                  <div className="bg-white/5 p-2 rounded-2xl border border-white/5 text-center">
                    <span className="text-[10px] text-zinc-400 block mb-0.5">Zachód słońca</span>
                    <span className="font-semibold text-white text-sm">
                      {nowcast.sunsetTime || '--:--'}
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      {nowcast.minutesToSunset !== null && nowcast.minutesToSunset > 0
                        ? `za ${nowcast.minutesToSunset} min`
                        : 'po zachodzie'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. DEDICATED 2-HOUR SUNSHINE PROBABILITY CHART (SVG) */}
              <div className="p-4 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun size={16} className="text-amber-400" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                      Wykres szansy na słońce (0 – 120 min)
                    </h4>
                  </div>
                  <span className="text-[10px] text-zinc-400">Dotknij punktu, aby sprawdzić</span>
                </div>

                {/* SVG Chart Canvas */}
                <div className="w-full bg-zinc-950/80 rounded-2xl border border-white/10 p-2 overflow-hidden shadow-inner">
                  <TwoHourSunshineSVG
                    intervals={nowcast.intervals}
                    selectedIndex={selectedIntervalIndex}
                    onSelectIndex={setSelectedIntervalIndex}
                    sunsetTime={nowcast.sunsetTime}
                  />
                </div>

                {/* Selected Interval Detail Card */}
                {activeInterval && (
                  <div className="p-3 rounded-2xl bg-white/5 border border-amber-400/25 flex items-center justify-between gap-3 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                        {activeInterval.probability >= 60 ? (
                          <Sun size={18} />
                        ) : activeInterval.probability >= 25 ? (
                          <CloudSun size={18} />
                        ) : activeInterval.isDay ? (
                          <Cloud size={18} />
                        ) : (
                          <Moon size={18} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                          <span>Godzina {activeInterval.time}</span>
                          <span className="text-[10px] font-medium text-zinc-400">
                            ({activeInterval.minutesFromNow === 0 ? 'Teraz' : `+${activeInterval.minutesFromNow} min`})
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-300">
                          {activeInterval.statusText} • Chmury: {activeInterval.cloudCover}%
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-amber-300">
                        {activeInterval.probability}%
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        ~{activeInterval.sunshineMinutes} min słońca
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. 15-MINUTE TIMELINE HORIZONTAL STRIP */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Oś czasu co 15 minut
                  </span>
                  <span className="text-[11px] text-zinc-400">Najbliższe 2 godziny</span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-0.5 no-scrollbar">
                  {nowcast.intervals.map((item, idx) => {
                    const isSelected = selectedIntervalIndex === idx;
                    return (
                      <button
                        key={item.time}
                        onClick={() => setSelectedIntervalIndex(idx)}
                        className={`flex-shrink-0 w-20 p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400/20 border-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.25)] scale-105'
                            : 'bg-zinc-900/60 hover:bg-white/10 border-white/5'
                        }`}
                      >
                        <span className="text-[11px] font-bold text-white block mb-1">
                          {item.time}
                        </span>

                        <div className="my-1.5 flex justify-center">
                          {item.probability >= 60 ? (
                            <Sun size={18} className="text-amber-400" />
                          ) : item.probability >= 25 ? (
                            <CloudSun size={18} className="text-amber-300" />
                          ) : item.isDay ? (
                            <Cloud size={18} className="text-zinc-400" />
                          ) : (
                            <Moon size={18} className="text-indigo-400" />
                          )}
                        </div>

                        <div className="text-xs font-black text-amber-300">
                          {item.probability}%
                        </div>

                        <span className="text-[9px] text-zinc-400 block mt-0.5">
                          {item.sunshineMinutes > 0 ? `${item.sunshineMinutes}m słońca` : '0m'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. EDUCATIONAL INFO BOX */}
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-400/15 flex items-start gap-2.5 text-xs text-zinc-300">
                <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong className="text-amber-200">Jak to działa?</strong> Wykres prezentuje prawdopodobieństwo bezpośredniego słońca w Twoim punkcie na podstawie 15-minutowego modelu promieniowania bezpośredniego (DNI), czasu operowania słońca oraz zachmurzenia trójwarstwowego.
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * 2-Hour Sunshine Probability SVG Chart
 */
function TwoHourSunshineSVG({
  intervals,
  selectedIndex,
  onSelectIndex,
  sunsetTime,
}: {
  intervals: SunshineInterval[];
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  sunsetTime: string | null;
}) {
  const width = 360;
  const height = 185;
  const paddingLeft = 32;
  const paddingRight = 20;
  const paddingTop = 28;
  const paddingBottom = 28;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const count = intervals.length;
  if (count === 0) return null;

  const getX = (idx: number) => paddingLeft + (idx / (count - 1)) * innerWidth;
  const getY = (prob: number) => paddingTop + innerHeight - (prob / 100) * innerHeight;

  // Build points for spline
  const points = intervals.map((it, idx) => ({
    x: getX(idx),
    y: getY(it.probability),
  }));

  // Generate smooth SVG curve
  let pathD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  // Closed area for gradient fill
  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(paddingTop + innerHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(paddingTop + innerHeight).toFixed(1)} Z`;

  // Find sunset position on X axis if it falls within the intervals
  let sunsetIdx: number | null = null;
  if (sunsetTime) {
    sunsetIdx = intervals.findIndex(it => it.time >= sunsetTime);
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
      <defs>
        {/* Warm Golden Glow Area Gradient */}
        <linearGradient id="sunAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
        </linearGradient>

        {/* Golden Line Gradient */}
        <linearGradient id="sunLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fef08a" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="sunGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid Lines (0%, 25%, 50%, 75%, 100%) */}
      {[0, 25, 50, 75, 100].map(val => {
        const y = getY(val);
        return (
          <g key={val}>
            <line
              x1={paddingLeft}
              y1={y}
              x2={paddingLeft + innerWidth}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray={val === 0 ? undefined : '2 3'}
            />
            <text
              x={paddingLeft - 5}
              y={y + 3}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="7.5"
              fontFamily="sans-serif"
            >
              {val}%
            </text>
          </g>
        );
      })}

      {/* Sunset Vertical Indicator Line (if present within intervals) */}
      {sunsetIdx !== null && sunsetIdx >= 0 && (
        <g>
          <line
            x1={getX(sunsetIdx)}
            y1={paddingTop}
            x2={getX(sunsetIdx)}
            y2={paddingTop + innerHeight}
            stroke="#f97316"
            strokeDasharray="3 3"
            strokeWidth="1.2"
            opacity="0.75"
          />
          <text
            x={getX(sunsetIdx)}
            y={paddingTop - 6}
            textAnchor="middle"
            fill="#fb923c"
            fontSize="7"
            fontWeight="bold"
          >
            Zachód {sunsetTime}
          </text>
        </g>
      )}

      {/* Filled Area Under Curve */}
      <path d={areaD} fill="url(#sunAreaGrad)" />

      {/* Glowing Solar Curve Line */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#sunLineGrad)"
        strokeWidth="2.8"
        strokeLinecap="round"
        filter="url(#sunGlowFilter)"
      />

      {/* Vertical Tappable Columns & Data Nodes */}
      {intervals.map((it, idx) => {
        const cx = getX(idx);
        const cy = getY(it.probability);
        const isSelected = selectedIndex === idx;

        return (
          <g key={it.time} className="cursor-pointer" onClick={() => onSelectIndex(idx)}>
            {/* Transparent wide tap target */}
            <rect
              x={cx - innerWidth / (count * 2)}
              y={paddingTop}
              width={innerWidth / count}
              height={innerHeight + paddingBottom}
              fill="transparent"
            />

            {/* Selected Column Highlight Line */}
            {isSelected && (
              <line
                x1={cx}
                y1={paddingTop}
                x2={cx}
                y2={paddingTop + innerHeight}
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.8"
              />
            )}

            {/* Percentage Label */}
            <text
              x={cx}
              y={cy <= paddingTop + 6 ? cy + 13 : cy - 8}
              textAnchor="middle"
              fill={isSelected ? '#fef08a' : it.probability > 0 ? '#fde68a' : '#94a3b8'}
              fontSize={isSelected ? '9' : '8'}
              fontWeight={isSelected ? 'bold' : '600'}
            >
              {it.probability}%
            </text>

            {/* Data Dot on Curve */}
            <circle
              cx={cx}
              cy={cy}
              r={isSelected ? '5.5' : '3.5'}
              fill={it.probability > 0 ? '#fbbf24' : '#64748b'}
              stroke="#09090b"
              strokeWidth="1.5"
            />
            {isSelected && (
              <circle
                cx={cx}
                cy={cy}
                r="9"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                opacity="0.6"
                className="animate-ping"
              />
            )}

            {/* Time label below axis */}
            <text
              x={cx}
              y={paddingTop + innerHeight + 16}
              textAnchor="middle"
              fill={isSelected ? '#fde047' : '#94a3b8'}
              fontSize={isSelected ? '8.5' : '7.5'}
              fontWeight={isSelected ? 'bold' : 'normal'}
            >
              {it.time}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
