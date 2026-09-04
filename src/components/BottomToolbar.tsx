'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { City, WeatherResult } from '@/lib/types';
import { CityDots } from './dashboard/CityDots';
import { CityScrubberHUD } from './dashboard/CityScrubberHUD';

interface BottomToolbarProps {
  cities?: City[];
  weatherMap?: Map<string | number, WeatherResult>;
  cityCount?: number;
  activeCityIndex: number;
  onSelectCity: (index: number) => void;
  onOpenCities: () => void;
}

export function BottomToolbar({
  cities = [],
  weatherMap,
  cityCount,
  activeCityIndex,
  onSelectCity,
  onOpenCities,
}: BottomToolbarProps) {
  const count = cities.length > 0 ? cities.length : (cityCount || 1);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDeltaX, setDragDeltaX] = useState(0);
  const [scrubIndex, setScrubIndex] = useState(activeCityIndex);

  const dragStartXRef = useRef(0);
  const initialIndexRef = useRef(activeCityIndex);
  const scrubIndexRef = useRef(activeCityIndex);
  const hasMovedRef = useRef(false);
  const currentDeltaXRef = useRef(0);

  // Sync with prop when not scrubbing
  useEffect(() => {
    if (!isScrubbing) {
      setScrubIndex(activeCityIndex);
      scrubIndexRef.current = activeCityIndex;
      setDragDeltaX(0);
      currentDeltaXRef.current = 0;
    }
  }, [activeCityIndex, isScrubbing]);

  const ITEM_SLOT = 124; // matches ITEM_WIDTH in CityScrubberHUD

  // Touch handlers for fluid scrubbing across cities
  const handleTouchStart = (e: React.TouchEvent) => {
    if (count <= 1) return;
    const touch = e.touches[0];
    dragStartXRef.current = touch.clientX;
    initialIndexRef.current = activeCityIndex;
    scrubIndexRef.current = activeCityIndex;
    setScrubIndex(activeCityIndex);
    setDragDeltaX(0);
    currentDeltaXRef.current = 0;
    hasMovedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (count <= 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartXRef.current;

    if (!hasMovedRef.current) {
      if (Math.abs(deltaX) > 6) {
        hasMovedRef.current = true;
        setIsScrubbing(true);
        setIsDragging(true);
      } else {
        return;
      }
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    currentDeltaXRef.current = deltaX;
    setDragDeltaX(deltaX);

    // Calculate nearest city based on continuous pixel offset
    const nearestIndex = Math.max(
      0,
      Math.min(count - 1, Math.round(initialIndexRef.current - deltaX / ITEM_SLOT))
    );

    if (nearestIndex !== scrubIndexRef.current) {
      scrubIndexRef.current = nearestIndex;
      setScrubIndex(nearestIndex);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(10);
        } catch {
          // ignore
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (hasMovedRef.current && isScrubbing) {
      const finalIndex = scrubIndexRef.current;
      // Animate magnetic snap to the final city slot
      const snapDeltaX = (initialIndexRef.current - finalIndex) * ITEM_SLOT;
      setIsDragging(false);
      setDragDeltaX(snapDeltaX);

      setTimeout(() => {
        onSelectCity(finalIndex);
        setIsScrubbing(false);
        setDragDeltaX(0);
        currentDeltaXRef.current = 0;
      }, 200);
    } else {
      setIsScrubbing(false);
      setIsDragging(false);
      setDragDeltaX(0);
    }
    hasMovedRef.current = false;
  };

  // Pointer events for desktop testing and mouse drag
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || count <= 1) return;
    const startX = e.clientX;
    initialIndexRef.current = activeCityIndex;
    scrubIndexRef.current = activeCityIndex;
    setScrubIndex(activeCityIndex);
    setDragDeltaX(0);
    currentDeltaXRef.current = 0;
    let moved = false;

    const onPointerMove = (ev: PointerEvent) => {
      const deltaX = ev.clientX - startX;
      if (!moved) {
        if (Math.abs(deltaX) > 6) {
          moved = true;
          setIsScrubbing(true);
          setIsDragging(true);
        } else {
          return;
        }
      }

      currentDeltaXRef.current = deltaX;
      setDragDeltaX(deltaX);

      const nearestIndex = Math.max(
        0,
        Math.min(count - 1, Math.round(initialIndexRef.current - deltaX / ITEM_SLOT))
      );

      if (nearestIndex !== scrubIndexRef.current) {
        scrubIndexRef.current = nearestIndex;
        setScrubIndex(nearestIndex);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      if (moved) {
        const finalIndex = scrubIndexRef.current;
        const snapDeltaX = (initialIndexRef.current - finalIndex) * ITEM_SLOT;
        setIsDragging(false);
        setDragDeltaX(snapDeltaX);

        setTimeout(() => {
          onSelectCity(finalIndex);
          setIsScrubbing(false);
          setDragDeltaX(0);
          currentDeltaXRef.current = 0;
        }, 200);
      } else {
        setIsScrubbing(false);
        setIsDragging(false);
        setDragDeltaX(0);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div className="fixed bottom-3.5 left-1/2 -translate-x-1/2 w-[calc(100%-1.75rem)] max-w-[390px] z-40 pointer-events-auto select-none">
      {/* Dynamic Floating HUD: Variant B Fluid Roller popping up above the toolbar */}
      {cities.length > 1 && (
        <CityScrubberHUD
          isVisible={isScrubbing}
          cities={cities}
          initialIndex={initialIndexRef.current}
          dragDeltaX={dragDeltaX}
          isDragging={isDragging}
          weatherMap={weatherMap}
        />
      )}

      {/* Main Bottom Toolbar */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-full bg-zinc-950/85 backdrop-blur-2xl border transition-all duration-300 ${
          isScrubbing
            ? 'border-blue-400/50 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_24px_rgba(59,130,246,0.3)] ring-1 ring-blue-400/30'
            : 'border-white/15 shadow-[0_12px_36px_rgba(0,0,0,0.7),0_0_1px_rgba(255,255,255,0.2)]'
        }`}
      >
        {/* Left spacer for symmetry */}
        <div className="w-10 h-10 shrink-0" />

        {/* Center: City Pagination Dots & Touch Scrubbing Zone */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          className="flex-1 flex justify-center items-center py-1 cursor-ew-resize touch-pan-x"
          title="Przeciągnij w lewo lub w prawo, aby przewijać miasta"
        >
          <CityDots
            count={count}
            activeIndex={isScrubbing ? scrubIndex : activeCityIndex}
            onSelect={(idx) => {
              if (!hasMovedRef.current) {
                onSelectCity(idx);
              }
            }}
          />
        </div>

        {/* Right: Cities List Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenCities();
          }}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 border border-white/15 flex items-center justify-center text-white transition-all shrink-0 shadow-md"
          title="Lista miast"
          aria-label="Lista miast"
        >
          <Menu size={18} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

