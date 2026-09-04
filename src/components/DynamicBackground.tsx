'use client';

import React, { useMemo } from 'react';
import { getBgGradient, getWeatherEffectType } from '@/lib/weather-codes';

interface DynamicBackgroundProps {
  weatherCode: number;
  isDay: boolean;
}

interface RainParticle {
  id: number;
  left: number;
  height: number;
  duration: number;
  delay: number;
  opacity: number;
  isForeground: boolean;
}

interface DrizzleParticle {
  id: number;
  left: number;
  height: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface SnowParticle {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  isBokeh: boolean;
}

interface StarParticle {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  isBright: boolean;
}

interface SunMote {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
}

export default function DynamicBackground({ weatherCode, isDay }: DynamicBackgroundProps) {
  const gradient = getBgGradient(weatherCode, isDay);
  const effectType = getWeatherEffectType(weatherCode, isDay);

  // Rain particles: 2-plane depth (foreground crisp streaks + background fine blurred streaks)
  const rainParticles: RainParticle[] = useMemo(() => {
    if (effectType !== 'rain' && effectType !== 'storm') return [];
    return Array.from({ length: 38 }).map((_, i) => ({
      id: i,
      left: (i * 2.65 + 1.2) % 100,
      height: i % 3 === 0 ? 32 + ((i * 5) % 22) : 20 + ((i * 4) % 16),
      duration: i % 3 === 0 ? 0.55 + ((i * 3) % 4) * 0.08 : 0.75 + ((i * 2) % 4) * 0.1,
      delay: ((i * 11) % 20) * 0.1,
      opacity: i % 3 === 0 ? 0.65 : 0.35,
      isForeground: i % 3 === 0,
    }));
  }, [effectType]);

  // Drizzle particles (mżawka - drobne, świetliste kropelki)
  const drizzleParticles: DrizzleParticle[] = useMemo(() => {
    if (effectType !== 'drizzle') return [];
    return Array.from({ length: 32 }).map((_, i) => ({
      id: i,
      left: (i * 3.1 + 1.5) % 98,
      height: 12 + ((i * 5) % 14),
      duration: 1.1 + ((i * 3) % 5) * 0.12,
      delay: ((i * 9) % 25) * 0.1,
      opacity: 0.35 + ((i * 4) % 3) * 0.15,
    }));
  }, [effectType]);

  // Snow particles: 2-plane depth (large soft blurred bokeh flakes + crisp foreground flakes)
  const snowParticles: SnowParticle[] = useMemo(() => {
    if (effectType !== 'snow') return [];
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: (i * 3.3 + 1.8) % 98,
      size: i % 4 === 0 ? 6 + ((i * 2) % 5) : 2.5 + ((i * 3) % 4),
      duration: i % 4 === 0 ? 4.5 + ((i * 3) % 3) : 3.2 + ((i * 5) % 4),
      delay: ((i * 7) % 30) * 0.1,
      isBokeh: i % 4 === 0,
    }));
  }, [effectType]);

  // Star particles: bright glowing stars + faint twinkling background stars
  const starParticles: StarParticle[] = useMemo(() => {
    if (effectType !== 'starry' && effectType !== 'partly-night') return [];
    const count = effectType === 'starry' ? 42 : 22;
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: (i * 2.4 + 1) % 98,
      top: ((i * 6.5) % 68) + 2,
      size: i % 5 === 0 ? 3 : (i % 2 === 0 ? 2 : 1.2),
      duration: 1.6 + ((i * 2) % 3),
      delay: ((i * 5) % 30) * 0.1,
      isBright: i % 5 === 0,
    }));
  }, [effectType]);

  // Sun motes: golden floating light motes
  const sunMotes: SunMote[] = useMemo(() => {
    if (effectType !== 'sunny') return [];
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: 35 + ((i * 4.2) % 62),
      top: 8 + ((i * 5.8) % 50),
      size: 2 + ((i % 3) * 1.8),
      duration: 3.5 + ((i * 2) % 4),
      delay: ((i * 7) % 20) * 0.2,
    }));
  }, [effectType]);

  const hasClouds = ['partly', 'partly-night', 'cloudy', 'cloudy-night', 'storm', 'drizzle', 'fog'].includes(effectType);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden transition-all duration-1000 z-0"
      style={{ background: gradient }}
    >
      {/* Soft atmospheric vignette - keeps status bar and bottom legible while letting vivid colors radiate */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/35 pointer-events-none" />

      {/* ================= 1. SUNNY ================= */}
      {effectType === 'sunny' && (
        <>
          {/* Intense solar corona & golden glow */}
          <div
            className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-amber-400/40 blur-3xl pointer-events-none"
            style={{ animation: 'sun-ray-pulse 6s ease-in-out infinite' }}
          />
          <div
            className="absolute top-4 right-4 w-56 h-56 rounded-full bg-yellow-300/30 blur-2xl pointer-events-none"
            style={{ animation: 'sun-ray-pulse 4.5s ease-in-out 1s infinite reverse' }}
          />
          <div
            className="absolute top-40 right-20 w-72 h-72 rounded-full bg-orange-400/15 blur-3xl pointer-events-none"
            style={{ animation: 'sun-ray-pulse 8s ease-in-out 2s infinite' }}
          />
          {/* Ambient warm light wash behind the cards */}
          <div className="absolute top-[40%] left-[-10%] w-[120%] h-80 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />

          {/* Golden luminous sun motes */}
          {sunMotes.map((m) => (
            <div
              key={m.id}
              className="absolute rounded-full bg-amber-100 blur-[0.3px] pointer-events-none shadow-[0_0_8px_rgba(255,220,100,0.9)]"
              style={{
                left: `${m.left}%`,
                top: `${m.top}%`,
                width: `${m.size}px`,
                height: `${m.size}px`,
                animation: `sun-mote ${m.duration}s ease-in-out ${m.delay}s infinite`,
              }}
            />
          ))}
        </>
      )}

      {/* ================= 2. PARTLY CLOUDY ================= */}
      {effectType === 'partly' && (
        <>
          {/* Warm sunburst shining behind clouds */}
          <div
            className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-amber-400/30 blur-3xl pointer-events-none"
            style={{ animation: 'sun-ray-pulse 8s ease-in-out infinite' }}
          />
          <div className="absolute top-[35%] right-[-10%] w-72 h-72 rounded-full bg-sky-400/20 blur-3xl pointer-events-none" />
        </>
      )}

      {/* ================= 3. CLOUDS (PARALLAX LAYERS) ================= */}
      {hasClouds && (
        <>
          <div
            className="absolute top-8 -left-24 w-[120%] h-56 rounded-full bg-white/[0.08] blur-3xl pointer-events-none"
            style={{ animation: 'cloud-drift-horizontal 22s ease-in-out infinite' }}
          />
          <div
            className="absolute top-36 -right-20 w-[110%] h-52 rounded-full bg-blue-200/[0.06] blur-3xl pointer-events-none"
            style={{ animation: 'cloud-drift-slow 28s ease-in-out 2s infinite' }}
          />
          <div
            className="absolute top-72 -left-16 w-96 h-48 rounded-full bg-slate-300/[0.04] blur-3xl pointer-events-none"
            style={{ animation: 'cloud-drift-horizontal 34s ease-in-out 5s infinite reverse' }}
          />
        </>
      )}

      {/* ================= 4. NIGHT (STARRY & PARTLY NIGHT) ================= */}
      {(effectType === 'starry' || effectType === 'partly-night') && (
        <>
          {/* Cosmic Aurora / Nebula glow behind cards */}
          <div className="absolute top-[20%] right-[-10%] w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          <div className="absolute top-[50%] left-[-15%] w-96 h-96 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

          {/* Twinkling star field */}
          {starParticles.map((p) => (
            <div
              key={p.id}
              className={`absolute bg-white rounded-full pointer-events-none ${
                p.isBright ? 'shadow-[0_0_8px_rgba(255,255,255,1)]' : 'shadow-[0_0_3px_rgba(200,225,255,0.7)]'
              }`}
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animation: `twinkle ${p.duration}s ease-in-out ${p.delay}s infinite`,
              }}
            />
          ))}

          {/* Majestic shooting stars across the night sky */}
          <div
            className="absolute top-[16%] left-[20%] w-24 h-[1.8px] bg-gradient-to-r from-white via-cyan-200 to-transparent pointer-events-none shadow-[0_0_12px_rgba(255,255,255,0.9)]"
            style={{ animation: 'shooting-star 12s ease-in-out 3s infinite' }}
          />
          <div
            className="absolute top-[38%] left-[55%] w-16 h-[1.2px] bg-gradient-to-r from-white via-indigo-200 to-transparent pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.7)]"
            style={{ animation: 'shooting-star 18s ease-in-out 9s infinite' }}
          />
        </>
      )}

      {/* ================= 5. DRIZZLE ================= */}
      {effectType === 'drizzle' && (
        <>
          <div className="absolute top-[25%] inset-x-0 h-64 bg-cyan-400/10 blur-3xl pointer-events-none" />
          {drizzleParticles.map((p) => (
            <div
              key={p.id}
              className="absolute top-[-25px] w-[1px] bg-gradient-to-b from-cyan-100 to-cyan-400 rounded-full pointer-events-none shadow-[0_0_4px_rgba(34,211,238,0.6)]"
              style={{
                left: `${p.left}%`,
                height: `${p.height}px`,
                opacity: p.opacity,
                animation: `drizzle-fall ${p.duration}s linear ${p.delay}s infinite`,
              }}
            />
          ))}
        </>
      )}

      {/* ================= 6. RAIN ================= */}
      {(effectType === 'rain' || effectType === 'storm') && (
        <>
          {/* Deep oceanic backlight glow */}
          <div className="absolute top-[30%] inset-x-0 h-80 bg-blue-500/15 blur-3xl pointer-events-none" />

          {/* Multi-depth rain streaks */}
          {rainParticles.map((p) => (
            <div
              key={p.id}
              className={`absolute top-[-40px] rounded-full pointer-events-none ${
                p.isForeground
                  ? 'w-[1.8px] bg-gradient-to-b from-cyan-100 via-blue-300 to-blue-400 shadow-[0_0_6px_rgba(56,189,248,0.7)]'
                  : 'w-[1px] bg-blue-200/50 blur-[0.4px]'
              }`}
              style={{
                left: `${p.left}%`,
                height: `${p.height}px`,
                opacity: p.opacity,
                animation: `rain-fall ${p.duration}s linear ${p.delay}s infinite`,
              }}
            />
          ))}
        </>
      )}

      {/* ================= 7. STORM ================= */}
      {effectType === 'storm' && (
        <>
          {/* Violet/Purple storm core glow */}
          <div className="absolute top-[15%] inset-x-0 h-72 bg-purple-600/25 blur-3xl pointer-events-none" />

          {/* Electric dual-stage lightning flashes */}
          <div
            className="absolute inset-0 bg-indigo-100/20 pointer-events-none"
            style={{ animation: 'lightning-flash 6.5s ease-in-out infinite' }}
          />
        </>
      )}

      {/* ================= 8. SNOW ================= */}
      {effectType === 'snow' && (
        <>
          {/* Crystalline frosty glow */}
          <div className="absolute top-[20%] right-[-5%] w-88 h-88 rounded-full bg-sky-300/20 blur-3xl pointer-events-none" />
          <div className="absolute top-[55%] left-[-10%] w-80 h-80 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />

          {/* 2-plane snowflakes: foreground bokeh + crisp flakes */}
          {snowParticles.map((p) => (
            <div
              key={p.id}
              className={`absolute top-[-25px] rounded-full pointer-events-none ${
                p.isBokeh
                  ? 'bg-white/40 blur-[1.5px] shadow-[0_0_10px_rgba(255,255,255,0.6)]'
                  : 'bg-white/95 blur-[0.2px] shadow-[0_0_6px_rgba(255,255,255,0.9)]'
              }`}
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animation: `snow-drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
              }}
            />
          ))}
        </>
      )}

      {/* ================= 9. FOG ================= */}
      {effectType === 'fog' && (
        <>
          <div className="absolute top-[15%] inset-x-0 h-40 bg-white/15 blur-2xl pointer-events-none" style={{ animation: 'fog-shift 8s ease-in-out infinite' }} />
          <div className="absolute top-[40%] inset-x-0 h-52 bg-white/10 blur-3xl pointer-events-none" style={{ animation: 'fog-shift 12s ease-in-out 2s infinite reverse' }} />
          <div className="absolute top-[65%] inset-x-0 h-48 bg-slate-200/10 blur-3xl pointer-events-none" style={{ animation: 'fog-shift 16s ease-in-out 4s infinite' }} />
        </>
      )}
    </div>
  );
}
