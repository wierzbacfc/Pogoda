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
  Thermometer,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export type MetricType =
  | 'sun'
  | 'temp_range'
  | 'uv'
  | 'pressure'
  | 'humidity'
  | 'visibility'
  | 'cloudiness'
  | 'moon';

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

  // Daily Min / Max Temperatures & Amplitude
  const minTemp = dailyData.temperature_2m_min[dailyIdx] || 0;
  const maxTemp = dailyData.temperature_2m_max[dailyIdx] || 0;
  const tempAmplitude = Math.max(0, Math.round(maxTemp - minTemp));
  const tempSpan = Math.max(1, maxTemp - minTemp);
  const currentTempPos = Math.max(0, Math.min(100, ((temp - minTemp) / tempSpan) * 100));

  // Determine peak & low temperature hours
  const todayDateKey = dailyData.time?.[dailyIdx] || '';
  let peakHour = '14:00';
  let lowHour = '05:00';
  if (hourlyData.time && hourlyData.temperature_2m) {
    let maxVal = -Infinity;
    let minVal = Infinity;
    for (let i = 0; i < hourlyData.time.length; i++) {
      if (todayDateKey && hourlyData.time[i].startsWith(todayDateKey)) {
        const val = hourlyData.temperature_2m[i];
        if (val > maxVal) {
          maxVal = val;
          peakHour = formatTime(hourlyData.time[i]);
        }
        if (val < minVal) {
          minVal = val;
          lowHour = formatTime(hourlyData.time[i]);
        }
      }
    }
  }

  // Parabolic sun coordinates for SVG
  const sunX = 12 + sunArc.progress * 106;
  const sunY = 32 - Math.sin(sunArc.progress * Math.PI) * 25;

  // Render content inside the translucent speech bubble (dymek)
  const renderBubble = (type: MetricType, isLeft: boolean) => {
    let headerIcon = <Sparkles size={16} className="text-blue-400" />;
    let title = '';
    let badge = '';
    let content = null;

    if (type === 'sun') {
      headerIcon = <Sun size={16} className="text-amber-400" />;
      title = 'Wschód i Zachód Słońca';
      badge = sunArc.isDay ? sunArc.countdown : (sunArc.countdown || 'Noc');
      content = (
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                <Sunrise size={12} className="text-amber-400" /> Wschód słońca
              </span>
              <span className="text-sm font-bold text-white mt-0.5 tabular-nums">{formatTime(sunrise)}</span>
              <span className="text-[10px] text-amber-300/80 mt-0.5">Złota godzina poranna</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                <Sunset size={12} className="text-orange-400" /> Zachód słońca
              </span>
              <span className="text-sm font-bold text-orange-300 mt-0.5 tabular-nums">{formatTime(sunset)}</span>
              <span className="text-[10px] text-orange-300/80 mt-0.5">Złota godzina wieczorna</span>
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Sparkles size={13} className="text-amber-400" />
              <span>Długość dnia</span>
            </div>
            <span className="font-bold text-amber-300 tabular-nums">{sunArc.daylightStr}</span>
          </div>
          <p className="text-xs text-zinc-300 bg-amber-500/10 border border-amber-400/20 rounded-2xl p-2.5 leading-relaxed">
            {sunArc.isDay
              ? `Obecnie trwa dzień (${sunArc.solarPhase}). ${sunArc.countdown}.`
              : `Obecnie trwa noc. ${sunArc.countdown}.`}
          </p>
        </div>
      );
    } else if (type === 'temp_range') {
      headerIcon = <Thermometer size={16} className="text-cyan-400" />;
      title = 'Zakres temperatur dobowych';
      badge = `Δ ${tempAmplitude}°C`;
      content = (
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                <ArrowUp size={12} className="text-amber-400" /> Maks. dzisiaj
              </span>
              <span className="text-sm font-bold text-amber-300 mt-0.5 tabular-nums">{Math.round(maxTemp)}°C</span>
              <span className="text-[10px] text-zinc-400 mt-0.5">Szczyt: ~{peakHour}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                <ArrowDown size={12} className="text-cyan-400" /> Min. dzisiaj
              </span>
              <span className="text-sm font-bold text-cyan-300 mt-0.5 tabular-nums">{Math.round(minTemp)}°C</span>
              <span className="text-[10px] text-zinc-400 mt-0.5">Spadek: ~{lowHour}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-between text-xs">
            <span className="text-zinc-300">Amplituda termiczna</span>
            <span className="font-bold text-white tabular-nums">{tempAmplitude}°C ({tempAmplitude > 10 ? 'Wyraźna różnica' : 'Umiarkowana'})</span>
          </div>
          <p className="text-xs text-zinc-300 bg-cyan-500/10 border border-cyan-400/20 rounded-2xl p-2.5 leading-relaxed">
            {tempAmplitude >= 12
              ? 'Duża dobowa rozpiętość temperatur. Poranek i wieczór odczuwalnie chłodniejsze od popołudniowego maksimum.'
              : 'Wyrównany przebieg temperatur w ciągu doby, bez gwałtownych skoków termicznych.'}
          </p>
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
    } else if (type === 'moon') {
      headerIcon = <Moon size={16} className="text-indigo-400" />;
      title = 'Faza Księżyca i Cykl';
      badge = `${moon.illumination}%`;
      content = (
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Faza tarczy</span>
              <span className="text-xs sm:text-sm font-bold text-white mt-0.5 flex items-center gap-1.5 leading-tight">
                <span>{moonPhaseInfo.icon}</span>
                <span>{moonPhaseInfo.label}</span>
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Oświetlenie</span>
              <span className="text-sm font-bold text-indigo-300 mt-0.5 tabular-nums">{moon.illumination}% tarczy</span>
            </div>
          </div>
          <p className="text-xs text-zinc-300 bg-indigo-500/10 border border-indigo-400/20 rounded-2xl p-2.5 leading-relaxed">
            Księżyc w fazie &bdquo;{moon.name}&rdquo;. Pełny cykl synodyczny trwa 29.5 dnia, a aktualna widoczność sprzyja nocnym obserwacjom nieba.
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
    <div className="flex flex-col gap-2.5 glass-isolate">
      <div className="flex items-center justify-between text-zinc-400 px-1">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] uppercase tracking-wider font-bold">Wskaźniki pogodowe</span>
        </div>
        <span className="text-[10px] text-zinc-500 font-medium">Dotknij kafelek po detale</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* ROW 1 - Card 1: Wschód i Zachód Słońca */}
        <div
          onClick={() => toggleMetric('sun')}
          className={`relative overflow-hidden bg-gradient-to-b from-zinc-900/70 via-zinc-900/50 to-zinc-950/80 backdrop-blur-2xl border rounded-3xl p-3.5 flex flex-col justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer glass-isolate ${
            selectedMetric === 'sun'
              ? 'border-amber-400/60 ring-1 ring-amber-400/40 bg-zinc-900/80'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          {/* Specular top light rim */}
          <div className="absolute top-0 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          {/* Ambient solar glow - pure radial gradient */}
          <div
            className="absolute -top-6 -left-6 w-20 h-20 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)' }}
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-1.5 relative z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-400/25 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                <Sun className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-300 truncate">
                Słońce
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300">
                {sunArc.solarPhase}
              </span>
              <ChevronRight
                size={13}
                className={`transition-transform duration-200 ${
                  selectedMetric === 'sun' ? 'rotate-90 text-amber-400' : 'text-zinc-500'
                }`}
              />
            </div>
          </div>

          {/* Solar Arc SVG */}
          <div className="w-full h-8 my-0.5 relative">
            <svg viewBox="0 0 130 36" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="sunArcGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              {/* Horizon line */}
              <line x1="5" y1="32" x2="125" y2="32" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              {/* Sun trajectory arc */}
              <path d="M 12 32 Q 65 5 118 32" fill="none" stroke="url(#sunArcGrad)" strokeWidth="1.5" strokeDasharray="3 2" />
              {/* Sun orb */}
              {sunArc.isDay && (
                <g transform={`translate(${sunX}, ${sunY})`}>
                  <circle r="7" fill="#fbbf24" opacity="0.25" className="animate-pulse" />
                  <circle r="3.5" fill="#fef08a" className="drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                </g>
              )}
            </svg>
          </div>

          {/* Twin Solar Badges: Wschód vs Zachód */}
          <div className="grid grid-cols-2 gap-1 my-0.5">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-amber-400 flex items-center gap-0.5">
                <ArrowUp size={9} /> Wschód
              </span>
              <span className="text-xs font-black text-white tabular-nums tracking-tight">
                {formatTime(sunrise)}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-bold text-orange-400 flex items-center justify-end gap-0.5">
                <ArrowDown size={9} /> Zachód
              </span>
              <span className="text-xs font-black text-white tabular-nums tracking-tight">
                {formatTime(sunset)}
              </span>
            </div>
          </div>

          {/* Footer: Daylight Length */}
          <div className="flex items-center justify-between text-[9px] text-zinc-400 mt-1.5 pt-1 border-t border-white/5">
            <span>Długość dnia:</span>
            <span className="font-bold text-zinc-200 tabular-nums">{sunArc.daylightStr}</span>
          </div>
        </div>

        {/* ROW 1 - Card 2: Zakres Temperatur (Temp Min / Maks) */}
        <div
          onClick={() => toggleMetric('temp_range')}
          className={`relative overflow-hidden bg-gradient-to-b from-zinc-900/70 via-zinc-900/50 to-zinc-950/80 backdrop-blur-2xl border rounded-3xl p-3.5 flex flex-col justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer glass-isolate ${
            selectedMetric === 'temp_range'
              ? 'border-cyan-400/60 ring-1 ring-cyan-400/40 bg-zinc-900/80'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          {/* Specular top light rim */}
          <div className="absolute top-0 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          {/* Ambient cold/warm glow - pure radial gradient */}
          <div
            className="absolute -top-6 -left-6 w-20 h-20 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%)' }}
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-1.5 relative z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/15 border border-cyan-400/25 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                <Thermometer className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-300">
                Min / Maks
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300">
                Δ {tempAmplitude}°
              </span>
              <ChevronRight
                size={13}
                className={`transition-transform duration-200 ${
                  selectedMetric === 'temp_range' ? 'rotate-90 text-cyan-400' : 'text-zinc-500'
                }`}
              />
            </div>
          </div>

          {/* Twin Temperature Readouts (Maks vs Min) */}
          <div className="grid grid-cols-2 gap-1 my-1">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-amber-400 flex items-center gap-0.5">
                <ArrowUp size={9} /> Maks.
              </span>
              <span className="text-xl font-black text-amber-300 tabular-nums tracking-tight">
                {Math.round(maxTemp)}°
              </span>
              <span className="text-[9px] text-zinc-400 leading-none mt-0.5 truncate">
                ~{peakHour}
              </span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-bold text-cyan-400 flex items-center justify-end gap-0.5">
                <ArrowDown size={9} /> Min.
              </span>
              <span className="text-xl font-black text-cyan-300 tabular-nums tracking-tight">
                {Math.round(minTemp)}°
              </span>
              <span className="text-[9px] text-zinc-400 leading-none mt-0.5 truncate">
                ~{lowHour}
              </span>
            </div>
          </div>

          {/* Thermal Spectrum Bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full relative overflow-hidden mt-1 shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400 opacity-80" />
            <div
              className="absolute top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_6px_#ffffff]"
              style={{ left: `calc(${currentTempPos}% - 4px)` }}
            />
          </div>

          {/* Footer: Current temp label */}
          <div className="flex items-center justify-between text-[9px] text-zinc-400 mt-1.5 pt-1 border-t border-white/5">
            <span>Bieżąca:</span>
            <span className="font-bold text-zinc-200 tabular-nums">{Math.round(temp)}°C</span>
          </div>
        </div>

        {/* Translucent Bubble for Row 1 */}
        {(selectedMetric === 'sun' || selectedMetric === 'temp_range') &&
          renderBubble(selectedMetric, selectedMetric === 'sun')}

        {/* ROW 2 - Card 3: Indeks UV */}
        <div
          onClick={() => toggleMetric('uv')}
          className={`relative overflow-hidden bg-gradient-to-b from-zinc-900/70 via-zinc-900/50 to-zinc-950/80 backdrop-blur-2xl border rounded-3xl p-3.5 flex flex-col justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer glass-isolate ${
            selectedMetric === 'uv'
              ? 'border-yellow-400/60 ring-1 ring-yellow-400/40 bg-zinc-900/80'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          {/* Specular top light rim */}
          <div className="absolute top-0 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          {/* Ambient yellow glow - pure radial gradient */}
          <div
            className="absolute -top-6 -left-6 w-20 h-20 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(234, 179, 8, 0.2) 0%, transparent 70%)' }}
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-1.5 relative z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-yellow-400/15 border border-yellow-400/25 flex items-center justify-center text-yellow-400 shrink-0 shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                <Sun className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-300 truncate">
                Indeks UV
              </span>
            </div>
            <ChevronRight
              size={13}
              className={`transition-transform duration-200 ${
                selectedMetric === 'uv' ? 'rotate-90 text-yellow-400' : 'text-zinc-500'
              }`}
            />
          </div>

          <div className="my-0.5">
            <div className="text-xl font-black text-white tabular-nums tracking-tight">
              {Math.round(uvIndex)} <span className="text-xs font-normal text-zinc-400">/ 11</span>
            </div>
            <div className="text-[11px] text-yellow-300 font-semibold mt-0.5 truncate">
              {uvDescription(uvIndex)}
            </div>
          </div>

          <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-purple-500 rounded-full"
              style={{ width: `${Math.min(100, Math.round((uvIndex / 11) * 100))}%` }}
            />
          </div>
        </div>

        {/* ROW 2 - Card 4: Ciśnienie */}
        <div
          onClick={() => toggleMetric('pressure')}
          className={`relative overflow-hidden bg-gradient-to-b from-zinc-900/70 via-zinc-900/50 to-zinc-950/80 backdrop-blur-2xl border rounded-3xl p-3.5 flex flex-col justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer glass-isolate ${
            selectedMetric === 'pressure'
              ? 'border-purple-400/60 ring-1 ring-purple-400/40 bg-zinc-900/80'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          {/* Specular top light rim */}
          <div className="absolute top-0 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          {/* Ambient purple glow - pure radial gradient */}
          <div
            className="absolute -top-6 -left-6 w-20 h-20 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)' }}
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-1.5 relative z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-purple-400/15 border border-purple-400/25 flex items-center justify-center text-purple-400 shrink-0 shadow-[0_0_10px_rgba(192,132,252,0.2)]">
                <Gauge className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-300 truncate">
                Ciśnienie
              </span>
            </div>
            <ChevronRight
              size={13}
              className={`transition-transform duration-200 ${
                selectedMetric === 'pressure' ? 'rotate-90 text-purple-400' : 'text-zinc-500'
              }`}
            />
          </div>

          <div className="my-0.5">
            <div className="text-xl font-black text-white tabular-nums tracking-tight">
              {pressureText}
            </div>
            <div className="text-[11px] text-purple-300 font-semibold mt-0.5 truncate">
              {pressureDesc}
            </div>
          </div>

          <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full"
              style={{
                width: `${Math.min(100, Math.max(10, (((pressure || 1013) - 970) / (1040 - 970)) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Translucent Bubble for Row 2 */}
        {(selectedMetric === 'uv' || selectedMetric === 'pressure') &&
          renderBubble(selectedMetric, selectedMetric === 'uv')}

        {/* ROW 3 - Card 5: Wilgotność */}
        <div
          onClick={() => toggleMetric('humidity')}
          className={`relative overflow-hidden bg-gradient-to-b from-zinc-900/70 via-zinc-900/50 to-zinc-950/80 backdrop-blur-2xl border rounded-3xl p-3.5 flex flex-col justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer glass-isolate ${
            selectedMetric === 'humidity'
              ? 'border-cyan-400/60 ring-1 ring-cyan-400/40 bg-zinc-900/80'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          {/* Specular top light rim */}
          <div className="absolute top-0 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          {/* Ambient cyan glow - pure radial gradient */}
          <div
            className="absolute -top-6 -left-6 w-20 h-20 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%)' }}
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-1.5 relative z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-cyan-400/15 border border-cyan-400/25 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                <Droplets className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-300 truncate">
                Wilgotność
              </span>
            </div>
            <ChevronRight
              size={13}
              className={`transition-transform duration-200 ${
                selectedMetric === 'humidity' ? 'rotate-90 text-cyan-400' : 'text-zinc-500'
              }`}
            />
          </div>

          <div className="my-0.5">
            <div className="text-xl font-black text-white tabular-nums tracking-tight">
              {Math.round(humidity)}%
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
              Punkt rosy: {dewPoint}°
            </div>
          </div>

          <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
              style={{ width: `${humidity}%` }}
            />
          </div>
        </div>

        {/* ROW 3 - Card 6: Widoczność */}
        <div
          onClick={() => toggleMetric('visibility')}
          className={`relative overflow-hidden bg-gradient-to-b from-zinc-900/70 via-zinc-900/50 to-zinc-950/80 backdrop-blur-2xl border rounded-3xl p-3.5 flex flex-col justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer glass-isolate ${
            selectedMetric === 'visibility'
              ? 'border-emerald-400/60 ring-1 ring-emerald-400/40 bg-zinc-900/80'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          {/* Specular top light rim */}
          <div className="absolute top-0 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          {/* Ambient emerald glow - pure radial gradient */}
          <div
            className="absolute -top-6 -left-6 w-20 h-20 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)' }}
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-1.5 relative z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-emerald-400/15 border border-emerald-400/25 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-300 truncate">
                Widoczność
              </span>
            </div>
            <ChevronRight
              size={13}
              className={`transition-transform duration-200 ${
                selectedMetric === 'visibility' ? 'rotate-90 text-emerald-400' : 'text-zinc-500'
              }`}
            />
          </div>

          <div className="my-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-white tabular-nums tracking-tight">
                {visibilityInfo.km}
              </span>
              <span className="text-xs font-normal text-zinc-400">km</span>
            </div>
            <div className={`text-[11px] font-semibold mt-0.5 truncate ${visibilityInfo.color}`}>
              {visibilityInfo.label}
            </div>
          </div>

          <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
              style={{ width: `${Math.min(100, Math.max(15, (visibilityMeters / 10000) * 100))}%` }}
            />
          </div>
        </div>

        {/* Translucent Bubble for Row 3 */}
        {(selectedMetric === 'humidity' || selectedMetric === 'visibility') &&
          renderBubble(selectedMetric, selectedMetric === 'humidity')}

        {/* ROW 4 - Card 7: Zachmurzenie */}
        <div
          onClick={() => toggleMetric('cloudiness')}
          className={`relative overflow-hidden bg-gradient-to-b from-zinc-900/70 via-zinc-900/50 to-zinc-950/80 backdrop-blur-2xl border rounded-3xl p-3.5 flex flex-col justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer glass-isolate ${
            selectedMetric === 'cloudiness'
              ? 'border-sky-400/60 ring-1 ring-sky-400/40 bg-zinc-900/80'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          {/* Specular top light rim */}
          <div className="absolute top-0 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          {/* Ambient sky glow - pure radial gradient */}
          <div
            className="absolute -top-6 -left-6 w-20 h-20 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, transparent 70%)' }}
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-1.5 relative z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-sky-400/15 border border-sky-400/25 flex items-center justify-center text-sky-400 shrink-0 shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                <Cloud className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-300 truncate">
                Zachmurzenie
              </span>
            </div>
            <ChevronRight
              size={13}
              className={`transition-transform duration-200 ${
                selectedMetric === 'cloudiness' ? 'rotate-90 text-sky-400' : 'text-zinc-500'
              }`}
            />
          </div>

          <div className="my-0.5">
            <div className="text-xl font-black text-white tabular-nums tracking-tight">
              {cloudCoverInfo.percent}%
            </div>
            <div className="text-[11px] text-zinc-300 font-medium mt-0.5 truncate">
              {cloudCoverInfo.label}
            </div>
          </div>

          <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-indigo-400 rounded-full"
              style={{ width: `${Math.min(100, Math.max(10, cloudCoverInfo.percent))}%` }}
            />
          </div>
        </div>

        {/* ROW 4 - Card 8: Faza Księżyca */}
        <div
          onClick={() => toggleMetric('moon')}
          className={`relative overflow-hidden bg-gradient-to-b from-zinc-900/70 via-zinc-900/50 to-zinc-950/80 backdrop-blur-2xl border rounded-3xl p-3.5 flex flex-col justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer glass-isolate ${
            selectedMetric === 'moon'
              ? 'border-indigo-400/60 ring-1 ring-indigo-400/40 bg-zinc-900/80'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          {/* Specular top light rim */}
          <div className="absolute top-0 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          {/* Ambient lunar glow - pure radial gradient */}
          <div
            className="absolute -top-6 -left-6 w-20 h-20 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)' }}
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-1.5 relative z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/15 border border-indigo-400/25 flex items-center justify-center text-indigo-400 shrink-0 shadow-[0_0_12px_rgba(129,140,248,0.2)]">
                <Moon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-300 truncate">
                Księżyc
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-400/10 border border-indigo-400/20 text-indigo-300">
                {moon.illumination}%
              </span>
              <ChevronRight
                size={13}
                className={`transition-transform duration-200 ${
                  selectedMetric === 'moon' ? 'rotate-90 text-indigo-400' : 'text-zinc-500'
                }`}
              />
            </div>
          </div>

          <div className="my-0.5">
            <div className="text-sm font-extrabold text-white flex items-center gap-1.5 leading-tight">
              <span className="shrink-0">{moonPhaseInfo.icon}</span>
              <span className="truncate">{moonPhaseInfo.label}</span>
            </div>
            <div className="text-[11px] text-indigo-300 font-semibold mt-0.5 truncate">
              {moon.illumination}% tarczy
            </div>
          </div>

          <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
              style={{ width: `${moon.illumination}%` }}
            />
          </div>
        </div>

        {/* Translucent Bubble for Row 4 */}
        {(selectedMetric === 'cloudiness' || selectedMetric === 'moon') &&
          renderBubble(selectedMetric, selectedMetric === 'cloudiness')}
      </div>
    </div>
  );
}

export const DetailsGrid = React.memo(DetailsGridComponent);
