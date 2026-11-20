import { useEffect, useState, useMemo, useDeferredValue } from 'react';
import { CheckCircle2, ChevronDown, RefreshCw, Search, TrendingUp, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import {
  getUserDailyHabits,
  resetHabitData,
  updateHabitDateStatus,
  HabitDateStatus,
} from '@/services/habitService';
import { getUserHabitSets } from '@/services/habitSetService';
import { DailyHabit, HabitSet, getHabitSetIds } from '@/types';
import { ALL_WEEKDAYS } from '@/constants/defaults';
import { toLocalDate } from '@/utils/dateUtils';
import { calculateConsistency, calculateTotalCompletions } from '@/utils/habitStats';
import { HabitAnalyticsCard } from '@/components/analytics/HabitAnalyticsCard';
import { RoutineSelectorDropdown } from '@/components/habits/RoutineSelectorDropdown';
import { EditHabitHistoryModal } from '@/components/modals/EditHabitHistoryModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';

export function AnalyticsPage() {
  const { user } = useAuth();
  const { registerRefreshAnalytics } = useDataRefresh();
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [habitSets, setHabitSets] = useState<HabitSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetTargetHabit, setResetTargetHabit] = useState<DailyHabit | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [editingHistory, setEditingHistory] = useState<{
    habit: DailyHabit;
    dateString: string;
  } | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isHabitDropdownOpen, setIsHabitDropdownOpen] = useState(false);

  const handleResetConfirm = async () => {
    if (!resetTargetHabit) return;
    try {
      setIsResetting(true);
      await resetHabitData(resetTargetHabit.id);
      await loadAnalytics(false);
      showToast('Habit history reset successfully', 'success');
    } catch (err) {
      console.error('Error resetting habit:', err);
      showToast('Failed to reset habit history', 'error');
    } finally {
      setIsResetting(false);
      setResetTargetHabit(null);
    }
  };

  const handleSaveHistoryStatus = async (
    habitId: string,
    dateString: string,
    newStatus: HabitDateStatus,
    progressValue?: number
  ) => {
    try {
      await updateHabitDateStatus(habitId, dateString, newStatus, progressValue);
      await loadAnalytics(false);
      showToast('Habit history status updated', 'success');
    } catch (err) {
      console.error('Error updating habit date status:', err);
      showToast('Failed to update habit status', 'error');
      throw err;
    }
  };

  const loadAnalytics = async (showLoadingSpinner = true) => {
    if (!user) return;
    try {
      if (showLoadingSpinner) setLoading(true);
      setError(null);
      const [fetchedHabits, sets] = await Promise.all([
        getUserDailyHabits(user.uid),
        getUserHabitSets(user.uid),
      ]);
      setHabits(fetchedHabits.sort((a, b) => a.startTime.localeCompare(b.startTime)));
      setHabitSets(sets);

      if (sets.length > 0) {
        setSelectedSetId((prev) => {
          if (prev && sets.some((s) => s.id === prev)) return prev;
          const activeSet = sets.find((s) => s.isActive) || sets[0];
          return activeSet ? activeSet.id : '';
        });
      }
    } catch (loadError) {
      setError('Could not load analytics. Refresh and try again.');
      console.error('Error fetching habits:', loadError);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setError(null);
      setLoading(false);
      return;
    }
    loadAnalytics(true);
  }, [user]);

  useEffect(() => {
    if (!isHabitDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.custom-select-container')) {
        setIsHabitDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isHabitDropdownOpen]);

  useEffect(() => {
    registerRefreshAnalytics(() => {
      loadAnalytics(false);
    });
  }, [registerRefreshAnalytics]);

  const sortedHabitSets = useMemo(() => {
    return [...habitSets].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [habitSets]);

  const filteredHabits = useMemo(() => {
    const defaultSetId = habitSets[0]?.id;
    return habits.filter((h) => {
      const setIds = getHabitSetIds(h);
      if (setIds.length > 0) {
        return setIds.includes(selectedSetId);
      }
      return selectedSetId === defaultSetId;
    });
  }, [habits, selectedSetId, habitSets]);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const habitsToDisplay = useMemo(() => {
    const normalized = deferredSearchQuery.trim().toLowerCase();
    return filteredHabits.filter((h) => {
      const matchesHabit = selectedHabitId ? h.id === selectedHabitId : true;
      const matchesSearch = normalized === '' || h.title.toLowerCase().includes(normalized);
      return matchesHabit && matchesSearch;
    });
  }, [filteredHabits, selectedHabitId, deferredSearchQuery]);

  const totalCompletions = useMemo(() => {
    const rawTotal = filteredHabits.reduce(
      (acc, habit) =>
        acc +
        calculateTotalCompletions(
          habit.completedDates || [],
          habit.targetValue,
          habit.dailyProgress,
          habit.notScheduledDates
        ),
      0
    );
    return Number(rawTotal.toFixed(2));
  }, [filteredHabits]);

  const avgConsistency = useMemo(() => {
    if (filteredHabits.length === 0) return 0;
    const total = filteredHabits.reduce((acc, habit) => {
      const days = habit.scheduledDays || [...ALL_WEEKDAYS];
      const startDateObj = toLocalDate(habit.trackingStartDate || habit.createdAt) || new Date();
      return (
        acc +
        calculateConsistency(
          habit.completedDates || [],
          days,
          startDateObj,
          habit.targetValue,
          habit.dailyProgress,
          habit.notScheduledDates
        )
      );
    }, 0);
    return Math.round(total / filteredHabits.length);
  }, [filteredHabits]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Sign In</h2>
          <p className="text-gray-600">Sign in to view your analytics.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 pt-3 md:pt-4 pb-6 md:pb-12 space-y-5">
        <div className="h-28 rounded-3xl skeleton-shimmer border border-purple-200/60" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-52 rounded-2xl skeleton-shimmer border border-purple-100/80" />
          <div className="h-52 rounded-2xl skeleton-shimmer border border-purple-100/80" />
        </div>
      </div>
    );
  }

  if (error && habits.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 md:pt-6 pb-8 md:pb-12">
        <div className="glass-card p-8 md:p-12 text-center">
          <div className="flex justify-center mb-4">
            <TrendingUp className="h-12 w-12 text-rose-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Analytics unavailable</h3>
          <p className="text-gray-600 mb-5">{error}</p>
          <button
            type="button"
            onClick={() => loadAnalytics(true)}
            className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold hover:from-purple-700 hover:to-pink-600 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 md:pt-6 pb-8 md:pb-12">
        <div className="glass-card p-8 md:p-12 text-center">
          <div className="flex justify-center mb-4">
            <TrendingUp className="h-12 w-12 text-purple-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No habits yet</h3>
          <p className="text-gray-600">Create a habit first to see analytics!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 pt-3.5 sm:pt-4 md:pt-2 pb-6 md:pb-12">
      {/* Hero Dashboard Overview Banner */}
      <div className="glass-card p-4 sm:p-6 mb-5 sm:mb-6 bg-gradient-to-br from-[#3b0764] via-[#581c87] to-[#701a75] text-white rounded-3xl border border-pink-400/30 shadow-xl shadow-fuchsia-950/40 relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/25 backdrop-blur-md shadow-2xs">
              <TrendingUp className="w-5 h-5 text-amber-300" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Analytics & Insights
            </h1>
          </div>

          <div className="grid grid-cols-[0.8fr_1.4fr_1.1fr] gap-1 sm:gap-2 lg:gap-3 bg-white/10 backdrop-blur-md p-2.5 sm:p-3 xl:p-3.5 rounded-2xl border border-white/15 text-center w-full sm:flex-1 sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
            <div className="px-1.5 sm:px-3 py-0.5 min-w-0">
              <div className="text-[10px] sm:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">
                Habits
              </div>
              <div className="text-base sm:text-lg font-black text-white">{filteredHabits.length}</div>
            </div>
            <div className="px-2 sm:px-4 py-0.5 border-x border-white/15 min-w-0">
              <div className="text-[10px] sm:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">
                Completions
              </div>
              <div className="text-base sm:text-lg font-black text-amber-300 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-amber-300" />
                {totalCompletions}
              </div>
            </div>
            <div className="px-1.5 sm:px-3 py-0.5 min-w-0">
              <div className="text-[10px] sm:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">
                Consistency
              </div>
              <div className="text-base sm:text-lg font-black text-pink-300">{avgConsistency}%</div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Control Bar */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-2 sm:gap-3">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full">
          <RoutineSelectorDropdown
            habitSets={sortedHabitSets}
            selectedSetId={selectedSetId}
            onSelect={(id) => {
              setSelectedSetId(id);
              setSelectedHabitId(null);
            }}
            headerLabel="Select Routine"
          />

          {/* Habit Selector Dropdown */}
          <div className="relative custom-select-container flex-1 min-w-0 sm:max-w-xs">
            <button
              type="button"
              onClick={() => setIsHabitDropdownOpen(!isHabitDropdownOpen)}
              className="w-full flex items-center justify-between min-h-[38px] bg-white/90 backdrop-blur-md border border-purple-200 hover:border-purple-300 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-purple-900 shadow-xs transition-all font-semibold focus:outline-none"
            >
              <span className="truncate">
                {selectedHabitId
                  ? filteredHabits.find((h) => h.id === selectedHabitId)?.title
                  : 'All Habits'}
              </span>
              <ChevronDown
                className={`ml-1 h-3.5 w-3.5 text-purple-500 flex-shrink-0 transition-transform duration-200 ${
                  isHabitDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isHabitDropdownOpen && (
              <div className="absolute right-0 sm:left-0 top-full mt-1 z-[100] w-56 bg-white border border-purple-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1 modal-enter">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHabitId(null);
                    setIsHabitDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-all hover:bg-purple-50 font-semibold ${
                    !selectedHabitId ? 'text-purple-700 bg-purple-50/50' : 'text-gray-600'
                  }`}
                >
                  Show All Habits
                </button>
                {filteredHabits.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      setSelectedHabitId(h.id);
                      setSearchQuery('');
                      setIsHabitDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-all hover:bg-purple-50 flex items-center justify-between ${
                      selectedHabitId === h.id
                        ? 'text-purple-700 bg-purple-50/50 font-bold'
                        : 'text-gray-700'
                    }`}
                  >
                    <span className="truncate">{h.title}</span>
                    {selectedHabitId === h.id && (
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full">
          <input
            aria-label="Search habits"
            placeholder="Search habit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[38px] pr-8 bg-white/90 backdrop-blur-md border border-purple-200 rounded-xl text-xs sm:text-sm text-gray-700 placeholder:text-gray-400 shadow-xs focus:border-purple-300 focus:outline-none transition-all"
            style={{ paddingLeft: '2.2rem' }}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-600 pointer-events-none flex-shrink-0" />
          {(searchQuery || selectedHabitId) && (
            <button
              type="button"
              onClick={() => {
                setSelectedHabitId(null);
                setSearchQuery('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 text-xs font-bold p-1"
              title="Reset filters"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Detailed Habit Analytics Cards */}
      <div className="space-y-3 sm:space-y-4 md:space-y-6 list-stagger">
        {habitsToDisplay.length > 0 ? (
          habitsToDisplay.map((habit) => (
            <HabitAnalyticsCard
              key={habit.id}
              habit={habit}
              habits={habits}
              habitSets={habitSets}
              onRequestReset={setResetTargetHabit}
              isResetting={isResetting}
              onEditHistoryDate={(h, dateStr) => setEditingHistory({ habit: h, dateString: dateStr })}
            />
          ))
        ) : (
          <div className="glass-card p-8 text-center text-gray-500 rounded-2xl border border-purple-100 bg-white/90">
            <Search className="w-8 h-8 text-purple-300 mx-auto mb-2" />
            <p className="font-bold text-sm text-gray-700">No habits found matching your search</p>
          </div>
        )}
      </div>

      <EditHabitHistoryModal
        isOpen={editingHistory !== null}
        onClose={() => setEditingHistory(null)}
        habit={editingHistory?.habit || null}
        dateString={editingHistory?.dateString || null}
        onSave={handleSaveHistoryStatus}
      />

      <ConfirmDialog
        isOpen={Boolean(resetTargetHabit)}
        title="Reset Data?"
        description={
          <>
            Are you sure you want to reset all tracking data for "
            <strong>{resetTargetHabit?.title}</strong>"?
            <br />
            <br />
            Your streak and completions will become 0. This cannot be undone.
          </>
        }
        confirmLabel="Reset"
        loadingLabel="Resetting..."
        isLoading={isResetting}
        tone="danger"
        icon={<RefreshCw className="h-6 w-6 text-rose-600" />}
        onCancel={() => setResetTargetHabit(null)}
        onConfirm={handleResetConfirm}
      />
    </div>
  );
}
