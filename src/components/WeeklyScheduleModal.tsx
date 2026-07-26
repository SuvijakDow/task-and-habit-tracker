import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarRange, Clock, Download } from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';
import { DailyHabit } from '@/types';
import { timeToMinutes, getHabitColorHex, hexToRgba } from '@/services/habitService';

interface WeeklyScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: DailyHabit[];
  onEditHabit?: (habit: DailyHabit) => void;
}

const DAYS_OF_WEEK = [
  { id: 1, short: 'MON', full: 'Monday', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { id: 2, short: 'TUE', full: 'Tuesday', color: 'text-pink-600 bg-pink-50 border-pink-200' },
  { id: 3, short: 'WED', full: 'Wednesday', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 4, short: 'THU', full: 'Thursday', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 5, short: 'FRI', full: 'Friday', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 6, short: 'SAT', full: 'Saturday', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 0, short: 'SUN', full: 'Sunday', color: 'text-red-600 bg-red-50 border-red-200' },
];

export const WeeklyScheduleModal: React.FC<WeeklyScheduleModalProps> = ({
  isOpen,
  onClose,
  habits,
  onEditHabit,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<'png' | 'svg' | null>(null);

  const handleExport = async (format: 'png' | 'svg') => {
    if (!gridRef.current) return;
    try {
      setIsExporting(format);
      const options = {
        backgroundColor: '#ffffff',
        cacheBust: true,
        pixelRatio: 2,
      };

      let dataUrl = '';
      if (format === 'png') {
        dataUrl = await toPng(gridRef.current, options);
      } else {
        dataUrl = await toSvg(gridRef.current, options);
      }

      const link = document.createElement('a');
      link.download = `weekly-habit-schedule.${format}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(`Error exporting as ${format}:`, err);
    } finally {
      setIsExporting(null);
    }
  };

  // Calculate dynamic hour range across all habits (default: 8 to 20)
  const { startHour, endHour } = useMemo(() => {
    if (habits.length === 0) return { startHour: 8, endHour: 20 };

    let minMin = 24 * 60;
    let maxMin = 0;

    habits.forEach((h) => {
      const s = timeToMinutes(h.startTime);
      const e = timeToMinutes(h.endTime);
      if (s < minMin) minMin = s;
      if (e > maxMin) maxMin = e;
    });

    let sHour = Math.max(0, Math.floor(minMin / 60) - 1);
    let eHour = Math.min(24, Math.ceil(maxMin / 60) + 1);

    // Keep grid at least 8 hours wide
    if (eHour - sHour < 8) {
      eHour = Math.min(24, sHour + 8);
      if (eHour === 24) sHour = Math.max(0, 24 - 8);
    }

    return { startHour: sHour, endHour: eHour };
  }, [habits]);

  const hoursList = useMemo(() => {
    const list: number[] = [];
    for (let h = startHour; h < endHour; h++) {
      list.push(h);
    }
    return list;
  }, [startHour, endHour]);

  const totalGridMinutes = (endHour - startHour) * 60;
  const startGridMinutes = startHour * 60;

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-gradient-to-b from-slate-950/40 via-purple-950/25 to-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4">
      <div className="modal-enter w-full max-w-[96vw] 2xl:max-w-[1500px] max-h-[92dvh] flex flex-col bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden">
        {/* Header */}
        <div className="flex flex-row items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-gray-100 bg-gradient-to-r from-purple-50 via-pink-50/50 to-white gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <CalendarRange className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs sm:text-xl font-bold text-gray-900 truncate leading-tight">
                Weekly Habit Schedule
              </h2>
              <p className="text-[9px] sm:text-xs text-gray-500 font-medium truncate">
                Combined weekly schedule for all habits
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1 sm:gap-2 flex-shrink-0">
            <button
              type="button"
              disabled={isExporting !== null || habits.length === 0}
              onClick={() => handleExport('png')}
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 active:bg-purple-200 disabled:opacity-50 transition shadow-xs whitespace-nowrap"
              title="Save timetable as PNG image"
            >
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{isExporting === 'png' ? 'Saving...' : 'PNG'}</span>
            </button>

            <button
              type="button"
              disabled={isExporting !== null || habits.length === 0}
              onClick={() => handleExport('svg')}
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-lg bg-pink-50 border border-pink-200 text-pink-700 hover:bg-pink-100 active:bg-pink-200 disabled:opacity-50 transition shadow-xs whitespace-nowrap"
              title="Save timetable as SVG vector"
            >
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{isExporting === 'svg' ? 'Saving...' : 'SVG'}</span>
            </button>

            <div className="h-4 w-px bg-gray-200 mx-0.5" />

            <button
              onClick={onClose}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition flex items-center justify-center flex-shrink-0"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Timetable Grid Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 bg-slate-50/50">
          {habits.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-gray-700">No habits added yet.</p>
              <p className="text-xs text-gray-400 mt-1">Add habits to see your weekly timetable grid.</p>
            </div>
          ) : (
            <div ref={gridRef} className="min-w-[1180px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-1">
              {/* Header Row: Day/Time + Hours */}
              <div className="grid grid-cols-[100px_1fr] border-b border-gray-200 bg-slate-100/80 sticky top-0 z-20">
                <div className="px-3 py-2.5 font-bold text-xs text-gray-600 border-r border-gray-200 flex items-center justify-center bg-slate-200/60">
                  Day/Time
                </div>

                <div className="grid" style={{ gridTemplateColumns: `repeat(${hoursList.length}, minmax(0, 1fr))` }}>
                  {hoursList.map((hour) => (
                    <div
                      key={hour}
                      className="py-2.5 pl-2 sm:pl-2.5 text-left font-bold text-xs sm:text-sm text-gray-700 border-r border-gray-200/80 last:border-r-0"
                    >
                      {hour}
                    </div>
                  ))}
                </div>
              </div>

              {/* Day Rows */}
              <div className="divide-y divide-gray-200">
                {DAYS_OF_WEEK.map((day) => {
                  // Find all habits scheduled for this day
                  const dayHabits = habits.filter((h) => h.scheduledDays.includes(day.id));

                  // Sort habits by start time
                  const sortedDayHabits = [...dayHabits].sort(
                    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
                  );

                  // Pre-calculate real start and end boundaries
                  const habitBounds = sortedDayHabits.map((h) => {
                    const s = timeToMinutes(h.startTime);
                    const e = timeToMinutes(h.endTime);
                    const realEnd = e > s ? e : s + 30;
                    return { s, realEnd };
                  });

                  // Calculate vertical layers using real time overlap
                  const layers: number[] = new Array(sortedDayHabits.length).fill(0);
                  for (let i = 0; i < sortedDayHabits.length; i++) {
                    const boundsI = habitBounds[i];
                    const takenLayers = new Set<number>();

                    for (let j = 0; j < i; j++) {
                      const boundsJ = habitBounds[j];
                      // Check if real time ranges overlap (startI < endJ && endI > startJ)
                      if (boundsI.s < boundsJ.realEnd && boundsI.realEnd > boundsJ.s) {
                        takenLayers.add(layers[j]);
                      }
                    }

                    let layer = 0;
                    while (takenLayers.has(layer)) layer++;
                    layers[i] = layer;
                  }

                  const maxLayer = layers.length > 0 ? Math.max(...layers) : 0;
                  const rowHeight = Math.max(48, (maxLayer + 1) * 44 + 6);

                  return (
                    <div
                      key={day.id}
                      className="grid grid-cols-[100px_1fr] relative hover:bg-slate-50/40 transition-colors"
                      style={{ minHeight: `${rowHeight}px` }}
                    >
                      {/* Left Day Title Label */}
                      <div
                        className={`px-2 py-2 border-r border-gray-200 font-bold text-xs sm:text-sm flex items-center justify-center ${day.color} border-l-4`}
                      >
                        <span>{day.short}</span>
                      </div>

                      {/* Hour Columns & Habit Blocks Area */}
                      <div className="relative w-full h-full">
                        {/* Background hour grid lines */}
                        <div
                          className="absolute inset-0 grid h-full pointer-events-none"
                          style={{ gridTemplateColumns: `repeat(${hoursList.length}, minmax(0, 1fr))` }}
                        >
                          {hoursList.map((hour) => (
                            <div key={hour} className="border-r border-gray-100 last:border-r-0 h-full" />
                          ))}
                        </div>

                        {/* Habit Blocks */}
                        <div className="relative w-full h-full p-1">
                          {sortedDayHabits.map((habit, idx) => {
                            const bounds = habitBounds[idx];
                            const durationMinutes = bounds.realEnd - bounds.s;

                            // Calculate horizontal position based on exact start & end time
                            const leftPct = Math.max(
                              0,
                              ((bounds.s - startGridMinutes) / totalGridMinutes) * 100
                            );
                            const realWidthPct = Math.min(
                              100 - leftPct,
                              (durationMinutes / totalGridMinutes) * 100
                            );
                            // Ensure a minimum 2.4% visual width so micro 10-min pills remain interactive & visible
                            const displayWidthPct = Math.max(realWidthPct, 2.4);

                            const colorHex = getHabitColorHex(habit, habits);
                            const layer = layers[idx];

                            return (
                              <div
                                key={habit.id}
                                onClick={() => {
                                  if (onEditHabit) {
                                    onEditHabit(habit);
                                  }
                                }}
                                title={`${habit.title}\nTime: ${habit.startTime} - ${habit.endTime}\nClick to edit habit`}
                                className="absolute rounded-xl border-2 px-2 py-0.5 shadow-xs hover:shadow-lg hover:scale-[1.02] hover:z-50 cursor-pointer transition-all flex flex-col justify-center overflow-hidden group"
                                style={{
                                  left: `calc(${leftPct}% + 1px)`,
                                  width: `calc(${displayWidthPct}% - 2px)`,
                                  top: `${3 + layer * 44}px`,
                                  height: '40px',
                                  backgroundColor: hexToRgba(colorHex, 0.25),
                                  borderColor: hexToRgba(colorHex, 0.8),
                                }}
                              >
                                {durationMinutes <= 30 ? (
                                  /* Short Block Layout (<= 30 mins): No text! Sleek centered indicator dot */
                                  <div className="flex items-center justify-center w-full h-full">
                                    <span
                                      className="w-3 h-3 rounded-full shadow-xs transition-transform group-hover:scale-125 border border-white/80"
                                      style={{ backgroundColor: colorHex }}
                                    />
                                  </div>
                                ) : (
                                  /* Normal Block Layout (> 30 mins): Title only on a single line */
                                  <div className="flex flex-col justify-center min-w-0 h-full">
                                    <p className="font-bold text-xs sm:text-sm text-gray-900 truncate whitespace-nowrap leading-tight">
                                      {habit.title}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar - Single Line */}
        <div className="px-3 sm:px-6 py-2.5 border-t border-gray-100 bg-white flex flex-row items-center justify-between gap-2 text-[11px] sm:text-xs text-gray-500 whitespace-nowrap">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
            <span>Total Habits: <strong className="text-gray-800">{habits.length}</strong></span>
          </div>
          <p className="text-gray-400 text-right truncate">Click any habit block to edit</p>
        </div>
      </div>
    </div>,
    document.body
  );
};
