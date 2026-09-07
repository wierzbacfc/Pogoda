'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLandscape() {
  const [isLandscape, setIsLandscape] = useState(false);

  const checkLandscape = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;

    // 1. Primary check: Viewport width vs height (unambiguous physical landscape)
    const isWidthGreater = window.innerWidth > window.innerHeight;

    // 2. CSS Media Query (matches standard browser landscape rendering)
    try {
      const mql = window.matchMedia('(orientation: landscape)');
      if (mql.matches) return true;
    } catch (_) {}

    // 3. Screen orientation API (modern mobile browsers)
    const screenOrientation = window.screen?.orientation;
    if (screenOrientation) {
      if (typeof screenOrientation.angle === 'number') {
        const absAngle = Math.abs(screenOrientation.angle);
        if (absAngle === 90 || absAngle === 270) return true;
      }
      if (screenOrientation.type && screenOrientation.type.startsWith('landscape')) {
        return true;
      }
    }

    // 4. Deprecated window.orientation for older iOS / Android WebKit
    if (typeof (window as any).orientation === 'number') {
      const winAngle = Math.abs((window as any).orientation);
      if (winAngle === 90 || winAngle === 270) return true;
    }

    return isWidthGreater;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      setIsLandscape(checkLandscape());
    };

    // Initial check
    update();

    // Delayed checks to compensate for mobile browser rendering and resize debouncing
    const handleRotation = () => {
      update();
      const t1 = setTimeout(update, 60);
      const t2 = setTimeout(update, 200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    };

    // Event listeners
    window.addEventListener('resize', handleRotation);
    window.addEventListener('orientationchange', handleRotation);

    const screenOrientation = window.screen?.orientation;
    if (screenOrientation && screenOrientation.addEventListener) {
      screenOrientation.addEventListener('change', handleRotation);
    }

    let mql: MediaQueryList | null = null;
    try {
      mql = window.matchMedia('(orientation: landscape)');
      if (mql.addEventListener) {
        mql.addEventListener('change', handleRotation);
      } else if ((mql as any).addListener) {
        (mql as any).addListener(handleRotation);
      }
    } catch (_) {}

    return () => {
      window.removeEventListener('resize', handleRotation);
      window.removeEventListener('orientationchange', handleRotation);
      if (screenOrientation && screenOrientation.removeEventListener) {
        screenOrientation.removeEventListener('change', handleRotation);
      }
      if (mql) {
        if (mql.removeEventListener) {
          mql.removeEventListener('change', handleRotation);
        } else if ((mql as any).removeListener) {
          (mql as any).removeListener(handleRotation);
        }
      }
    };
  }, [checkLandscape]);

  return isLandscape;
}
