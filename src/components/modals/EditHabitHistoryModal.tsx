import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, CalendarOff, XCircle, Sparkles, Calendar, Loader2 } from 'lucide-react';
import { DailyHabit } from '@/types';
import { HabitDateStatus } from '@/services/habitService';

interface EditHabitHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: DailyHabit | null;
  dateString: string | null; // Format: 'YYYY-MM-DD'
  onSave: (habitId: string, dateString: string, newStatus: HabitDateStatus, progressValue?: number) => Promise<void>;
}

export const EditHabitHistoryModal: React.FC<EditHabitHistoryModalProps> = ({
  isOpen,
  onClose,
  habit,
  dateString,
  onSave,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<HabitDateStatus>('completed');
  const [progressVal, setProgressVal] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!habit || !dateString) return;

    setSelectedStatus('completed');
    const target = habit.targetValue;
    const loggedVal = habit.dailyProgress?.[dateString];
    setProgressVal(target && target > 0 ? (loggedVal && loggedVal > 0 ? Math.min(target - 1, loggedVal) : 1) : 1);
  }, [habit, dateString, isOpen]);

  if (!isOpen || !habit || !dateString) return null;

  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
  const formattedDateTitle = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(habit.id, dateString, selectedStatus, selectedStatus === 'partial' ? progressVal : undefined);
      onClose();
    } catch (err) {
      console.error('Error saving date status:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const target = habit.targetValue;

  return createPortal(
    <div className="fixed inset-0 bg-gradient-to-b from-slate-950/40 via-purple-950/25 to-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4 overflow-y-auto">
      <div className="modal-enter w-full max-w-md max-h-[calc(100dvh-1rem)] sm:max-h-[88dvh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 via-pink-50/40 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                Edit Habit History
              </h3>
              <p className="text-[11px] sm:text-xs text-purple-700 font-semibold truncate">
                {formattedDateTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-8 h-8 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Options */}
        <div className="p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Select Status for this Day
          </p>

          {/* Option 1: Completed */}
          <button
            type="button"
            onClick={() => setSelectedStatus('completed')}
            className={`w-full p-3.5 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
              selectedStatus === 'completed'
                ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                : 'bg-white border-gray-200 hover:border-purple-200 hover:bg-purple-50/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                selectedStatus === 'completed' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-600'
              }`}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Completed</p>
                <p className="text-xs text-gray-500">Marked as fully completed on this date</p>
              </div>
            </div>
            {selectedStatus === 'completed' && (
              <span className="w-3 h-3 rounded-full bg-purple-600 shrink-0" />
            )}
          </button>

          {/* Option 2: Not Scheduled */}
          <button
            type="button"
            onClick={() => setSelectedStatus('not_scheduled')}
            className={`w-full p-3.5 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
              selectedStatus === 'not_scheduled'
                ? 'bg-slate-50 border-slate-500 ring-2 ring-slate-400/20 shadow-xs'
                : 'bg-white border-gray-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                selectedStatus === 'not_scheduled' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <CalendarOff className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Not Scheduled</p>
                <p className="text-xs text-gray-500">Day off or not scheduled</p>
              </div>
            </div>
            {selectedStatus === 'not_scheduled' && (
              <span className="w-3 h-3 rounded-full bg-slate-700 shrink-0" />
            )}
          </button>

          {/* Option 3: Missed */}
          <button
            type="button"
            onClick={() => setSelectedStatus('missed')}
            className={`w-full p-3.5 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
              selectedStatus === 'missed'
                ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-white border-gray-200 hover:border-rose-200 hover:bg-rose-50/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                selectedStatus === 'missed' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-600'
              }`}>
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Missed</p>
                <p className="text-xs text-gray-500">Scheduled day that was not completed</p>
              </div>
            </div>
            {selectedStatus === 'missed' && (
              <span className="w-3 h-3 rounded-full bg-rose-600 shrink-0" />
            )}
          </button>

          {/* Option 4: Partial Progress (only if quantitative habit) */}
          {target && target > 0 && (
            selectedStatus !== 'partial' ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus('partial');
                  if (progressVal <= 0 || progressVal >= target) {
                    setProgressVal(1);
                  }
                }}
                className="w-full p-3.5 rounded-xl border-2 transition-all text-left flex items-center justify-between bg-white border-gray-200 hover:border-amber-200 hover:bg-amber-50/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-100 text-amber-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Partial Progress</p>
                    <p className="text-xs text-gray-500">Logged partial progress for target goal</p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="w-full p-3.5 rounded-xl border-2 transition-all text-left bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-500 text-white">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Partial Progress</p>
                      <p className="text-xs text-gray-500">Logged partial progress for target goal</p>
                    </div>
                  </div>
                  <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                </div>

                <div className="mt-3 pt-3 border-t border-amber-200/80 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-amber-900 shrink-0">
                    Logged Value:
                  </span>
                  <div className="flex items-center gap-1.5 bg-amber-100/60 p-1 rounded-xl border border-amber-200/80">
                    <button
                      type="button"
                      onClick={() => setProgressVal((p) => Math.max(1, p - 1))}
                      disabled={progressVal <= 1}
                      className="w-7 h-7 rounded-lg bg-amber-200/90 text-amber-900 font-bold hover:bg-amber-300 disabled:opacity-40 flex items-center justify-center text-sm transition"
                    >
                      -
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={progressVal === 0 ? '' : progressVal}
                      placeholder="1"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        if (raw === '') {
                          setProgressVal(1);
                        } else {
                          const parsed = parseInt(raw, 10);
                          if (parsed >= target) {
                            setProgressVal(target);
                            setSelectedStatus('completed');
                          } else {
                            const val = Math.max(1, parsed);
                            setProgressVal(val);
                          }
                        }
                      }}
                      className="h-7 text-center text-xs font-black text-amber-900 bg-white rounded-md border border-amber-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 px-1 transition-all"
                      style={{ width: `${Math.max(2.5, String(progressVal).length + 1.5)}ch` }}
                    />
                    <span className="text-xs font-bold text-amber-900 whitespace-nowrap px-0.5">
                      / {target} {habit.targetUnit || ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = progressVal + 1;
                        if (nextVal >= target) {
                          setProgressVal(target);
                          setSelectedStatus('completed');
                        } else {
                          setProgressVal(nextVal);
                        }
                      }}
                      className="w-7 h-7 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold hover:from-amber-600 hover:to-amber-700 flex items-center justify-center text-sm transition shadow-2xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 bg-gray-50 border-t border-purple-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200/60 rounded-xl transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Status</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
