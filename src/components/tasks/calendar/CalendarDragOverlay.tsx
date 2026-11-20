import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { ArrowRight, CopyPlus, CornerDownRight, MoveRight, X } from 'lucide-react';
import { parseToDate } from '@/utils/dateUtils';
import { hexToRgba } from '@/utils/colorUtils';
import { ActiveCalendarDrag, PendingCalendarDrop } from './useCalendarDrag';

interface CalendarDragGhostProps {
  activeDrag: ActiveCalendarDrag | null;
  hoveredDateKey: string | null;
  ghostRef: React.RefObject<HTMLDivElement>;
}

export const CalendarDragGhost: React.FC<CalendarDragGhostProps> = ({
  activeDrag,
  hoveredDateKey,
  ghostRef,
}) => {
  if (!activeDrag) return null;

  const { item, initialX, initialY } = activeDrag;
  const isDifferentTarget = Boolean(hoveredDateKey && hoveredDateKey !== item.dateKey);
  const targetLabel =
    isDifferentTarget && hoveredDateKey
      ? format(parseToDate(hoveredDateKey), 'EEE, d MMM')
      : null;

  return createPortal(
    <div
      ref={ghostRef}
      style={{
        transform: `translate3d(${initialX}px, ${initialY}px, 0)`,
        willChange: 'transform',
      }}
      className="fixed left-0 top-0 z-[9999] pointer-events-none select-none"
    >
      <div className="-translate-x-1/2 -translate-y-[85%] rotate-[1.5deg] flex flex-col items-center gap-1.5">
        {/* Floating Task / Subtask Chip */}
        <div
          className="max-w-[210px] min-w-[130px] px-2.5 py-1.5 rounded-xl border-2 bg-white/95 backdrop-blur-md shadow-[0_18px_36px_rgba(59,7,100,0.34)] flex items-center gap-1.5"
          style={{
            borderColor: item.categoryColor,
            borderLeftWidth: '4px',
            borderLeftColor: item.categoryColor,
            backgroundColor: item.isCompleted ? '#ecfdf5' : '#ffffff',
          }}
        >
          {item.type === 'subtask' && (
            <CornerDownRight className="w-3 h-3 shrink-0 text-purple-600" />
          )}
          <span
            className="text-xs font-extrabold truncate"
            style={{ color: item.isCompleted ? '#065f46' : item.categoryTextColor }}
          >
            {item.title}
          </span>
        </div>

        {/* Live Drop Date Pill */}
        <div
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-md border backdrop-blur-md transition-colors ${
            targetLabel
              ? 'bg-gradient-to-r from-purple-700 to-pink-600 text-white border-pink-300/60'
              : 'bg-slate-900/80 text-slate-100 border-white/15'
          }`}
        >
          {targetLabel ? `Drop on ${targetLabel}` : 'Drag to another day'}
        </div>
      </div>
    </div>,
    document.body
  );
};

interface CalendarDropActionPopoverProps {
  pendingDrop: PendingCalendarDrop | null;
  onMove: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
}

export const CalendarDropActionPopover: React.FC<CalendarDropActionPopoverProps> = ({
  pendingDrop,
  onMove,
  onDuplicate,
  onCancel,
}) => {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!pendingDrop) return;
    const width = popoverRef.current?.offsetWidth || 248;
    const height = popoverRef.current?.offsetHeight || 136;
    const margin = 12;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = pendingDrop.clientX - width / 2;
    let top = pendingDrop.clientY + 14;

    // Flip above pointer if near bottom edge (e.g., last calendar row)
    if (top + height + margin > vh) {
      top = pendingDrop.clientY - height - 14;
    }

    left = Math.max(margin, Math.min(left, vw - width - margin));
    top = Math.max(margin, Math.min(top, vh - height - margin));

    setPosition({ left, top });
  }, [pendingDrop]);

  useEffect(() => {
    if (!pendingDrop) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingDrop, onCancel]);

  if (!pendingDrop) return null;

  const { item, targetDateKey } = pendingDrop;
  const fromLabel = format(parseToDate(item.dateKey), 'd MMM');
  const toLabel = format(parseToDate(targetDateKey), 'EEE, d MMM');

  return createPortal(
    <div
      className="fixed inset-0 z-[9997]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div
        ref={popoverRef}
        style={{ left: position.left, top: position.top }}
        className="modal-enter fixed z-[9998] w-[248px] rounded-2xl bg-white/98 backdrop-blur-md border-2 border-purple-300/90 shadow-[0_20px_48px_rgba(59,7,100,0.28)] p-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Task summary & Source -> Target date */}
        <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-purple-100">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: item.categoryColor }}
              />
              {item.type === 'subtask' && (
                <CornerDownRight className="w-3 h-3 shrink-0 text-purple-600" />
              )}
              <span className="text-xs font-extrabold text-gray-900 truncate" title={item.title}>
                {item.title}
              </span>
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 rounded-md px-1.5 py-0.5">
              <span>{fromLabel}</span>
              <ArrowRight className="w-2.5 h-2.5 text-pink-500" />
              <span className="text-pink-700">{toLabel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="h-6 w-6 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center shrink-0 transition"
            aria-label="Cancel drop"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Two crisp one-tap action buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onMove}
            className="flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white shadow-sm hover:shadow transition active:scale-[0.98]"
          >
            <MoveRight className="w-4 h-4 stroke-[2.4]" />
            <span className="text-xs font-extrabold leading-none">Move</span>
            <span className="text-[9px] font-medium text-purple-100 leading-none">Change date</span>
          </button>

          <button
            type="button"
            onClick={onDuplicate}
            className="flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl border-2 text-emerald-900 hover:brightness-[0.97] shadow-2xs transition active:scale-[0.98]"
            style={{
              backgroundColor: hexToRgba('#10b981', 0.14),
              borderColor: hexToRgba('#10b981', 0.55),
            }}
          >
            <CopyPlus className="w-4 h-4 stroke-[2.3] text-emerald-700" />
            <span className="text-xs font-extrabold leading-none text-emerald-900">Duplicate</span>
            <span className="text-[9px] font-semibold text-emerald-700 leading-none">Add (Copy)</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
