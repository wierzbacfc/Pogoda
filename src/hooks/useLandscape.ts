'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLandscape() {
  const [isLandscape, setIsLandscape] = useState(false);

  const checkLandscape = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;

    // 1. Physical truth: If viewport height exceeds or equals width, device is definitely in portrait
    if (window.innerWidth <= window.innerHeight) {
      return false;
    }

    // 2. Viewport width > height is unambiguous landscape
    return true;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let exitTimer: NodeJS.Timeout | null = null;

    const update = () => {
      const nextLandscape = checkLandscape();
      if (nextLandscape) {
        if (exitTimer) {
          clearTimeout(exitTimer);
          exitTimer = null;
        }
        setIsLandscape(true);
      } else {
        // Debounce exiting landscape (120ms) to prevent accidental close on micro-tilts or sensor jitter
        if (!exitTimer) {
          exitTimer = setTimeout(() => {
            if (!checkLandscape()) {
              setIsLandscape(false);
            }
            exitTimer = null;
          }, 120);
        }
      }
    };

    // Initial check (immediate)
    setIsLandscape(checkLandscape());

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
