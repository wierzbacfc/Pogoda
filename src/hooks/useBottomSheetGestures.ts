'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseBottomSheetGesturesOptions {
  isOpen: boolean;
  onClose: () => void;
  modalId: string;
  threshold?: number; // px required to dismiss, default 75
}

export function useBottomSheetGestures({
  isOpen,
  onClose,
  modalId,
  threshold = 75,
}: UseBottomSheetGesturesOptions) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const startTimeRef = useRef(0);
  const currentOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const closedByPopStateRef = useRef(false);

  // 1. System Back Button Handling (popstate)
  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      setIsDragging(false);
      setIsClosing(false);
      currentOffsetRef.current = 0;
      isDraggingRef.current = false;
      return;
    }

    closedByPopStateRef.current = false;
    const stateToken = `sheet_${modalId}_${Date.now()}`;

    // Push entry to history so system Back button triggers popstate
    try {
      window.history.pushState({ modalId, stateToken }, '');
    } catch {
      // Ignore if history state is not supported
    }

    const handlePopState = () => {
      closedByPopStateRef.current = true;
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // If closed by UI action (not popstate), pop the history entry cleanly
      try {
        if (!closedByPopStateRef.current && window.history.state?.stateToken === stateToken) {
          window.history.back();
        }
      } catch {
        // Ignore errors
      }
    };
  }, [isOpen, onClose, modalId]);

  // 2. Touch / Drag Gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    startXRef.current = touch.clientX;
    startTimeRef.current = Date.now();
    currentOffsetRef.current = 0;

    // Check if touch is inside a scrollable container that is already scrolled down
    const target = e.target as HTMLElement;
    const scrollable = target.closest<HTMLElement>('.overflow-y-auto, [data-scrollable="true"]');
    scrollContainerRef.current = scrollable;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaY = touch.clientY - startYRef.current;
    const deltaX = touch.clientX - startXRef.current;

    // If scrolling inside a container that's scrolled down, let native scroll handle it
    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop > 0) {
      return;
    }

    // Only initiate drag if predominantly vertical movement downwards
    if (!isDraggingRef.current) {
      if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
        if (deltaY > 0) {
          isDraggingRef.current = true;
          setIsDragging(true);
        }
      } else {
        return;
      }
    }

    if (isDraggingRef.current) {
      if (e.cancelable) {
        e.preventDefault();
      }

      if (deltaY >= 0) {
        // Direct tracking when dragging downwards
        currentOffsetRef.current = deltaY;
        setDragOffset(deltaY);
      } else {
        // Elastic resistance when dragging upwards
        const resisted = deltaY * 0.15;
        currentOffsetRef.current = resisted;
        setDragOffset(resisted);
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current) return;

    const deltaY = currentOffsetRef.current;
    const elapsed = Math.max(1, Date.now() - startTimeRef.current);
    const velocity = deltaY / elapsed;

    isDraggingRef.current = false;
    setIsDragging(false);

    // If dragged past threshold OR flicked downwards with velocity
    if (deltaY > threshold || (velocity > 0.35 && deltaY > 25)) {
      setIsClosing(true);
      setDragOffset(window.innerHeight);
      setTimeout(() => {
        onClose();
      }, 220);
    } else {
      // Spring back to 0
      setDragOffset(0);
      currentOffsetRef.current = 0;
    }
  }, [threshold, onClose]);

  // Pointer events for mouse / preview drag support on the drag handle
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only left click
    if (e.button !== 0) return;
    startYRef.current = e.clientY;
    startXRef.current = e.clientX;
    startTimeRef.current = Date.now();
    currentOffsetRef.current = 0;
    isDraggingRef.current = true;
    setIsDragging(true);

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dY = ev.clientY - startYRef.current;
      if (dY >= 0) {
        currentOffsetRef.current = dY;
        setDragOffset(dY);
      } else {
        currentOffsetRef.current = dY * 0.15;
        setDragOffset(dY * 0.15);
      }
    };

    const onPointerUp = () => {
      if (!isDraggingRef.current) return;
      const dY = currentOffsetRef.current;
      const elapsed = Math.max(1, Date.now() - startTimeRef.current);
      const vel = dY / elapsed;

      isDraggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      if (dY > threshold || (vel > 0.35 && dY > 25)) {
        setIsClosing(true);
        setDragOffset(window.innerHeight);
        setTimeout(() => {
          onClose();
        }, 220);
      } else {
        setDragOffset(0);
        currentOffsetRef.current = 0;
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [threshold, onClose]);

  // Derived styling for sheet container
  const sheetStyle: React.CSSProperties = {
    transform: isClosing
      ? `translateY(100%)`
      : dragOffset !== 0
      ? `translateY(${Math.max(0, dragOffset)}px)`
      : undefined,
    transition: isDragging ? 'none' : 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    touchAction: 'pan-y',
  };

  // Derived backdrop opacity based on drag
  const backdropOpacity = isDragging && dragOffset > 0
    ? Math.max(0, 1 - dragOffset / 350)
    : 1;

  return {
    dragOffset,
    isDragging,
    isClosing,
    sheetStyle,
    backdropOpacity,
    dragHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    handlePointerDown,
  };
}
