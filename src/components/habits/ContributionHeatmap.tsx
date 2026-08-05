import React, { useMemo, useEffect, useRef, useState } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, startOfDay, isBefore, isAfter, subWeeks, getYear } from 'date-fns';

interface ContributionHeatmapProps {
  startDate: Date;
  completedDates: string[];
  scheduledDays: number[]; // 0 for Sunday, 6 for Saturday
  targetValue?: number;
  targetUnit?: string;
  dailyProgress?: Record<string, number>;
}

export const ContributionHeatmap: React.FC<ContributionHeatmapProps> = React.memo(({
  startDate,
  completedDates,
  scheduledDays,
  targetValue,
  targetUnit,
  dailyProgress,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = startOfDay(new Date());
  const trackingStart = startOfDay(startDate);
  const currentYear = getYear(today);
  const startYear = getYear(trackingStart);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const availableYears = useMemo(() => {
    const years = [];
    for (let y = currentYear; y >= startYear; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear, startYear]);

  const weeks = useMemo(() => {
    let gridStart: Date;
    let gridEnd: Date;

    if (selectedYear === currentYear) {
      const yearStart = new Date(currentYear, 0, 1);
      const baseStart = isAfter(trackingStart, yearStart) ? trackingStart : yearStart;
      const minStart = subWeeks(today, 16);
      const actualStart = isBefore(baseStart, minStart) ? baseStart : minStart;

      gridStart = startOfWeek(actualStart, { weekStartsOn: 0 }); // 0 = Sunday
      gridEnd = endOfWeek(today, { weekStartsOn: 0 });
    } else {
      gridStart = startOfWeek(new Date(selectedYear, 0, 1), { weekStartsOn: 0 });
      gridEnd = endOfWeek(new Date(selectedYear, 11, 31), { weekStartsOn: 0 });
    }

    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const weeksArray: Date[][] = [];
    let currentWeek: Date[] = [];

    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    });

    return weeksArray;
  }, [startDate, selectedYear, currentYear, today, trackingStart]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [weeks]);

  return (
    <div className="w-full flex flex-col-reverse md:flex-row gap-4 md:gap-6">
      <div className="flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent"
        >
          <div className="flex flex-col min-w-max ml-auto">
            {/* Month Labels */}
            <div className="flex h-6 mb-1">
              <div className="w-7 sm:w-8 flex-shrink-0"></div>
              <div className="inline-flex gap-1">
                {weeks.map((week, i) => {
                  const midWeekDay = week[3];
                  const month = midWeekDay.getMonth();
                  const prevMonth = i > 0 ? weeks[i - 1][3].getMonth() : -1;

                  const isFirstWeekOfMonth = month !== prevMonth;
                  const hasSpace = i + 1 < weeks.length && weeks[i + 1][3].getMonth() === month;

                  const showLabel = isFirstWeekOfMonth && hasSpace;

                  return (
                    <div key={i} className="w-3 sm:w-3.5 relative">
                      {showLabel && (
                        <span className="absolute bottom-0 left-0 text-[10px] sm:text-xs text-slate-500 font-medium whitespace-nowrap">
                          {format(midWeekDay, 'MMM')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex">
              {/* Day of Week Labels */}
              <div className="w-7 sm:w-8 flex-shrink-0 flex flex-col gap-1 pr-2 text-[9px] sm:text-[10px] text-slate-400 font-medium">
                <span className="h-3 sm:h-3.5 leading-none flex items-center">Sun</span>
                <span className="h-3 sm:h-3.5 leading-none flex items-center opacity-0">Mon</span>
                <span className="h-3 sm:h-3.5 leading-none flex items-center">Tue</span>
                <span className="h-3 sm:h-3.5 leading-none flex items-center opacity-0">Wed</span>
                <span className="h-3 sm:h-3.5 leading-none flex items-center">Thu</span>
                <span className="h-3 sm:h-3.5 leading-none flex items-center opacity-0">Fri</span>
                <span className="h-3 sm:h-3.5 leading-none flex items-center">Sat</span>
              </div>

              {/* Heatmap Grid */}
              <div className="inline-flex gap-1">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day, dayIndex) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const isCompleted = completedDates.includes(dayStr);
                      const dayOfWeek = day.getDay();
                      const isScheduled = scheduledDays.includes(dayOfWeek);
                      const isFuture = selectedYear === currentYear && isAfter(day, today);
                      const isBeforeStart = isBefore(day, trackingStart);
                      const todayObj = startOfDay(new Date());
                      const isPast = isBefore(day, todayObj);

                      const loggedVal = dailyProgress?.[dayStr];
                      const hasPartialProgress = !isCompleted && targetValue !== undefined && targetValue > 0 && loggedVal !== undefined && loggedVal > 0 && loggedVal < targetValue;
                      const partialPercent = hasPartialProgress ? Math.round((loggedVal! / targetValue!) * 100) : 0;

                      let cellClass = "w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-sm transition-colors duration-200 ";
                      let title = format(day, 'MMM d, yyyy');

                      if (isFuture) {
                        cellClass += "opacity-0";
                      } else if (isCompleted) {
                        cellClass += "bg-gradient-to-tr from-purple-500 to-fuchsia-400 shadow-sm shadow-purple-500/20";
                        title += " (Completed)";
                      } else if (hasPartialProgress) {
                        cellClass += "bg-gradient-to-tr from-amber-400 to-purple-400 shadow-2xs border border-purple-300/60";
                        title += ` (Partial: ${loggedVal}/${targetValue} ${targetUnit || ''} - ${partialPercent}%)`;
                      } else if (isBeforeStart || !isScheduled) {
                        cellClass += "bg-transparent border border-dashed border-slate-300";
                        title += " (Not scheduled)";
                      } else if (isPast) {
                        cellClass += "bg-rose-50/80 border border-rose-200";
                        title += " (Missed)";
                      } else {
                        cellClass += "bg-slate-100 border border-slate-200";
                        title += " (Not yet done)";
                      }

                      return (
                        <div
                          key={dayIndex}
                          className={cellClass}
                          title={isFuture ? undefined : title}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-3 mt-3 text-[8.5px] min-[375px]:text-[9px] sm:text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] sm:rounded-sm bg-transparent border border-dashed border-slate-300"></div>
            <span className="whitespace-nowrap">Not Scheduled</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] sm:rounded-sm bg-slate-100 border border-slate-200"></div>
            <span className="whitespace-nowrap">Today</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] sm:rounded-sm bg-gradient-to-tr from-amber-400 to-purple-400 border border-purple-300/60"></div>
            <span className="whitespace-nowrap">Partial</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] sm:rounded-sm bg-rose-50/80 border border-rose-200"></div>
            <span className="whitespace-nowrap">Missed</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] sm:rounded-sm bg-gradient-to-tr from-purple-500 to-fuchsia-400 shadow-sm shadow-purple-500/20"></div>
            <span className="whitespace-nowrap">Completed</span>
          </div>
        </div>
      </div>

      {/* Year Selector */}
      {availableYears.length > 0 && (
        <div className="flex md:flex-col gap-2 overflow-x-auto md:w-20 flex-shrink-0 pb-2 md:pb-0 scrollbar-hide">
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${selectedYear === year
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20 md:-translate-x-1'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
