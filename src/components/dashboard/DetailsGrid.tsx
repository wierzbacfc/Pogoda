'use client';

import React, { useState } from 'react';
import { HourlyData, DailyData, AirQualityData } from '@/lib/types';
import { formatTime, uvDescription, getSunArcProgress, getMoonPhase, getMoonPhaseInfo, getVisibilityInfo, getCloudCoverInfo } from '@/lib/utils';
import {
  Sunrise,
  Sunset,
  Droplets,
  Sun,
  Moon,
  Eye,
  Gauge,
  Compass,
  Cloud,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';

export type MetricType = 'sun' | 'visibility' | 'cloudiness' | 'humidity' | 'uv' | 'pressure';

interface DetailsGridProps {
  hourlyData: HourlyData;
  dailyData: DailyData;
  currentIdx: number;
  dailyIdx: number;
  airQuality?: AirQualityData;
}

function DetailsGridComponent({ hourlyData, dailyData, currentIdx, dailyIdx }: DetailsGridProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const bubbleRef = React.useRef<HTMLDivElement | null>(null);

  // Automatically and smoothly scroll the speech bubble into full view when opened
  React.useEffect(() => {
    if (selectedMetric) {
      const timer = setTimeout(() => {
        if (!bubbleRef.current) return;
        const rect = bubbleRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const bottomNavOffset = 95; // Account for floating bottom toolbar
        const visibleBottom = viewportHeight - bottomNavOffset;

        if (rect.bottom > visibleBottom) {
          const delta = rect.bottom - visibleBottom + 20;
          window.scrollBy({ top: delta, behavior: 'smooth' });
        } else if (rect.top < 65) {
          const delta = rect.top - 75;
          window.scrollBy({ top: delta, behavior: 'smooth' });
        }
      }, 70);

      return () => clearTimeout(timer);
    }
  }, [selectedMetric]);

  const toggleMetric = (type: MetricType) => {
    setSelectedMetric((prev) => (prev === type ? null : type));
  };

  const sunrise = dailyData.sunrise[dailyIdx];
  const sunset = dailyData.sunset[dailyIdx];
  const sunArc = getSunArcProgress(sunrise, sunset);
  const moon = getMoonPhase();
  const moonPhaseInfo = getMoonPhaseInfo();

  // Visibility & Cloud cover
  const visibilityMeters = hourlyData.visibility?.[currentIdx] ?? 10000;
  const visibilityInfo = getVisibilityInfo(visibilityMeters);

  const cloudCoverVal = hourlyData.cloudcover?.[currentIdx] ?? 0;
  const cloudCoverInfo = getCloudCoverInfo(cloudCoverVal);

  const temp = hourlyData.temperature_2m[currentIdx] || 0;
  const humidity = hourlyData.relativehumidity_2m[currentIdx] || 0;
  const dewPoint = Math.round(temp - (100 - humidity) / 5);

  const uvIndex = dailyData.uv_index_max?.[dailyIdx] || 0;

  // Surface pressure
  const pressure = hourlyData.surface_pressure?.[currentIdx];
  const pressureText = pressure ? `${Math.round(pressure)} hPa` : '1013 hPa';
  let pressureDesc = 'W normie';
  if (pressure) {
    if (pressure > 1020) pressureDesc = 'Wysokie (Wyż)';
    else if (pressure < 1005) pressureDesc = 'Niskie (Niż)';
  }

  // Parabolic sun coordinates for SVG
  const sunX = 10 + sunArc.progress * 100;
  const sunY = 32 - Math.sin(sunArc.progress * Math.PI) * 24;

  // Render content inside the translucent speech bubble (dymek)
  const renderBubble = (type: MetricType, isLeft: boolean) => {
    let headerIcon = <Sparkles size={16} className="text-blue-400" />;
    let title = '';
    let badge = '';
    let content = null;

    if (type === 'sun') {
      headerIcon = <Sun size={16} className="text-amber-400" />;
      title = 'Słońce i Księżyc';
      badge = sunArc.isDay ? sunArc.countdown : 'Noc';
      content = (
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Wschód słońca</span>
              <span className="text-sm font-bold text-white mt-0.5">{formatTime(sunrise)}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Zachód słońca</span>
              <span className="text-sm font-bold text-amber-400 mt-0.5">{formatTime(sunset)}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Moon size={14} className="text-indigo-400" />
              <span>Faza księżyca</span>
            </div>
            <span className="font-bold text-indigo-300">{moon.name} ({moon.illumination}%)</span>
          </div>
        </div>
      );
    } else if (type === 'visibility') {
      headerIcon = <Eye size={16} className="text-emerald-400" />;
      title = 'Widoczność pozioma';
      badge = `${visibilityInfo.km} km`;
      content = (
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Zasięg widzenia</span>
              <span className="text-sm font-bold text-white mt-0.5">{visibilityInfo.km} km</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Warunki na drodze</span>
              <span className={`text-sm font-bold mt-0.5 ${visibilityInfo.color}`}>{visibilityInfo.label}</span>
            </div>
          </div>
          <p className="text-xs text-zinc-300 bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-2.5 leading-relaxed">
            {visibilityInfo.advice}
          </p>
        </div>
      );
    } else if (type === 'cloudiness') {
      headerIcon = <Cloud size={16} className="text-sky-400" />;
      title = 'Pokrycie nieba chmurami';
      badge = `${cloudCoverInfo.percent}%`;
      content = (
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Stopień pokrycia</span>
              <span className="text-sm font-bold text-white mt-0.5">{cloudCoverInfo.percent}%</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Stan nieba</span>
              <span className="text-sm font-bold text-sky-300 mt-0.5">{cloudCoverInfo.label}</span>
            </div>
          </div>
          <p className="text-xs text-zinc-300 bg-sky-500/10 border border-sky-400/20 rounded-2xl p-2.5 leading-relaxed">
            {cloudCoverInfo.desc} Wskaźnik ten określa, jaka część sklepienia niebieskiego jest przysłonięta przez chmury.
          </p>
        </div>
      );
    } else if (type === 'humidity') {
      headerIcon = <Droplets size={16} className="text-cyan-400" />;
      title = 'Wilgotność i punkt rosy';
      badge = `${Math.round(humidity)}%`;
      content = (
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Punkt rosy</span>
              <span className="text-sm font-bold text-white mt-0.5">{dewPoint}°</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Komfort parności</span>
              <span className="text-sm font-bold text-cyan-300 mt-0.5">{humidity > 70 ? 'Wilgotno' : 'Komfortowo'}</span>
            </div>
          </div>
          <p className="text-xs text-zinc-300 bg-cyan-500/10 border border-cyan-400/20 rounded-2xl p-2.5 leading-relaxed">
            Wilgotność w zakresie 40-60% jest optymalna dla dróg oddechowych i samopoczucia.
          </p>
        </div>
      );
    } else if (type === 'uv') {
      headerIcon = <Sun size={16} className="text-yellow-400" />;
      title = 'Promieniowanie UV';
      badge = `${Math.round(uvIndex)} / 11`;
      let spf = 'Brak / Niepotrzebny';
      let advice = 'Ochrona nie jest wymagana. Możesz bezpiecznie przebywać na słońcu.';
      if (uvIndex >= 8) {
        spf = 'SPF 50+';
        advice = 'Bardzo silne słońce. Chroń skórę i unikaj przebywania na słońcu w godzinach 11:00-15:00.';
      } else if (uvIndex >= 6) {
        spf = 'SPF 30-50';
        advice = 'Wysokie promieniowanie. Szukaj cienia w południe, załóż okulary przeciwsłoneczne.';
      } else if (uvIndex >= 3) {
        spf = 'SPF 15-30';
        advice = 'Umiarkowane promieniowanie. Zalecany krem ochronny przy dłuższym spacerze.';
      }

      content = (
        <div className="flex flex-col gap-2.5">
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Zalecany filtr przeciwsłoneczny</span>
            <span className="font-bold text-yellow-300">{spf}</span>
          </div>
          <p className="text-xs text-zinc-300 bg-yellow-500/10 border border-yellow-400/20 rounded-2xl p-2.5 leading-relaxed">
            {advice}
          </p>
        </div>
      );
    } else if (type === 'pressure') {
      headerIcon = <Gauge size={16} className="text-purple-400" />;
      title = 'Ciśnienie atmosferyczne';
      badge = pressureText;
      let advice = 'Ciśnienie w normie barycznej. Warunki obojętne dla samopoczucia.';
      if (pressure && pressure > 1020) {
        advice = 'Układ wyżowy. Sprzyja stabilnej, słonecznej aurze i dobrej koncentracji.';
      } else if (pressure && pressure < 1005) {
        advice = 'Układ niżowy. Meteopaci mogą odczuwać znużenie, senność lub bóle głowy.';
      }

      content = (
        <div className="flex flex-col gap-2.5">
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Układ baryczny</span>
            <span className="font-bold text-purple-300">{pressureDesc}</span>
          </div>
          <p className="text-xs text-zinc-300 bg-purple-500/10 border border-purple-400/20 rounded-2xl p-2.5 leading-relaxed">
            {advice}
          </p>
        </div>
      );
    }

    return (
      <div
        ref={bubbleRef}
        className="col-span-2 relative my-1 transition-all duration-200 animate-in fade-in zoom-in-95 slide-in-from-top-2 scroll-mt-24"
      >
        {/* Pointer arrow pointing up to the clicked card */}
        <div
          className="absolute -top-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white/20 z-20"
          style={{ left: isLeft ? '25%' : '75%', transform: 'translateX(-50%)' }}
        />
        <div
          className="absolute -top-[6.5px] w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[7px] border-b-zinc-900/90 z-20"
          style={{ left: isLeft ? '25%' : '75%', transform: 'translateX(-50%)' }}
        />

        {/* Translucent glass bubble container with refined glassmorphism */}
        <div className="rounded-3xl bg-zinc-950/80 backdrop-blur-2xl border border-white/25 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.65)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {headerIcon}
              <h4 className="text-xs font-bold text-white tracking-tight truncate">{title}</h4>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10 shrink-0">
                {badge}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMetric(null);
              }}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-zinc-400 hover:text-white transition-all ml-2 shrink-0"
              aria-label="Zamknij dymek"
            >
              <X size={13} />
            </button>
          </div>

          {content}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-zinc-400 px-1">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] uppercase tracking-wider font-bold">Wskaźniki pogodowe</span>
        </div>
        <span className="text-[10px] text-zinc-500 font-medium">Dotknij kafelek po detale</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* ROW 1 - Card 1: Słońce & Paraboliczny Łuk lub Faza Księżyca */}
        <div
          onClick={() => toggleMetric('sun')}
          className={`relative overflow-hidden bg-zinc-900/50 backdrop-blur-2xl border rounded-2xl p-3.5 flex flex-col justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer ${
            selectedMetric === 'sun' ? 'border-amber-400/60 ring-1 ring-amber-400/40 bg-zinc-900/70' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-lg bg-amber-400/15 flex items-center justify-center text-amber-400 shrink-0">
                {sunArc.isDay ? <Sunrise className="w-3 h-3" /> : <Moon className="w-3 h-3 text-indigo-400" />}
              </div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 truncate">
                {sunArc.isDay ? 'Słońce' : 'Księżyc'}
              </span>
            </div>
            <ChevronRight size={12} className={`transition-transform duration-200 ${selectedMetric === 'sun' ? 'rotate-90 text-amber-400' : 'text-zinc-500'}`} />
          </div>

          {sunArc.isDay ? (
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-white tabular-nums tracking-tight">
                  {formatTime(sunrise)}
                </span>
                <span className="text-[10px] text-amber-300 font-medium">
                  {sunArc.countdown}
                </span>
              </div>

              {/* Sun Arc SVG */}
              <div className="w-full h-8 mt-0.5 relative">
                <svg viewBox="0 0 120 34" className="w-full h-full overflow-visible">
                  <line x1="0" y1="30" x2="120" y2="30" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                  <path d="M 10 30 Q 60 4 110 30" fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
                  <circle cx={sunX} cy={sunY} r="4" fill="#fbbf24" className="drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                </svg>
              </div>

              {/* Moon phase subtitle */}
              <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1 border-t border-white/5 pt-1">
                <span>Zachód: {formatTime(sunset)}</span>
                <span className="text-indigo-300 font-medium flex items-center gap-1">
                  <span>{moonPhaseInfo.icon}</span>
                  <span>{moonPhaseInfo.label}</span>
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-base font-bold text-white truncate">{moon.name}</div>
              <div className="text-xs text-indigo-300 font-semibold mt-0.5">{moon.illumination}% tarczy ({moonPhaseInfo.icon})</div>
              <div className="w-full h-1 bg-white/10 rounded-full mt-2.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full" style={{ width: `${moon.illumination}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* ROW 1 - Card 2: Widoczność */}
        <div
          onClick={() => toggleMetric('visibility')}
          className={`relative overflow-hidden bg-zinc-900/50 backdrop-blur-2xl border rounded-2xl p-3.5 flex flex-col justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer ${
            selectedMetric === 'visibility' ? 'border-emerald-400/60 ring-1 ring-emerald-400/40 bg-zinc-900/70' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-lg bg-emerald-400/15 flex items-center justify-center text-emerald-400 shrink-0">
                <Eye className="w-3 h-3" />
              </div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 truncate">Widoczność</span>
            </div>
            <ChevronRight size={12} className={`transition-transform duration-200 ${selectedMetric === 'visibility' ? 'rotate-90 text-emerald-400' : 'text-zinc-500'}`} />
          </div>

          <div className="my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white tabular-nums tracking-tight">
                {visibilityInfo.km}
              </span>
              <span className="text-xs font-normal text-zinc-400">km</span>
            </div>
            <div className={`text-[11px] font-semibold mt-0.5 truncate ${visibilityInfo.color}`}>
              {visibilityInfo.label}
            </div>
          </div>

          <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
              style={{ width: `${Math.min(100, Math.max(15, (visibilityMeters / 10000) * 100))}%` }}
            />
          </div>
        </div>

        {/* Translucent Bubble for Row 1 */}
        {(selectedMetric === 'sun' || selectedMetric === 'visibility') && renderBubble(selectedMetric, selectedMetric === 'sun')}

        {/* ROW 2 - Card 3: Zachmurzenie */}
        <div
          onClick={() => toggleMetric('cloudiness')}
          className={`relative overflow-hidden bg-zinc-900/50 backdrop-blur-2xl border rounded-2xl p-3.5 flex flex-col justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer ${
            selectedMetric === 'cloudiness' ? 'border-sky-400/60 ring-1 ring-sky-400/40 bg-zinc-900/70' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-lg bg-sky-400/15 flex items-center justify-center text-sky-400 shrink-0">
                <Cloud className="w-3 h-3" />
              </div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 truncate">Zachmurzenie</span>
            </div>
            <ChevronRight size={12} className={`transition-transform duration-200 ${selectedMetric === 'cloudiness' ? 'rotate-90 text-sky-400' : 'text-zinc-500'}`} />
          </div>

          <div className="my-0.5">
            <div className="text-xl font-bold text-white tabular-nums tracking-tight">
              {cloudCoverInfo.percent}%
            </div>
            <div className="text-[11px] text-zinc-300 font-medium mt-0.5 truncate">
              {cloudCoverInfo.label}
            </div>
          </div>

          <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-indigo-400 rounded-full"
              style={{ width: `${Math.min(100, Math.max(10, cloudCoverInfo.percent))}%` }}
            />
          </div>
        </div>

        {/* ROW 2 - Card 4: Wilgotność */}
        <div
          onClick={() => toggleMetric('humidity')}
          className={`relative overflow-hidden bg-zinc-900/50 backdrop-blur-2xl border rounded-2xl p-3.5 flex flex-col justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer ${
            selectedMetric === 'humidity' ? 'border-cyan-400/60 ring-1 ring-cyan-400/40 bg-zinc-900/70' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-lg bg-cyan-400/15 flex items-center justify-center text-cyan-400 shrink-0">
                <Droplets className="w-3 h-3" />
              </div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 truncate">Wilgotność</span>
            </div>
            <ChevronRight size={12} className={`transition-transform duration-200 ${selectedMetric === 'humidity' ? 'rotate-90 text-cyan-400' : 'text-zinc-500'}`} />
          </div>

          <div className="my-0.5">
            <div className="text-xl font-bold text-white tabular-nums tracking-tight">
              {Math.round(humidity)}%
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
              Punkt rosy: {dewPoint}°
            </div>
          </div>

          <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
              style={{ width: `${humidity}%` }}
            />
          </div>
        </div>

        {/* Translucent Bubble for Row 2 */}
        {(selectedMetric === 'cloudiness' || selectedMetric === 'humidity') && renderBubble(selectedMetric, selectedMetric === 'cloudiness')}

        {/* ROW 3 - Card 5: Indeks UV */}
        <div
          onClick={() => toggleMetric('uv')}
          className={`relative overflow-hidden bg-zinc-900/50 backdrop-blur-2xl border rounded-2xl p-3.5 flex flex-col justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer ${
            selectedMetric === 'uv' ? 'border-yellow-400/60 ring-1 ring-yellow-400/40 bg-zinc-900/70' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-lg bg-yellow-400/15 flex items-center justify-center text-yellow-400 shrink-0">
                <Sun className="w-3 h-3" />
              </div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 truncate">Indeks UV</span>
            </div>
            <ChevronRight size={12} className={`transition-transform duration-200 ${selectedMetric === 'uv' ? 'rotate-90 text-yellow-400' : 'text-zinc-500'}`} />
          </div>

          <div className="my-0.5">
            <div className="text-xl font-bold text-white tabular-nums tracking-tight">
              {Math.round(uvIndex)} <span className="text-xs font-normal text-zinc-400">/ 11</span>
            </div>
            <div className="text-[11px] text-yellow-300 font-semibold mt-0.5 truncate">
              {uvDescription(uvIndex)}
            </div>
          </div>

          <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-purple-500 rounded-full"
              style={{ width: `${Math.min(100, Math.round((uvIndex / 11) * 100))}%` }}
            />
          </div>
        </div>

        {/* ROW 3 - Card 6: Ciśnienie */}
        <div
          onClick={() => toggleMetric('pressure')}
          className={`relative overflow-hidden bg-zinc-900/50 backdrop-blur-2xl border rounded-2xl p-3.5 flex flex-col justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer ${
            selectedMetric === 'pressure' ? 'border-purple-400/60 ring-1 ring-purple-400/40 bg-zinc-900/70' : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-lg bg-purple-400/15 flex items-center justify-center text-purple-400 shrink-0">
                <Gauge className="w-3 h-3" />
              </div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 truncate">Ciśnienie</span>
            </div>
            <ChevronRight size={12} className={`transition-transform duration-200 ${selectedMetric === 'pressure' ? 'rotate-90 text-purple-400' : 'text-zinc-500'}`} />
          </div>

          <div className="my-0.5">
            <div className="text-xl font-bold text-white tabular-nums tracking-tight">
              {pressureText}
            </div>
            <div className="text-[11px] text-purple-300 font-semibold mt-0.5 truncate">
              {pressureDesc}
            </div>
          </div>

          <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(10, (((pressure || 1013) - 970) / (1040 - 970)) * 100))}%` }}
            />
          </div>
        </div>

        {/* Translucent Bubble for Row 3 */}
        {(selectedMetric === 'uv' || selectedMetric === 'pressure') && renderBubble(selectedMetric, selectedMetric === 'uv')}
      </div>
    </div>
  );
}

export const DetailsGrid = React.memo(DetailsGridComponent);
