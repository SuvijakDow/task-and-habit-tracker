import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_SHORT_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

interface CalendarMonthYearPickerProps {
  isOpen: boolean;
  anchorEl: HTMLElement | null;
  currentDate: Date;
  today: Date;
  activeYearMonths?: Set<string>; // 'YYYY-MM' keys that have tasks/subtasks
  onSelectMonthYear: (year: number, monthIndex: number) => void;
  onJumpToday: () => void;
  onClose: () => void;
}

export const CalendarMonthYearPicker: React.FC<CalendarMonthYearPickerProps> = ({
  isOpen,
  anchorEl,
  currentDate,
  today,
  activeYearMonths,
  onSelectMonthYear,
  onJumpToday,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [viewYear, setViewYear] = useState(() => currentDate.getFullYear());
  const [pickingYearGrid, setPickingYearGrid] = useState(false);
  const [yearRangeStart, setYearRangeStart] = useState(
    () => Math.floor(currentDate.getFullYear() / 12) * 12
  );
  const [position, setPosition] = useState<{ left: number; top: number }>({ left: 12, top: 64 });

  useEffect(() => {
    if (!isOpen) return;
    const yr = currentDate.getFullYear();
    setViewYear(yr);
    setPickingYearGrid(false);
    setYearRangeStart(yr - 4);
  }, [isOpen, currentDate]);

  useLayoutEffect(() => {
    if (!isOpen || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const width = popoverRef.current?.offsetWidth || 276;
    const height = popoverRef.current?.offsetHeight || 256;
    const margin = 10;

    let left = rect.left + rect.width / 2 - width / 2;
    let top = rect.bottom + 8;

    if (top + height + margin > window.innerHeight) {
      top = Math.max(margin, rect.top - height - 8);
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    setPosition({ left, top });
  }, [isOpen, anchorEl, pickingYearGrid]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const yearGrid = useMemo(
    () => Array.from({ length: 12 }, (_, idx) => yearRangeStart + idx),
    [yearRangeStart]
  );

  if (!isOpen) return null;

  const activeMonthIndex = currentDate.getMonth();
  const activeYear = currentDate.getFullYear();
  const todayYear = today.getFullYear();
  const todayMonthIndex = today.getMonth();

  return createPortal(
    <div
      className="fixed inset-0 z-[9996]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={popoverRef}
        style={{ left: position.left, top: position.top }}
        className="modal-enter fixed z-[9997] w-[276px] rounded-2xl bg-white/98 backdrop-blur-md border-2 border-purple-300/90 shadow-[0_22px_50px_rgba(59,7,100,0.32)] p-3 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Year Bar */}
        <div className="flex items-center justify-between gap-1.5 mb-2.5 pb-2 border-b border-purple-100">
          <button
            type="button"
            data-sound="switch"
            onClick={() => {
              if (pickingYearGrid) setYearRangeStart((prev) => prev - 12);
              else setViewYear((prev) => prev - 1);
            }}
            className="h-7 w-7 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 flex items-center justify-center transition"
            title={pickingYearGrid ? 'Previous 12 years' : 'Previous year'}
            aria-label={pickingYearGrid ? 'Previous 12 years' : 'Previous year'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            data-sound="switch"
            onClick={() => {
              if (!pickingYearGrid) {
                setYearRangeStart(viewYear - 4);
              }
              setPickingYearGrid((prev) => !prev);
            }}
            className="flex-1 h-7 px-2.5 rounded-lg text-xs font-extrabold text-purple-950 bg-purple-50/70 hover:bg-purple-100 border border-purple-200/80 transition flex items-center justify-center gap-1"
            title={pickingYearGrid ? 'Back to months' : 'Choose year'}
          >
            {pickingYearGrid
              ? `${yearGrid[0]} – ${yearGrid[yearGrid.length - 1]}`
              : `${viewYear}`}
          </button>

          <button
            type="button"
            data-sound="switch"
            onClick={() => {
              if (pickingYearGrid) setYearRangeStart((prev) => prev + 12);
              else setViewYear((prev) => prev + 1);
            }}
            className="h-7 w-7 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 flex items-center justify-center transition"
            title={pickingYearGrid ? 'Next 12 years' : 'Next year'}
            aria-label={pickingYearGrid ? 'Next 12 years' : 'Next year'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Month Grid OR 12-Year Grid */}
        {pickingYearGrid ? (
          <div className="grid grid-cols-3 gap-1.5">
            {yearGrid.map((yr) => {
              const isSelectedYear = yr === viewYear;
              const isCurrentRealYear = yr === todayYear;
              const hasTasksInYear = activeYearMonths
                ? Array.from(activeYearMonths).some((ym) => ym.startsWith(`${yr}-`))
                : false;

              return (
                <button
                  key={yr}
                  type="button"
                  data-sound="switch"
                  onClick={() => {
                    setViewYear(yr);
                    setPickingYearGrid(false);
                  }}
                  className={`relative h-9 rounded-xl text-xs font-extrabold border transition flex items-center justify-center ${
                    isSelectedYear
                      ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white border-purple-600 shadow-xs'
                      : isCurrentRealYear
                      ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                      : 'bg-white text-gray-800 border-purple-100 hover:border-purple-300 hover:bg-purple-50/70'
                  }`}
                >
                  <span>{yr}</span>
                  {hasTasksInYear && (
                    <span
                      className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                        isSelectedYear ? 'bg-amber-300' : 'bg-pink-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_SHORT_LABELS.map((label, monthIdx) => {
              const isSelected = viewYear === activeYear && monthIdx === activeMonthIndex;
              const isCurrentRealMonth = viewYear === todayYear && monthIdx === todayMonthIndex;
              const ymKey = `${viewYear}-${String(monthIdx + 1).padStart(2, '0')}`;
              const hasTasks = activeYearMonths?.has(ymKey) ?? false;

              return (
                <button
                  key={label}
                  type="button"
                  data-sound="switch"
                  onClick={() => {
                    onSelectMonthYear(viewYear, monthIdx);
                    onClose();
                  }}
                  className={`relative h-9 rounded-xl text-xs font-extrabold border transition flex items-center justify-center ${
                    isSelected
                      ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white border-purple-600 shadow-xs'
                      : isCurrentRealMonth
                      ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                      : 'bg-white text-gray-800 border-purple-100 hover:border-purple-300 hover:bg-purple-50/70'
                  }`}
                >
                  <span>{label}</span>
                  {hasTasks && (
                    <span
                      className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-amber-300' : 'bg-pink-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Footer Quick Jump */}
        <div className="mt-2.5 pt-2 border-t border-purple-100 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 inline-block" />
            Has deadlines
          </span>
          <button
            type="button"
            onClick={() => {
              onJumpToday();
              onClose();
            }}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300/80 transition"
          >
            This Month
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
