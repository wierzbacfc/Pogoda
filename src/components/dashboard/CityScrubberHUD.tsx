'use client';

import React from 'react';
import { City, WeatherResult } from '@/lib/types';
import { getCurrentHourIndex } from '@/lib/utils';
import { Navigation2 } from 'lucide-react';
import { WeatherIcon } from '@/components/ui/WeatherIcon';

interface CityScrubberHUDProps {
  isVisible: boolean;
  cities: City[];
  initialIndex: number;
  dragDeltaX: number;
  isDragging: boolean;
  weatherMap?: Map<string | number, WeatherResult>;
}

export const ITEM_WIDTH = 124; // Width of each city slot on the roller tape
export const CAPSULE_WIDTH = 320; // Width of the HUD capsule

export function CityScrubberHUD({
  isVisible,
  cities,
  initialIndex,
  dragDeltaX,
  isDragging,
  weatherMap,
}: CityScrubberHUDProps) {
  if (!isVisible || cities.length <= 1) return null;

  const centerPos = CAPSULE_WIDTH / 2;

  // Rubber-band resistance if dragging past ends
  const rawVirtualIndex = initialIndex - dragDeltaX / ITEM_WIDTH;
  let effectiveDeltaX = dragDeltaX;

  if (rawVirtualIndex < 0) {
    const overshoot = -rawVirtualIndex * ITEM_WIDTH;
    effectiveDeltaX = dragDeltaX - overshoot * 0.75;
  } else if (rawVirtualIndex > cities.length - 1) {
    const overshoot = (rawVirtualIndex - (cities.length - 1)) * ITEM_WIDTH;
    effectiveDeltaX = dragDeltaX + overshoot * 0.75;
  }

  // Calculate track translation
  // When item i is centered at centerPos:
  // trackX = centerPos - (i * ITEM_WIDTH + ITEM_WIDTH / 2)
  const trackX = centerPos - (initialIndex * ITEM_WIDTH + ITEM_WIDTH / 2) + effectiveDeltaX;
  const currentVirtualIndex = (centerPos - trackX - ITEM_WIDTH / 2) / ITEM_WIDTH;

  return (
    <div className="absolute bottom-[66px] left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
      {/* Outer Floating Glass Capsule with Left & Right Vignette */}
      <div
        className="relative overflow-hidden rounded-full bg-zinc-950/92 backdrop-blur-2xl border border-white/20 shadow-[0_16px_48px_rgba(0,0,0,0.85),0_0_24px_rgba(59,130,246,0.25)] h-[52px]"
        style={{ width: CAPSULE_WIDTH }}
      >
        {/* Fixed Center Target Reticle / Lens */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[38px] rounded-full border border-blue-400/40 bg-blue-500/15 shadow-[0_0_14px_rgba(59,130,246,0.3)] pointer-events-none z-10" />

        {/* Soft gradient masks on left & right edges to fade incoming/outgoing cities */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-950 via-zinc-950/80 to-transparent z-20 pointer-events-none" />

        {/* Continuous Fluid City Tape */}
        <div
          className="absolute top-0 bottom-0 flex items-center will-change-transform"
          style={{
            transform: `translate3d(${trackX}px, 0, 0)`,
            transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {cities.map((city, idx) => {
            const diff = Math.abs(currentVirtualIndex - idx);
            // Weight 1 at center, 0 at 1 item away
            const weight = Math.max(0, 1 - diff);
            const scale = 0.88 + 0.16 * weight;
            const opacity = 0.32 + 0.68 * weight;
            const isCenter = diff < 0.45;

            // Weather details for the city
            const weather = weatherMap?.get(city.id);
            const currentIdx = weather ? getCurrentHourIndex(weather.hourly.time, weather.timezone) : 0;
            const temp = weather ? Math.round(weather.hourly.temperature_2m[currentIdx]) : null;
            const code = weather ? weather.hourly.weathercode[currentIdx] : 0;
            const isDay = weather ? weather.hourly.is_day[currentIdx] === 1 : true;

            return (
              <div
                key={city.id}
                className="flex items-center justify-center gap-1.5 shrink-0 px-2 select-none"
                style={{
                  width: ITEM_WIDTH,
                  transform: `scale(${scale})`,
                  opacity,
                  transition: isDragging ? 'none' : 'transform 180ms ease-out, opacity 180ms ease-out',
                }}
              >
                {city.isGps ? (
                  <Navigation2
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      isCenter ? 'text-blue-400 fill-blue-400/40' : 'text-zinc-500'
                    }`}
                  />
                ) : weather ? (
                  <WeatherIcon code={code} isDay={isDay} size={18} glow={false} />
                ) : null}

                <span
                  className={`text-xs tracking-tight truncate max-w-[72px] transition-colors ${
                    isCenter ? 'text-white font-bold' : 'text-zinc-400 font-medium'
                  }`}
                >
                  {city.name}
                </span>

                {temp !== null && (
                  <span
                    className={`text-xs tabular-nums transition-colors ${
                      isCenter ? 'text-blue-300 font-semibold' : 'text-zinc-500 font-normal'
                    }`}
                  >
                    {temp}°
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Downward indicator notch pointing to the toolbar */}
      <div className="w-2.5 h-2.5 bg-zinc-950/90 border-r border-b border-white/20 rotate-45 -mt-1.5 shadow-sm" />
    </div>
  );
}
