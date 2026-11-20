import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDeadlineItem } from './calendarTypes';

export interface ActiveCalendarDrag {
  item: CalendarDeadlineItem;
  initialX: number;
  initialY: number;
}

export interface PendingCalendarDrop {
  item: CalendarDeadlineItem;
  targetDateKey: string;
  clientX: number;
  clientY: number;
}

const MOUSE_HOLD_DELAY_MS = 190;
const TOUCH_HOLD_DELAY_MS = 260;
const MOUSE_DRAG_DISTANCE_PX = 6;
const TOUCH_CANCEL_SCROLL_DISTANCE_PX = 10;

interface PendingPressState {
  item: CalendarDeadlineItem;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  timerId: number | null;
}

export const useCalendarDrag = (isModalOpen: boolean) => {
  const [activeDrag, setActiveDrag] = useState<ActiveCalendarDrag | null>(null);
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingCalendarDrop | null>(null);

  const ghostRef = useRef<HTMLDivElement | null>(null);
  const pendingPressRef = useRef<PendingPressState | null>(null);
  const activeDragRef = useRef<ActiveCalendarDrag | null>(null);
  const hoveredDateKeyRef = useRef<string | null>(null);
  const pointerPosRef = useRef({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);
  const suppressClickUntilRef = useRef<number>(0);

  const clearPendingPress = useCallback(() => {
    const pending = pendingPressRef.current;
    if (pending?.timerId !== null && pending?.timerId !== undefined) {
      window.clearTimeout(pending.timerId);
    }
    pendingPressRef.current = null;
  }, []);

  const updateGhostPosition = useCallback((x: number, y: number) => {
    pointerPosRef.current = { x, y };
    if (rafIdRef.current !== null) return;
    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (ghostRef.current) {
        const { x: px, y: py } = pointerPosRef.current;
        ghostRef.current.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      }
    });
  }, []);

  const detectDropDateKey = useCallback((x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y);
    const dropTarget = el?.closest<HTMLElement>('[data-calendar-drop-date]');
    return dropTarget?.dataset.calendarDropDate || null;
  }, []);

  const activateDrag = useCallback(
    (item: CalendarDeadlineItem, x: number, y: number, pointerType: string) => {
      clearPendingPress();
      setPendingDrop(null);
      const nextActive: ActiveCalendarDrag = { item, initialX: x, initialY: y };
      activeDragRef.current = nextActive;
      pointerPosRef.current = { x, y };
      setActiveDrag(nextActive);

      const initialHover = detectDropDateKey(x, y);
      hoveredDateKeyRef.current = initialHover;
      setHoveredDateKey(initialHover);

      if (pointerType === 'touch' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(14);
        } catch {
          // Ignore browsers blocking vibration
        }
      }
    },
    [clearPendingPress, detectDropDateKey]
  );

  const cancelDrag = useCallback(() => {
    clearPendingPress();
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    activeDragRef.current = null;
    hoveredDateKeyRef.current = null;
    setActiveDrag(null);
    setHoveredDateKey(null);
  }, [clearPendingPress]);

  const dismissPendingDrop = useCallback(() => {
    setPendingDrop(null);
  }, []);

  // Reset all drag states when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      cancelDrag();
      setPendingDrop(null);
    }
  }, [isModalOpen, cancelDrag]);

  // Attach global pointer & touch listeners only when modal is open
  useEffect(() => {
    if (!isModalOpen) return;

    const handlePointerMove = (e: PointerEvent) => {
      const pending = pendingPressRef.current;
      if (pending && e.pointerId === pending.pointerId) {
        pending.currentX = e.clientX;
        pending.currentY = e.clientY;
        const dx = e.clientX - pending.startX;
        const dy = e.clientY - pending.startY;
        const dist = Math.hypot(dx, dy);

        if (pending.pointerType === 'touch') {
          // If user starts scrolling before long-press completes, abort pending press
          if (dist > TOUCH_CANCEL_SCROLL_DISTANCE_PX) {
            clearPendingPress();
          }
        } else if (dist >= MOUSE_DRAG_DISTANCE_PX) {
          // On mouse/pen, dragging immediately activates smooth drag without waiting
          activateDrag(pending.item, e.clientX, e.clientY, pending.pointerType);
        }
        return;
      }

      if (!activeDragRef.current) return;

      updateGhostPosition(e.clientX, e.clientY);
      const nextDateKey = detectDropDateKey(e.clientX, e.clientY);
      if (nextDateKey !== hoveredDateKeyRef.current) {
        hoveredDateKeyRef.current = nextDateKey;
        setHoveredDateKey(nextDateKey);
      }
    };

    const finishPointerInteraction = (e: PointerEvent, isCancel: boolean) => {
      if (pendingPressRef.current && e.pointerId === pendingPressRef.current.pointerId) {
        clearPendingPress();
      }

      const currentActive = activeDragRef.current;
      if (!currentActive) return;

      suppressClickUntilRef.current = Date.now() + 220;

      const finalTargetDateKey = isCancel
        ? null
        : detectDropDateKey(e.clientX, e.clientY) || hoveredDateKeyRef.current;

      cancelDrag();

      if (!isCancel && finalTargetDateKey && finalTargetDateKey !== currentActive.item.dateKey) {
        setPendingDrop({
          item: currentActive.item,
          targetDateKey: finalTargetDateKey,
          clientX: e.clientX,
          clientY: e.clientY,
        });
      }
    };

    const handlePointerUp = (e: PointerEvent) => finishPointerInteraction(e, false);
    const handlePointerCancel = (e: PointerEvent) => finishPointerInteraction(e, true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeDragRef.current) {
          cancelDrag();
        } else {
          setPendingDrop(null);
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, activateDrag, cancelDrag, clearPendingPress, detectDropDateKey, updateGhostPosition]);

  // While actively dragging: lock text selection, cursor, and prevent touch scroll hijacking
  useEffect(() => {
    if (!activeDrag) return;

    const prevUserSelect = document.body.style.userSelect;
    const prevWebkitUserSelect = (document.body.style as any).webkitUserSelect;
    const prevCursor = document.body.style.cursor;

    document.body.style.userSelect = 'none';
    (document.body.style as any).webkitUserSelect = 'none';
    document.body.style.cursor = 'grabbing';

    const preventTouchScroll = (e: TouchEvent) => {
      e.preventDefault();
    };
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('touchmove', preventTouchScroll, { passive: false });
    window.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.body.style.userSelect = prevUserSelect;
      (document.body.style as any).webkitUserSelect = prevWebkitUserSelect;
      document.body.style.cursor = prevCursor;
      window.removeEventListener('touchmove', preventTouchScroll);
      window.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [activeDrag]);

  const startItemDrag = useCallback(
    (item: CalendarDeadlineItem, e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      // Do not hijack clicks on checkboxes, edit buttons, or links inside cards
      const targetEl = e.target as HTMLElement | null;
      if (targetEl?.closest('button, a, input, [data-no-calendar-drag="true"]')) {
        return;
      }

      clearPendingPress();
      const startX = e.clientX;
      const startY = e.clientY;
      const pointerType = e.pointerType;
      const delayMs = pointerType === 'touch' ? TOUCH_HOLD_DELAY_MS : MOUSE_HOLD_DELAY_MS;

      const timerId = window.setTimeout(() => {
        const latest = pendingPressRef.current;
        if (!latest || latest.pointerId !== e.pointerId) return;
        activateDrag(item, latest.currentX, latest.currentY, latest.pointerType);
      }, delayMs);

      pendingPressRef.current = {
        item,
        pointerId: e.pointerId,
        pointerType,
        startX,
        startY,
        currentX: startX,
        currentY: startY,
        timerId,
      };
    },
    [activateDrag, clearPendingPress]
  );

  const shouldSuppressClick = useCallback(() => {
    return Date.now() < suppressClickUntilRef.current;
  }, []);

  return {
    activeDrag,
    hoveredDateKey,
    pendingDrop,
    ghostRef,
    startItemDrag,
    dismissPendingDrop,
    shouldSuppressClick,
  };
};
