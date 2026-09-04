'use client';

import React, { useEffect } from 'react';
import { X, Wind, Sun, Moon, Droplets, Eye, Gauge, ShieldAlert, Sparkles, Compass } from 'lucide-react';
import { HourlyData, DailyData, AirQualityData } from '@/lib/types';
import { formatTime, uvDescription, getAqiStatus, getMoonPhase } from '@/lib/utils';

export type MetricType = 'wind' | 'sun' | 'humidity' | 'uv' | 'visibility' | 'pressure' | 'aqi';

interface MetricDetailModalProps {
  type: MetricType | null;
  onClose: () => void;
  hourlyData: HourlyData;
  dailyData: DailyData;
  currentIdx: number;
  dailyIdx: number;
  airQuality?: AirQualityData;
}

export function MetricDetailModal({
  type,
  onClose,
  hourlyData,
  dailyData,
  currentIdx,
  dailyIdx,
  airQuality,
}: MetricDetailModalProps) {
  useEffect(() => {
    if (type) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [type]);

  if (!type) return null;

  const renderContent = () => {
    switch (type) {
      case 'wind': {
        const speed = Math.round(hourlyData.windspeed_10m[currentIdx] || 0);
        const gusts = Math.round(hourlyData.windgusts_10m?.[currentIdx] || speed * 1.35);
        const dir = hourlyData.winddirection_10m[currentIdx] || 0;
        let beaufort = 'Łagodny wiatr';
        if (speed < 6) beaufort = 'Cisza / Słaby powiew';
        else if (speed < 20) beaufort = 'Łagodny wiatr';
        else if (speed < 39) beaufort = 'Umiarkowany wiatr';
        else if (speed < 62) beaufort = 'Dość silny wiatr';
        else beaufort = 'Bardzo silny wiatr / Wichura';

        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <Wind size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Wiatr i porywy</h3>
                <p className="text-xs text-blue-300 font-medium">{beaufort}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Prędkość średnia</span>
                <span className="text-2xl font-bold text-white mt-1 tabular-nums">{speed} <span className="text-xs font-normal text-zinc-400">km/h</span></span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Porywy wiatru</span>
                <span className="text-2xl font-bold text-cyan-300 mt-1 tabular-nums">{gusts} <span className="text-xs font-normal text-zinc-400">km/h</span></span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Kierunek wiatru</span>
              <div className="flex items-center gap-1.5 text-white font-semibold">
                <span className="inline-block text-blue-400 font-bold" style={{ transform: `rotate(${dir}deg)` }}>↑</span>
                <span>{dir}°</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed bg-blue-500/10 border border-blue-400/15 rounded-2xl p-3">
              Porywy wiatru mogą być odczuwalnie silniejsze w otwartych przestrzeniach i wyższych partiach terenu.
            </p>
          </div>
        );
      }

      case 'sun': {
        const sunrise = dailyData.sunrise[dailyIdx];
        const sunset = dailyData.sunset[dailyIdx];
        const moon = getMoonPhase();

        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Sun size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Słońce i Księżyc</h3>
                <p className="text-xs text-amber-300 font-medium">Cykl dobowy i fazy</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Wschód słońca</span>
                <span className="text-xl font-bold text-white mt-1 tabular-nums">{formatTime(sunrise)}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Zachód słońca</span>
                <span className="text-xl font-bold text-amber-400 mt-1 tabular-nums">{formatTime(sunset)}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Moon size={15} className="text-indigo-400" />
                <span className="text-zinc-300 font-medium">Faza księżyca</span>
              </div>
              <span className="text-indigo-300 font-bold">{moon.name} ({moon.illumination}%)</span>
            </div>
          </div>
        );
      }

      case 'uv': {
        const uv = Math.round(dailyData.uv_index_max?.[dailyIdx] || 0);
        let protection = 'Ochrona nie jest wymagana';
        let spf = 'Brak';
        if (uv >= 8) {
          protection = 'Bardzo silne słońce. Unikaj przebywania na słońcu w godzinach 11:00-15:00.';
          spf = 'SPF 50+';
        } else if (uv >= 6) {
          protection = 'Wysokie promieniowanie. Szukaj cienia w południe, nakryj głowę.';
          spf = 'SPF 30-50';
        } else if (uv >= 3) {
          protection = 'Umiarkowane promieniowanie. Zalecany krem ochronny i okulary.';
          spf = 'SPF 15-30';
        }

        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-yellow-500/15 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
                <Sun size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Indeks UV: {uv} / 11</h3>
                <p className="text-xs text-yellow-300 font-medium">{uvDescription(uv)}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Zalecany filtr</span>
              <span className="text-yellow-300 font-bold">{spf}</span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-yellow-500/10 border border-yellow-400/20 rounded-2xl p-3">
              {protection}
            </p>
          </div>
        );
      }

      case 'pressure': {
        const pressure = Math.round(hourlyData.surface_pressure?.[currentIdx] || 1013);
        let desc = 'Ciśnienie w normie barycznej.';
        if (pressure > 1020) desc = 'Wyż atmosferyczny. Sprzyja stabilnej pogodzie i dobremu samopoczuciu.';
        else if (pressure < 1005) desc = 'Niż baryczny. Możliwe wahania nastroju i bóle głowy u meteopatów.';

        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-400">
                <Gauge size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Ciśnienie atmosferyczne</h3>
                <p className="text-xs text-purple-300 font-medium">{pressure} hPa</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-purple-500/10 border border-purple-400/20 rounded-2xl p-3">
              {desc}
            </p>
          </div>
        );
      }

      case 'aqi': {
        const aqi = airQuality?.european_aqi ?? 25;
        const pm10 = airQuality?.pm10 ? `${Math.round(airQuality.pm10)} µg/m³` : '18 µg/m³';
        const pm25 = airQuality?.pm2_5 ? `${Math.round(airQuality.pm2_5)} µg/m³` : '9 µg/m³';
        const status = getAqiStatus(aqi);

        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Jakość powietrza</h3>
                <p className={`text-xs font-semibold ${status.color}`}>Indeks: {status.label} ({Math.round(aqi)})</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Pył PM2.5</span>
                <span className="text-lg font-bold text-white mt-1 tabular-nums">{pm25}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Pył PM10</span>
                <span className="text-lg font-bold text-white mt-1 tabular-nums">{pm10}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-3">
              {status.advice}
            </p>
          </div>
        );
      }

      default: {
        const temp = hourlyData.temperature_2m[currentIdx] || 0;
        const humidity = hourlyData.relativehumidity_2m[currentIdx] || 0;
        const dewPoint = Math.round(temp - (100 - humidity) / 5);

        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                <Droplets size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Wilgotność: {Math.round(humidity)}%</h3>
                <p className="text-xs text-cyan-300 font-medium">Punkt rosy: {dewPoint}°</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-cyan-500/10 border border-cyan-400/20 rounded-2xl p-3">
              Wilgotność na optymalnym poziomie 40-60% zapewnia najwyższy komfort oddychania.
            </p>
          </div>
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-[360px] bg-zinc-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            aria-label="Zamknij"
          >
            <X size={16} />
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
