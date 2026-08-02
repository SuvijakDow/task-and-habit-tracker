import React, { useState, useMemo } from 'react';
import { Calendar, RotateCcw } from 'lucide-react';
import { DailyHabit } from '@/types';
import { formatToDateString } from '@/utils/dateUtils';
import { timeToMinutes, getHabitTimeSlotsForDay } from '@/services/habitService';

interface HabitTimelineProps {
  habits: DailyHabit[];
  getHabitColor: (habitId: string) => string;
  onEditHabit?: (habit: DailyHabit) => void;
}

interface PositionedSlot {
  habit: DailyHabit;
  startTime: string;
  endTime: string;
  slotIndex: number;
  column: number;
  totalColumns: number;
}

const DAYS = [
  { index: 0, short: 'Sun', full: 'Sunday' },
  { index: 1, short: 'Mon', full: 'Monday' },
  { index: 2, short: 'Tue', full: 'Tuesday' },
  { index: 3, short: 'Wed', full: 'Wednesday' },
  { index: 4, short: 'Thu', full: 'Thursday' },
  { index: 5, short: 'Fri', full: 'Friday' },
  { index: 6, short: 'Sat', full: 'Saturday' },
];

export const HabitTimeline: React.FC<HabitTimelineProps> = ({
  habits,
  getHabitColor,
  onEditHabit,
}) => {
  const today = new Date();
  const todayDayOfWeek = today.getDay();
  const todayDateStr = formatToDateString(today);

  // State for currently selected day of week (defaults to today)
  const [selectedDay, setSelectedDay] = useState<number>(todayDayOfWeek);

  // Flatten all time slots scheduled for selected day across habits
  const selectedDaySlots = useMemo(() => {
    return habits.flatMap((h) => {
      const slots = getHabitTimeSlotsForDay(h, selectedDay);
      return slots.map((slot, slotIndex) => ({
        habit: h,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotIndex,
      }));
    });
  }, [habits, selectedDay]);

  // Sort slots by start time
  const sortedSlots = useMemo(() => {
    return [...selectedDaySlots].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
  }, [selectedDaySlots]);

  // Calculate time range (min and max hours with ±1 hour buffer)
  const timeRange = useMemo(() => {
    if (sortedSlots.length === 0) {
      return { startHour: 8, endHour: 18 };
    }

    const times = sortedSlots.flatMap((item) => [
      timeToMinutes(item.startTime),
      timeToMinutes(item.endTime),
    ]);

    const minMinutes = Math.min(...times);
    const maxMinutes = Math.max(...times);

    let startHour = Math.max(0, Math.floor((minMinutes - 60) / 60));
    let endHour = Math.min(24, Math.ceil((maxMinutes + 60) / 60));

    // Ensure at least 4 hours of display
    if (endHour - startHour < 4) {
      const midHour = Math.floor((startHour + endHour) / 2);
      startHour = Math.max(0, midHour - 2);
      endHour = Math.min(24, midHour + 2);
    }

    return { startHour, endHour };
  }, [sortedSlots]);

  // Calculate positions for overlapping slots
  const positionedSlots = useMemo(() => {
    const positioned: PositionedSlot[] = [];
    const columns: number[] = new Array(sortedSlots.length).fill(-1);

    // Assign the lowest available column
    for (let i = 0; i < sortedSlots.length; i++) {
      const slot = sortedSlots[i];
      const startMin = timeToMinutes(slot.startTime);
      const endMin = timeToMinutes(slot.endTime);
      
      const takenColumns = new Set<number>();
      for (let j = 0; j < i; j++) {
        const other = sortedSlots[j];
        const otherStart = timeToMinutes(other.startTime);
        const otherEnd = timeToMinutes(other.endTime);
        
        if (startMin < otherEnd && endMin > otherStart) {
          takenColumns.add(columns[j]);
        }
      }
      
      let col = 0;
      while (takenColumns.has(col)) {
        col++;
      }
      columns[i] = col;
    }

    // Calculate total columns required for each slot's group
    for (let i = 0; i < sortedSlots.length; i++) {
      const slot = sortedSlots[i];
      const startMin = timeToMinutes(slot.startTime);
      const endMin = timeToMinutes(slot.endTime);
      
      let maxColInGroup = columns[i];
      for (let j = 0; j < sortedSlots.length; j++) {
        const other = sortedSlots[j];
        const otherStart = timeToMinutes(other.startTime);
        const otherEnd = timeToMinutes(other.endTime);
        
        if (startMin < otherEnd && endMin > otherStart) {
          maxColInGroup = Math.max(maxColInGroup, columns[j]);
        }
      }
      
      positioned.push({
        ...slot,
        column: columns[i],
        totalColumns: maxColInGroup + 1,
      });
    }

    return positioned;
  }, [sortedSlots]);

  const getSlotPosition = (slot: PositionedSlot) => {
    const { startHour, endHour } = timeRange;
    const totalMinutes = (endHour - startHour) * 60;
    
    const startMin = timeToMinutes(slot.startTime);
    const endMin = timeToMinutes(slot.endTime);
    const startHourMin = startHour * 60;

    const topPercent = ((startMin - startHourMin) / totalMinutes) * 100;
    const heightPercent = ((endMin - startMin) / totalMinutes) * 100;
    const leftPercent = (slot.column / Math.max(slot.totalColumns, 1)) * 100;
    const widthPercent = 100 / Math.max(slot.totalColumns, 1);

    return { topPercent, heightPercent, leftPercent, widthPercent };
  };

  const selectedDayInfo = DAYS[selectedDay];
  const isViewingToday = selectedDay === todayDayOfWeek;

  return (
    <div className="mt-6 sm:mt-8 p-3.5 sm:p-6 rounded-3xl bg-slate-900/90 border border-purple-500/30 text-white shadow-xl">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-pink-400" />
          <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
            {isViewingToday ? "Today's Schedule" : `${selectedDayInfo.full}'s Schedule`}
          </h3>
          {!isViewingToday && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {selectedDayInfo.short}
            </span>
          )}
        </div>

        {!isViewingToday && (
          <button
            type="button"
            onClick={() => setSelectedDay(todayDayOfWeek)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/30 text-xs font-bold transition self-start sm:self-auto"
          >
            <RotateCcw className="w-3 h-3 text-pink-300" />
            <span>Today</span>
          </button>
        )}
      </div>

      {/* Responsive 7-Day Selector Tabs */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4 bg-slate-950/70 p-1.5 rounded-2xl border border-purple-500/20">
        {DAYS.map((day) => {
          const isSelected = day.index === selectedDay;
          const isToday = day.index === todayDayOfWeek;

          return (
            <button
              key={day.short}
              type="button"
              onClick={() => setSelectedDay(day.index)}
              className={`relative py-1.5 sm:py-2 px-0.5 rounded-xl text-center transition-all ${
                isSelected
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white font-extrabold shadow-md shadow-purple-500/40 scale-[1.02]'
                  : 'bg-slate-800/80 text-gray-300 hover:bg-slate-700/80 font-semibold border border-slate-700/60'
              }`}
            >
              <span className="block text-[11px] sm:text-xs leading-none">{day.short}</span>
              {isToday && (
                <span className={`block text-[9px] mt-0.5 font-bold uppercase tracking-wider ${isSelected ? 'text-amber-200' : 'text-purple-400'}`}>
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content: Empty State vs Timeline Grid */}
      {selectedDaySlots.length === 0 ? (
        <div className="py-10 text-center bg-slate-950/40 rounded-2xl border border-purple-500/10">
          <p className="text-xs sm:text-sm font-medium text-gray-400">
            No habits scheduled for {isViewingToday ? 'today' : selectedDayInfo.full}
          </p>
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <div className="flex min-w-full">
            {/* Time labels sidebar */}
            <div className="w-12 flex-shrink-0 pt-[1px]">
              {Array.from({ length: timeRange.endHour - timeRange.startHour }).map((_, i) => {
                const hour = timeRange.startHour + i;
                return (
                  <div
                    key={`label-${hour}`}
                    className="flex items-start justify-end pr-2 text-xs font-semibold text-gray-400 border-b border-slate-800"
                    style={{ height: '84px' }}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </div>
                );
              })}
            </div>

            {/* Timeline grid */}
            <div
              className="flex-grow relative bg-slate-950/80 rounded-2xl border border-purple-500/20 overflow-hidden"
              style={{ height: `${(timeRange.endHour - timeRange.startHour) * 84 + 2}px` }}
            >
              {/* Hour grid lines */}
              {Array.from({ length: timeRange.endHour - timeRange.startHour }).map((_, i) => {
                const hour = timeRange.startHour + i;
                return (
                  <div
                    key={`line-${hour}`}
                    className="absolute left-0 right-0 border-b border-slate-800/80"
                    style={{
                      top: `${(i / (timeRange.endHour - timeRange.startHour)) * 100}%`,
                      height: '84px',
                    }}
                  />
                );
              })}

              {/* Habit blocks */}
              {positionedSlots.map((item, idx) => {
                const habit = item.habit;
                const { topPercent, heightPercent, leftPercent, widthPercent } = getSlotPosition(item);
                const isCompleted = isViewingToday && habit.completedDates.includes(todayDateStr);
                const habitColor = getHabitColor(habit.id);
                const isHex = habitColor.startsWith('#');
                const sMin = timeToMinutes(item.startTime);
                const eMin = timeToMinutes(item.endTime);
                const durationMins = Math.max(1, eMin - sMin);

                return (
                  <div
                    key={`${habit.id}-${item.startTime}-${idx}`}
                    className={`absolute cursor-pointer transition-all hover:shadow-lg hover:z-30 ${
                      isCompleted ? 'opacity-60' : 'opacity-100'
                    }`}
                    style={{
                      top: `calc(${topPercent}% + 1px)`,
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      height: `calc(${heightPercent}% - 2px)`,
                      minHeight: '30px',
                    }}
                    onClick={() => {
                      if (onEditHabit) {
                        onEditHabit(habit);
                      }
                    }}
                    title={`${habit.title}\nTime: ${item.startTime} - ${item.endTime}\nClick to edit habit`}
                  >
                    <div
                      className={`w-full h-full rounded-xl px-3 py-1.5 flex ${
                        durationMins < 25 ? 'flex-row items-center justify-between' : 'flex-col justify-center'
                      } border-l-4 border-white/80 text-white shadow-md overflow-hidden ${
                        !isHex ? habitColor : ''
                      }`}
                      style={isHex ? { backgroundColor: habitColor } : undefined}
                    >
                      {durationMins < 25 ? (
                        <>
                          <span className="text-xs font-bold text-white truncate leading-none mr-2">
                            {habit.title}
                          </span>
                          <span className="text-[10px] font-semibold text-white/90 whitespace-nowrap leading-none flex-shrink-0">
                            {item.startTime} - {item.endTime}
                          </span>
                        </>
                      ) : (
                        <>
                          <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                            {habit.title}
                          </p>
                          <p className="text-[10px] sm:text-xs font-semibold text-white/90 truncate mt-0.5 leading-tight">
                            {item.startTime} - {item.endTime}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        <span className="text-purple-400">●</span>
        <span>Click a habit block to edit habit time</span>
      </div>
    </div>
  );
};
