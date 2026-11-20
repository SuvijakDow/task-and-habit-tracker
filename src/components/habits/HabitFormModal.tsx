import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Check, Clock, Layers, Palette, Pencil, Plus, Target, X } from 'lucide-react';
import { DailyHabit, HabitSet, TimeSlot, getHabitSetIds } from '@/types';
import { ALL_WEEKDAYS } from '@/constants/defaults';
import { PASTEL_HABIT_COLORS } from '@/constants/colors';
import { WEEKDAY_FULL_LABELS, WEEKDAY_SHORT_LABELS } from '@/constants/calendar';
import { getHabitColorHex } from '@/utils/colorUtils';
import { TimePickerInput } from '@/components/ui/TimePickerInput';

export interface HabitFormSubmitData {
  title: string;
  scheduledDays: number[];
  startTime: string;
  endTime: string;
  customSchedule?: Record<number, TimeSlot[]> | null;
  color: string;
  setIds: string[];
  targetValue?: number;
  targetUnit?: string;
}

interface HabitFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialHabit?: DailyHabit | null;
  allHabits: DailyHabit[];
  sortedHabitSets: HabitSet[];
  activeSetId: string;
  onClose: () => void;
  onSubmit: (data: HabitFormSubmitData) => Promise<void>;
}

const ORDERED_DAYS_MON_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;

export const HabitFormModal: React.FC<HabitFormModalProps> = ({
  isOpen,
  mode,
  initialHabit,
  allHabits,
  sortedHabitSets,
  activeSetId,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [scheduledDays, setScheduledDays] = useState<number[]>([...ALL_WEEKDAYS]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isAdvancedSchedule, setIsAdvancedSchedule] = useState(false);
  const [customSchedule, setCustomSchedule] = useState<Record<number, TimeSlot[]>>({});
  const [habitColor, setHabitColor] = useState<string>(PASTEL_HABIT_COLORS[0]);
  const [habitSetIds, setHabitSetIds] = useState<string[]>([]);
  const [routineSearchQuery, setRoutineSearchQuery] = useState('');
  const [targetValue, setTargetValue] = useState<number | undefined>(undefined);
  const [targetUnit, setTargetUnit] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setRoutineSearchQuery('');
    setIsSubmitting(false);

    if (mode === 'edit' && initialHabit) {
      setTitle(initialHabit.title);
      setScheduledDays(initialHabit.scheduledDays || [...ALL_WEEKDAYS]);
      setStartTime(initialHabit.startTime || '09:00');
      setEndTime(initialHabit.endTime || '10:00');
      setHabitColor(getHabitColorHex(initialHabit, allHabits));
      const currentSetIds = getHabitSetIds(initialHabit);
      setHabitSetIds(currentSetIds.length > 0 ? currentSetIds : activeSetId ? [activeSetId] : []);
      setTargetValue(initialHabit.targetValue);
      setTargetUnit(initialHabit.targetUnit);

      const hasCustom =
        initialHabit.customSchedule && Object.keys(initialHabit.customSchedule).length > 0;
      setIsAdvancedSchedule(Boolean(hasCustom));
      setCustomSchedule(
        initialHabit.customSchedule ? JSON.parse(JSON.stringify(initialHabit.customSchedule)) : {}
      );
    } else {
      setTitle('');
      setScheduledDays([...ALL_WEEKDAYS]);
      setStartTime('09:00');
      setEndTime('10:00');
      setIsAdvancedSchedule(false);
      setCustomSchedule({});
      setHabitColor(PASTEL_HABIT_COLORS[0]);
      setHabitSetIds(activeSetId ? [activeSetId] : []);
      setTargetValue(undefined);
      setTargetUnit(undefined);
    }
  }, [isOpen, mode, initialHabit, allHabits, activeSetId]);

  if (!isOpen) return null;

  const isEdit = mode === 'edit';

  const addSlot = (dayIndex: number) => {
    const existing =
      customSchedule[dayIndex] && customSchedule[dayIndex].length > 0
        ? customSchedule[dayIndex]
        : [{ startTime, endTime }];
    const lastSlot = existing[existing.length - 1];
    const nextStart = lastSlot ? lastSlot.endTime : startTime;
    let nextEnd = '21:00';
    if (nextStart >= nextEnd) {
      const [h, m] = nextStart.split(':').map(Number);
      const endH = Math.min(23, (h + 1) % 24);
      nextEnd = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    setCustomSchedule((prev) => ({
      ...prev,
      [dayIndex]: [...existing, { startTime: nextStart, endTime: nextEnd }],
    }));
  };

  const updateSlot = (
    dayIndex: number,
    slotIndex: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setCustomSchedule((prev) => {
      const currentSlots =
        prev[dayIndex] && prev[dayIndex].length > 0 ? prev[dayIndex] : [{ startTime, endTime }];
      const daySlots = [...currentSlots];
      if (slotIndex >= 0 && slotIndex < daySlots.length) {
        daySlots[slotIndex] = { ...daySlots[slotIndex], [field]: value };
      }
      return { ...prev, [dayIndex]: daySlots };
    });
  };

  const removeSlot = (dayIndex: number, slotIndex: number) => {
    setCustomSchedule((prev) => {
      const currentSlots =
        prev[dayIndex] && prev[dayIndex].length > 0 ? prev[dayIndex] : [{ startTime, endTime }];
      return { ...prev, [dayIndex]: currentSlots.filter((_, idx) => idx !== slotIndex) };
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Habit name is required');
      return;
    }

    if (!isAdvancedSchedule && endTime <= startTime) {
      setError('End time must be after start time');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const targetSetIds = habitSetIds.length > 0 ? habitSetIds : activeSetId ? [activeSetId] : [];
      let scheduleToSave: Record<number, TimeSlot[]> | null = null;

      if (isAdvancedSchedule) {
        const finalSchedule: Record<number, TimeSlot[]> = {};
        for (const dayId of scheduledDays) {
          finalSchedule[dayId] =
            customSchedule[dayId] && customSchedule[dayId].length > 0
              ? customSchedule[dayId]
              : [{ startTime, endTime }];
        }
        if (Object.keys(finalSchedule).length > 0) {
          scheduleToSave = finalSchedule;
        }
      }

      await onSubmit({
        title: title.trim(),
        scheduledDays,
        startTime,
        endTime,
        customSchedule: scheduleToSave,
        color: habitColor,
        setIds: targetSetIds,
        targetValue: targetValue && targetValue > 0 ? targetValue : undefined,
        targetUnit: targetUnit?.trim() || undefined,
      });
    } catch (err) {
      setError(isEdit ? 'Failed to save habit. Please try again.' : 'Failed to add habit. Please try again.');
      console.error(isEdit ? 'Error saving habit:' : 'Error adding habit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 bg-slate-950/65 flex items-end sm:items-center justify-center ${
        isEdit ? 'z-[10000]' : 'z-[9999]'
      } p-0 sm:p-4`}
    >
      <div className="modal-enter w-full sm:max-w-lg h-dvh sm:h-[85vh] max-h-dvh sm:max-h-[750px] flex flex-col bg-white border border-purple-100/80 rounded-none sm:rounded-3xl shadow-[0_24px_56px_rgba(120,87,255,0.28)] overflow-hidden">
        <form onSubmit={handleFormSubmit} className="flex flex-col h-full min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-purple-100/80 bg-purple-50/50 shrink-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              {isEdit ? (
                <>
                  <Pencil className="w-5 h-5 text-purple-600" />
                  Edit Habit
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-purple-600" />
                  Add New Habit
                </>
              )}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white transition flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                {error}
              </div>
            )}

            {/* Habit Title */}
            <div>
              <label htmlFor="habit-form-title" className="block text-xs font-semibold text-gray-700 mb-1">
                Habit Name *
              </label>
              <input
                id="habit-form-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Morning Exercise, Read 30 mins"
                className="w-full min-h-[42px] rounded-xl border border-purple-200 bg-white px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                disabled={isSubmitting}
                autoFocus={!isEdit}
              />
            </div>

            {/* Routines (Multi-Select) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5 shrink-0">
                  <Layers className="w-4 h-4 text-purple-700" />
                  Routines (Presets)
                </label>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setHabitSetIds(sortedHabitSets.map((s) => s.id))}
                    className="text-purple-700 hover:text-purple-900 hover:underline transition"
                  >
                    All
                  </button>
                  <span className="text-purple-300">•</span>
                  <button
                    type="button"
                    onClick={() => setHabitSetIds(activeSetId ? [activeSetId] : [])}
                    className="text-purple-700 hover:text-purple-900 hover:underline transition"
                  >
                    Active Only
                  </button>
                  <span className="text-purple-300">•</span>
                  <span className="text-purple-600 font-bold">
                    {habitSetIds.length > 0 ? `${habitSetIds.length} selected` : '1 selected'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-medium text-gray-500">
                Select routines this habit belongs to (can select multiple)
              </p>

              {sortedHabitSets.length > 6 && (
                <input
                  type="text"
                  value={routineSearchQuery}
                  onChange={(e) => setRoutineSearchQuery(e.target.value)}
                  placeholder="Search routines..."
                  className="w-full min-h-[30px] px-2.5 py-1 bg-white border border-purple-200/90 rounded-lg text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
              )}

              <div className="max-h-32 overflow-y-auto overscroll-contain touch-pan-y p-1.5 bg-white/80 rounded-xl border border-purple-200/80 flex flex-wrap gap-1.5">
                {sortedHabitSets
                  .filter((s) => s.name.toLowerCase().includes(routineSearchQuery.toLowerCase()))
                  .map((s) => {
                    const isChecked =
                      habitSetIds.length > 0 ? habitSetIds.includes(s.id) : s.id === activeSetId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setHabitSetIds((prev) => {
                            const effective = prev.length === 0 ? [activeSetId] : prev;
                            if (effective.includes(s.id)) {
                              const next = effective.filter((id) => id !== s.id);
                              return next.length > 0 ? next : [activeSetId];
                            }
                            return [...effective, s.id];
                          });
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                          isChecked
                            ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 text-white border-transparent shadow-2xs scale-[1.01]'
                            : 'bg-white text-gray-700 border-purple-200 hover:border-purple-300'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${isChecked ? 'bg-white' : ''}`}
                          style={{ backgroundColor: isChecked ? undefined : s.color || '#A78BFA' }}
                        />
                        <span className="truncate max-w-[120px]">{s.name}</span>
                        {isChecked && <Check className="w-3 h-3 text-white shrink-0 ml-0.5" />}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Schedule Section */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-700" />
                  Schedule
                </label>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setScheduledDays([...ALL_WEEKDAYS])}
                    className="text-purple-700 hover:text-purple-900 hover:underline transition"
                  >
                    All Days
                  </button>
                  <span className="text-purple-300">•</span>
                  <button
                    type="button"
                    onClick={() => setScheduledDays([1, 2, 3, 4, 5])}
                    className="text-purple-700 hover:text-purple-900 hover:underline transition"
                  >
                    Weekdays
                  </button>
                  <span className="text-purple-300">•</span>
                  <button
                    type="button"
                    onClick={() => setScheduledDays([])}
                    className="text-gray-500 hover:text-rose-600 hover:underline transition"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {WEEKDAY_SHORT_LABELS.map((day, index) => (
                  <label key={day} className="cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduledDays.includes(index)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setScheduledDays((prev) => [...prev, index].sort((a, b) => a - b));
                        } else {
                          setScheduledDays((prev) => prev.filter((d) => d !== index));
                        }
                      }}
                      className="peer sr-only"
                    />
                    <span className="flex min-h-[32px] sm:min-h-[38px] items-center justify-center rounded-xl border border-purple-200/90 bg-white text-[10px] sm:text-xs font-medium text-purple-900 shadow-2xs transition-all hover:bg-purple-50/80 hover:border-purple-300 peer-checked:border-transparent peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-500 peer-checked:bg-purple-600 peer-checked:text-white peer-checked:font-bold peer-checked:shadow-md">
                      {day}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Time & Schedule Section */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-700" />
                    Time & Slots
                  </span>
                  <p className="text-[11px] text-gray-500 font-medium">Single or per-day custom times</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isAdvancedSchedule;
                    setIsAdvancedSchedule(next);
                    if (next && Object.keys(customSchedule).length === 0) {
                      const initSchedule: Record<number, TimeSlot[]> = {};
                      scheduledDays.forEach((dayId) => {
                        initSchedule[dayId] = [{ startTime, endTime }];
                      });
                      setCustomSchedule(initSchedule);
                    }
                  }}
                  className={`px-2 py-1 sm:px-2.5 rounded-lg text-[11px] font-extrabold transition-all border ${
                    isAdvancedSchedule
                      ? 'bg-purple-600 text-white border-transparent shadow-xs'
                      : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  {isAdvancedSchedule ? (
                    <>
                      <span className="hidden sm:inline">✓ Custom Per-Day</span>
                      <span className="sm:hidden">✓ Custom</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">+ Custom Per-Day</span>
                      <span className="sm:hidden">+ Custom</span>
                    </>
                  )}
                </button>
              </div>

              {!isAdvancedSchedule ? (
                <div className="grid grid-cols-2 gap-3 pt-0.5">
                  <TimePickerInput
                    value={startTime}
                    onChange={setStartTime}
                    label="Start Time"
                    popoverPosition="top"
                    align="left"
                    required
                    disabled={isSubmitting}
                  />
                  <TimePickerInput
                    value={endTime}
                    onChange={setEndTime}
                    label="End Time"
                    popoverPosition="top"
                    align="right"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {scheduledDays.length === 0 ? (
                    <p className="text-xs text-amber-700 font-medium bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      Please select at least one day in Schedule above to add custom times.
                    </p>
                  ) : (
                    ORDERED_DAYS_MON_FIRST.filter((dayId) => scheduledDays.includes(dayId)).map(
                      (dayId) => {
                        const daySlots =
                          customSchedule[dayId] && customSchedule[dayId].length > 0
                            ? customSchedule[dayId]
                            : [{ startTime, endTime }];

                        return (
                          <div
                            key={dayId}
                            className="p-3 rounded-xl bg-white border border-purple-200/80 space-y-2 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-purple-900">
                                {WEEKDAY_FULL_LABELS[dayId]}
                              </span>
                              <button
                                type="button"
                                onClick={() => addSlot(dayId)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800 transition"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Slot
                              </button>
                            </div>

                            <div className="space-y-2">
                              {daySlots.map((slot, sIdx) => (
                                <div key={sIdx} className="flex items-center gap-2">
                                  <div className="flex-1 grid grid-cols-2 gap-2">
                                    <TimePickerInput
                                      value={slot.startTime}
                                      onChange={(val) => updateSlot(dayId, sIdx, 'startTime', val)}
                                      label={`Start ${sIdx > 0 ? `#${sIdx + 1}` : ''}`}
                                      popoverPosition="top"
                                      align="left"
                                    />
                                    <TimePickerInput
                                      value={slot.endTime}
                                      onChange={(val) => updateSlot(dayId, sIdx, 'endTime', val)}
                                      label={`End ${sIdx > 0 ? `#${sIdx + 1}` : ''}`}
                                      popoverPosition="top"
                                      align="right"
                                    />
                                  </div>
                                  {daySlots.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeSlot(dayId, sIdx)}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 mt-4"
                                      title="Remove time slot"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    )
                  )}
                </div>
              )}
            </div>

            {/* Color Selection */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-2">
              <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-purple-700" />
                Habit Color
              </label>
              <div className="grid grid-cols-9 gap-1 sm:gap-2.5 justify-items-center pt-0.5">
                {PASTEL_HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setHabitColor(c)}
                    className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
                      habitColor === c
                        ? 'border-purple-600 scale-110 shadow-md ring-2 ring-purple-400/40'
                        : 'border-white/80 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Select color ${c}`}
                    disabled={isSubmitting}
                  >
                    {habitColor === c && (
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white drop-shadow-xs" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Goal (Optional) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5 shrink-0">
                  <Target className="w-4 h-4 text-purple-700" />
                  Quantitative Target Goal <span className="font-normal text-purple-600">(Optional)</span>
                </label>
                <span className="text-[11px] font-medium text-purple-600 truncate text-right">
                  e.g. 5 videos, 10 pages
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Target Value
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetValue ?? ''}
                    onChange={(e) =>
                      setTargetValue(e.target.value ? Math.max(1, parseInt(e.target.value, 10)) : undefined)
                    }
                    placeholder="e.g. 5"
                    className="w-full min-h-[38px] rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-gray-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Unit</label>
                  <input
                    type="text"
                    value={targetUnit ?? ''}
                    onChange={(e) => setTargetUnit(e.target.value)}
                    placeholder="e.g. videos, pages"
                    className="w-full min-h-[38px] rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-gray-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-4 sm:p-5 bg-purple-50/50 border-t border-purple-100/80 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/2 min-h-[42px] px-4 py-2.5 rounded-xl border border-purple-200 bg-white text-xs sm:text-sm font-semibold text-purple-700 hover:bg-purple-50 transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-1/2 min-h-[42px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs sm:text-sm font-semibold hover:from-purple-700 hover:to-pink-600 transition shadow-md shadow-purple-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (isEdit ? 'Saving...' : 'Creating...') : isEdit ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
