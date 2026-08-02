import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Award, Calendar, CheckCircle2, ChevronDown, Clock, Flame, Layers, Minus, RefreshCw, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDataRefresh } from '@/context/DataRefreshContext';
import { getUserDailyHabits, getUserHabitSets, calculateStreak, calculateConsistency, calculateTotalCompletions, getPast7DaysStatus, getDayAbbreviation, resetHabitData, getHabitColorHex } from '@/services/habitService';
import { DailyHabit, HabitSet, getHabitSetIds } from '@/types';
import { ContributionHeatmap } from '@/components/habits/ContributionHeatmap';
import { showToast } from '@/components/ui/Toast';

const parseDateSafely = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') return val.toDate();
  if (typeof val.seconds === 'number') return new Date(val.seconds * 1000);
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

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
  // Selection/search state to avoid long scrolling — user can pick a habit to view
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRoutineDropdownOpen, setIsRoutineDropdownOpen] = useState(false);

  const handleResetConfirm = async () => {
    if (!resetTargetHabit) return;
    try {
      setIsResetting(true);
      await resetHabitData(resetTargetHabit.id);
      await loadAnalytics(); // Reload after reset
      showToast('Habit history reset successfully', 'success');
    } catch (err) {
      console.error('Error resetting habit:', err);
      showToast('Failed to reset habit history', 'error');
    } finally {
      setIsResetting(false);
      setResetTargetHabit(null);
    }
  };

  const loadAnalytics = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const [fetchedHabits, sets] = await Promise.all([
        getUserDailyHabits(user.uid),
        getUserHabitSets(user.uid),
      ]);
      const sortedHabits = fetchedHabits.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setHabits(sortedHabits);
      setHabitSets(sets);

      const activeSet = sets.find((s) => s.isActive) || sets[0];
      if (activeSet) {
        setSelectedSetId(activeSet.id);
      }
    } catch (loadError) {
      setError('Could not load analytics. Refresh and try again.');
      console.error('Error fetching habits:', loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setError(null);
      setLoading(false);
      return;
    }

    loadAnalytics();
  }, [user]);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.custom-select-container')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isDropdownOpen]);

  // Register analytics refresh function with DataRefreshContext
  useEffect(() => {
    registerRefreshAnalytics(() => {
      loadAnalytics();
    });
  }, [registerRefreshAnalytics]);

  useEffect(() => {
    if (!isRoutineDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.analytics-routine-dropdown-container')) {
        setIsRoutineDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isRoutineDropdownOpen]);

  const sortedHabitSets = useMemo(() => {
    return [...habitSets].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [habitSets]);

  const selectedSet = useMemo(() => {
    return habitSets.find((s) => s.id === selectedSetId) || habitSets[0];
  }, [habitSets, selectedSetId]);

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

  const habitsToDisplay = useMemo(() => {
    return filteredHabits.filter((h) => {
      const matchesHabit = selectedHabitId ? h.id === selectedHabitId : true;
      const matchesSearch = searchQuery.trim() === '' || h.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchesHabit && matchesSearch;
    });
  }, [filteredHabits, selectedHabitId, searchQuery]);

  const totalCompletions = useMemo(() => {
    const rawTotal = filteredHabits.reduce((acc, habit) => {
      const completedSet = new Set(habit.completedDates || []);
      const progressKeys = Object.keys(habit.dailyProgress || {});
      const allDates = new Set([...Array.from(completedSet), ...progressKeys]);

      let habitRatioSum = 0;
      allDates.forEach((dateStr) => {
        if (completedSet.has(dateStr)) {
          habitRatioSum += 1.0;
        } else if (habit.targetValue && habit.targetValue > 0) {
          const logged = habit.dailyProgress?.[dateStr] || 0;
          habitRatioSum += Math.min(1.0, logged / habit.targetValue);
        }
      });
      return acc + habitRatioSum;
    }, 0);

    return Number(rawTotal.toFixed(2));
  }, [filteredHabits]);

  const avgConsistency = useMemo(() => {
    if (filteredHabits.length === 0) return 0;
    const total = filteredHabits.reduce((acc, habit) => {
      const days = (habit as any).scheduledDays || [0, 1, 2, 3, 4, 5, 6];
      const startDateObj = parseDateSafely(habit.trackingStartDate || habit.createdAt);
      return acc + calculateConsistency(habit.completedDates || [], days, startDateObj, habit.targetValue, habit.dailyProgress);
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
      <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-3 md:pt-6 pb-6 md:pb-12">
        <div className="glass-card p-5 sm:p-8 md:p-12 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading your analytics...</p>
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
            onClick={loadAnalytics}
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
          <p className="text-gray-600">
            Create a habit first to see analytics!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 pt-3.5 sm:pt-4 md:pt-2 pb-28 md:pb-12">
      {/* Hero Dashboard Overview Banner */}
      <div className="hero-banner-compact glass-card p-4 sm:p-6 mb-5 sm:mb-6 bg-gradient-to-br from-[#3b0764] via-[#581c87] to-[#701a75] text-white rounded-3xl border border-pink-400/30 shadow-xl shadow-fuchsia-950/40 relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/25 backdrop-blur-md shadow-2xs">
                  <TrendingUp className="w-5 h-5 text-amber-300" />
                </div>
                <h1 className="hero-banner-title text-xl sm:text-2xl font-black text-white tracking-tight">
                  Analytics & Insights
                </h1>
              </div>
            </div>

            <div className="hero-banner-stats grid grid-cols-[0.8fr_1.4fr_1.1fr] gap-1 sm:gap-2 lg:gap-3 bg-white/10 backdrop-blur-md p-2.5 sm:p-3 xl:p-3.5 rounded-2xl border border-white/15 text-center w-full sm:flex-1 sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
              <div className="px-1.5 sm:px-3 py-0.5 min-w-0">
                <div className="text-[10px] sm:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">Habits</div>
                <div className="text-base sm:text-lg font-black text-white">{filteredHabits.length}</div>
              </div>
              <div className="px-2 sm:px-4 py-0.5 border-x border-white/15 min-w-0">
                <div className="text-[10px] sm:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">Completions</div>
                <div className="text-base sm:text-lg font-black text-amber-300 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  {totalCompletions}
                </div>
              </div>
              <div className="px-1.5 sm:px-3 py-0.5 min-w-0">
                <div className="text-[10px] sm:text-xs text-purple-200 uppercase font-bold tracking-wider whitespace-nowrap">Consistency</div>
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

      {/* Ultra-Compact Control Bar */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-2 sm:gap-3">
        {/* Row 1: Routine Selector & Habit Selector */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full">
          {/* Custom Routine Dropdown (Identical to HabitsPage) */}
          <div className="relative analytics-routine-dropdown-container flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setIsRoutineDropdownOpen(!isRoutineDropdownOpen)}
              className="w-full flex items-center justify-between min-h-[38px] bg-white/90 backdrop-blur-md border border-purple-200 hover:border-purple-300 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm text-gray-900 shadow-xs hover:shadow-sm transition-all font-semibold focus:outline-none"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Layers className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                <span className="text-gray-500 font-normal hidden sm:inline">Routine:</span>
                <div className="flex items-center gap-1 truncate">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedSet?.color || '#C084FC' }}
                  />
                  <span className="font-bold text-gray-900 truncate">{selectedSet?.name || ''}</span>
                  {selectedSet?.isActive && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded-full font-bold hidden md:inline-block">
                      Active
                    </span>
                  )}
                </div>
              </div>
              <ChevronDown className={`ml-1 h-3.5 w-3.5 text-purple-500 flex-shrink-0 transition-transform duration-200 ${isRoutineDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isRoutineDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 z-[100] w-64 bg-white border-2 border-purple-300 rounded-xl shadow-[0_16px_36px_rgba(120,87,255,0.35)] py-1 modal-enter">
                <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Select Routine
                </div>
                {sortedHabitSets.map((set) => {
                  const isSelected = set.id === selectedSetId;
                  return (
                    <button
                      key={set.id}
                      type="button"
                      onClick={() => {
                        setSelectedSetId(set.id);
                        setSelectedHabitId(null);
                        setIsRoutineDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs sm:text-sm transition-all hover:bg-purple-50 flex items-center justify-between ${
                        isSelected ? 'bg-purple-50 text-purple-900 font-bold' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: set.color || '#C084FC' }}
                        />
                        <span className="truncate">{set.name}</span>
                      </div>
                      {set.isActive && (
                        <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Habit Selector Dropdown */}
          <div className="relative custom-select-container flex-1 min-w-0 sm:max-w-xs">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between min-h-[38px] bg-white/90 backdrop-blur-md border border-purple-200 hover:border-purple-300 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-purple-900 shadow-xs transition-all font-semibold focus:outline-none"
            >
              <span className="truncate">
                {selectedHabitId ? filteredHabits.find((h) => h.id === selectedHabitId)?.title : 'All Habits'}
              </span>
              <ChevronDown className={`ml-1 h-3.5 w-3.5 text-purple-500 flex-shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 sm:left-0 top-full mt-1 z-[100] w-56 bg-white border border-purple-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1 modal-enter">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHabitId(null);
                    setIsDropdownOpen(false);
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
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-all hover:bg-purple-50 flex items-center justify-between ${
                      selectedHabitId === h.id ? 'text-purple-700 bg-purple-50/50 font-bold' : 'text-gray-700'
                    }`}
                  >
                    <span className="truncate">{h.title}</span>
                    {selectedHabitId === h.id && <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Search Input on its own line below */}
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
                setResetTargetHabit={setResetTargetHabit}
                isResetting={isResetting}
              />
            ))
          ) : (
            <div className="glass-card p-8 text-center text-gray-500 rounded-2xl border border-purple-100 bg-white/90">
              <Search className="w-8 h-8 text-purple-300 mx-auto mb-2" />
              <p className="font-bold text-sm text-gray-700">No habits found matching your search</p>
            </div>
          )}
        </div>

        {/* Reset Confirmation Modal */}
        {resetTargetHabit &&
          createPortal(
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
              <div className="glass-card p-5 sm:p-6 max-w-sm w-full bg-white shadow-2xl rounded-2xl border border-rose-100">
                <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="h-6 w-6 text-rose-600" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 text-center">Reset Data?</h3>
                <p className="text-gray-700 text-sm text-center mb-6">
                  Are you sure you want to reset all tracking data for "<strong>{resetTargetHabit.title}</strong>"?<br/><br/>Your streak and completions will become 0. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setResetTargetHabit(null)}
                    disabled={isResetting}
                    className="flex-1 px-3 py-2.5 text-sm sm:text-base text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 font-semibold rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetConfirm}
                    disabled={isResetting}
                    className="flex-1 px-3 py-2.5 text-sm sm:text-base bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-semibold rounded-xl transition disabled:opacity-70 shadow-[0_8px_20px_rgba(243,110,132,0.28)]"
                  >
                    {isResetting ? 'Resetting...' : 'Reset'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }

function HabitAnalyticsCard({
  habit,
  habits,
  habitSets,
  setResetTargetHabit,
  isResetting,
}: {
  habit: DailyHabit;
  habits: DailyHabit[];
  habitSets: HabitSet[];
  setResetTargetHabit: (habit: DailyHabit) => void;
  isResetting: boolean;
}) {
  const [showFullHistory, setShowFullHistory] = useState(false);

  const setIds = getHabitSetIds(habit);
  const isPresetActive = setIds.length === 0
    ? (habitSets[0] ? habitSets[0].isActive : true)
    : setIds.some((id) => {
        const s = habitSets.find((set) => set.id === id);
        return s ? s.isActive : false;
      });

  const rawScheduledDays = (habit as any).scheduledDays || [0, 1, 2, 3, 4, 5, 6];
  const completedDatesList = habit.completedDates || [];
  const streak = calculateStreak(
    completedDatesList,
    rawScheduledDays,
    habit.targetValue,
    habit.dailyProgress
  );
  const totalCompletions = calculateTotalCompletions(
    completedDatesList,
    habit.targetValue,
    habit.dailyProgress
  );
  const startDateObj = parseDateSafely(habit.trackingStartDate || habit.createdAt);
  const consistency = calculateConsistency(
    completedDatesList,
    rawScheduledDays,
    startDateObj,
    habit.targetValue,
    habit.dailyProgress
  );

  const displayScheduledDays = isPresetActive ? rawScheduledDays : [];
  const past7Days = getPast7DaysStatus(completedDatesList);

  const formatDateStr = (val: any) => {
    const d = parseDateSafely(val);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysAgoTextStr = (val: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = parseDateSafely(val);
    start.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const totalDays = Math.max(1, diffDays + 1);

    if (totalDays === 1) return '1 day';
    return `${totalDays} days`;
  };

  const formatScheduledDaysText = (days: number[]): string => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (!days || days.length === 7) return 'Everyday';
    if (days.length === 0) return 'No days';
    return days.map((d) => dayNames[d]).join(', ');
  };

  const getConsistencyTier = (pct: number) => {
    if (pct >= 80) {
      return {
        label: `Master (${pct}%)`,
        badgeClass: 'bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white shadow-2xs',
        icon: <Award className="w-3.5 h-3.5 text-white" />,
      };
    }
    if (pct >= 50) {
      return {
        label: `High Momentum (${pct}%)`,
        badgeClass: 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-2xs',
        icon: <Flame className="w-3.5 h-3.5 text-white" />,
      };
    }
    return {
      label: `Building Habit (${pct}%)`,
      badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200/90',
      icon: <Sparkles className="w-3.5 h-3.5 text-purple-600" />,
    };
  };

  const tier = getConsistencyTier(consistency);
  return (
    <div className="glass-card p-4 sm:p-5 lg:p-6 border border-purple-200/80 rounded-2xl lg:rounded-3xl transition-all duration-300 relative overflow-hidden bg-white/95 backdrop-blur-xl space-y-3.5 lg:space-y-5 shadow-sm hover:shadow-md">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 border-b border-purple-100/70 pb-3 lg:pb-4">
        <div className="flex items-center gap-2.5 lg:gap-3.5 min-w-0">
          <span
            className="w-2.5 h-6 sm:w-3 sm:h-7 lg:w-3.5 lg:h-8 rounded-full shrink-0 shadow-2xs"
            style={{ backgroundColor: getHabitColorHex(habit, habits) }}
          />
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight truncate">
            {habit.title}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setResetTargetHabit(habit)}
          disabled={isResetting}
          className="shrink-0 p-1.5 lg:p-2 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 border border-gray-200/70 hover:border-rose-200 transition disabled:opacity-50"
          title="Reset Habit Data"
          aria-label={`Reset tracking for ${habit.title}`}
        >
          <RefreshCw className="h-4 w-4 lg:h-5 lg:w-5" />
        </button>
      </div>

      {/* Meta Pills Bar */}
      <div className="flex items-center gap-1.5 lg:gap-2.5 flex-wrap text-[11px] sm:text-xs lg:text-sm font-medium">
        <span className="bg-purple-50 text-purple-700 border border-purple-200/80 px-2 py-0.5 lg:px-3 lg:py-1 rounded-md lg:rounded-lg font-semibold inline-flex items-center gap-1 lg:gap-1.5">
          <Calendar className="w-3 h-3 lg:w-4 lg:h-4 text-purple-500" />
          {formatScheduledDaysText(rawScheduledDays)}
        </span>

        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 lg:px-3 lg:py-1 rounded-md lg:rounded-lg font-semibold inline-flex items-center gap-1 lg:gap-1.5">
          <Clock className="w-3 h-3 lg:w-4 lg:h-4 text-indigo-500" />
          {habit.customSchedule && Object.keys(habit.customSchedule).length > 0
            ? 'Flexible Times'
            : `${habit.startTime} - ${habit.endTime}`}
        </span>

        <span className="bg-slate-50 text-slate-700 border border-slate-200/80 px-2.5 py-0.5 lg:px-3.5 lg:py-1 rounded-md lg:rounded-lg font-semibold inline-flex items-center gap-1.5">
          <span>🗓️</span>
          <span>Since {formatDateStr(habit.trackingStartDate || habit.createdAt)}</span>
          <span className="text-purple-600 font-bold">• {getDaysAgoTextStr(habit.trackingStartDate || habit.createdAt)}</span>
        </span>

        {!isPresetActive && (
          <span className="bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 lg:px-3 lg:py-1 rounded-md lg:rounded-lg font-semibold inline-flex items-center gap-1 lg:gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Inactive Routine
          </span>
        )}
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:gap-5">
        {/* Current Streak */}
        <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-pink-500/10 border border-orange-200/80 rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-700 text-xs lg:text-sm font-bold">
            <span>Current Streak</span>
            <Flame className="w-4 h-4 lg:w-5 lg:h-5 text-orange-500 animate-pulse" />
          </div>
          <div className="mt-1 lg:mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl lg:text-4xl xl:text-4xl font-black text-orange-600">{streak}</span>
            <span className="text-xs lg:text-sm font-bold text-orange-800/80">{streak === 1 ? 'day' : 'days'}</span>
          </div>
        </div>

        {/* Total Completions */}
        <div className="bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-indigo-500/10 border border-purple-200/80 rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-700 text-xs lg:text-sm font-bold">
            <span>Total Completions</span>
            <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
          </div>
          <div className="mt-1 lg:mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl lg:text-4xl xl:text-4xl font-black text-purple-600">{totalCompletions}</span>
            <span className="text-xs lg:text-sm font-bold text-purple-800/80">{totalCompletions === 1 ? 'time' : 'times'}</span>
          </div>
        </div>
      </div>

      {/* History Toggle Container */}
      <div className="p-3 sm:p-4 lg:p-5 border border-purple-100/90 rounded-xl lg:rounded-2xl bg-purple-50/30 space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-gray-800 text-xs lg:text-sm font-bold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5 text-purple-600" />
            Habit History
          </p>
          <button
            type="button"
            onClick={() => setShowFullHistory(!showFullHistory)}
            className="text-[11px] lg:text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-100/80 hover:bg-purple-200 px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-lg lg:rounded-xl transition"
          >
            {showFullHistory ? 'Show Last 7 Days' : 'View Full History'}
          </button>
        </div>

        {showFullHistory ? (
          <ContributionHeatmap
            startDate={startDateObj}
            completedDates={completedDatesList}
            scheduledDays={displayScheduledDays}
            targetValue={habit.targetValue}
            targetUnit={habit.targetUnit}
            dailyProgress={habit.dailyProgress}
          />
        ) : (
          <div className="flex justify-between items-center pt-1 px-1">
            {past7Days.map((dayStatus) => {
              const [year, month, day] = dayStatus.date.split('-');
              const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              const dayOfWeek = localDate.getDay();

              const trackingStartObj = new Date(startDateObj);
              trackingStartObj.setHours(0, 0, 0, 0);
              const isBeforeTrackingStart = localDate < trackingStartObj;

              const isScheduled = isBeforeTrackingStart ? false : displayScheduledDays.includes(dayOfWeek);

              const todayObj = new Date();
              todayObj.setHours(0, 0, 0, 0);
              const isPast = localDate < todayObj;

              const loggedVal = habit.dailyProgress?.[dayStatus.date];
              const isCompleted = dayStatus.completed;
              const target = habit.targetValue;
              const ratio = isCompleted
                ? 1.0
                : target && target > 0 && loggedVal && loggedVal > 0
                ? Math.min(1.0, loggedVal / target)
                : 0;

              let circleClass = 'w-7 h-7 sm:w-8 sm:h-8 lg:w-11 lg:h-11 rounded-full flex items-center justify-center transition-all ';
              let content = null;
              let styleObj: React.CSSProperties | undefined = undefined;

              if (ratio > 0) {
                circleClass += 'bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-pink-400 text-white shadow-xs border border-purple-300/60';
                content = <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-6 lg:h-6" />;
                styleObj = { opacity: Math.max(0.3, ratio) };
              } else if (!isScheduled) {
                circleClass += 'bg-transparent border border-dashed border-gray-300 text-gray-300';
                content = <Minus className="w-3 h-3 lg:w-4 lg:h-4" />;
              } else if (isPast) {
                circleClass += 'bg-rose-50 border border-rose-200 text-rose-500';
                content = <X className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5" />;
              } else {
                circleClass += 'bg-slate-100 border border-slate-200 text-slate-400';
              }

              return (
                <div key={dayStatus.date} className="flex flex-col items-center gap-1 lg:gap-1.5">
                  <span className="text-[10px] lg:text-xs text-gray-600 font-bold">
                    {getDayAbbreviation(dayStatus.date)}
                  </span>
                  <div className={circleClass} style={styleObj}>
                    {content}
                  </div>
                  <span className="text-[9px] lg:text-xs text-gray-400 font-bold">{parseInt(day, 10)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completion Rate & Rank Tier */}
      <div className="p-3 sm:p-4 lg:p-5 border border-purple-100/90 rounded-xl lg:rounded-2xl bg-purple-50/30 space-y-2 lg:space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <p className="text-gray-800 text-xs lg:text-sm font-bold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5 text-purple-600" />
            Overall Consistency
          </p>

          <div className={`px-2 py-0.5 lg:px-3.5 lg:py-1 rounded-full text-[10px] sm:text-xs lg:text-sm font-extrabold flex items-center gap-1 lg:gap-1.5 ${tier.badgeClass}`}>
            {tier.icon}
            <span>{tier.label}</span>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-3.5 sm:h-4 lg:h-5 rounded-full bg-gradient-to-r from-purple-100/90 via-pink-100/90 to-indigo-100/90 p-0.5 shadow-inner border border-purple-200/50">
          <div
            className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 rounded-full transition-all duration-500 shadow-xs"
            style={{ width: `${consistency}%` }}
          />
        </div>
      </div>
    </div>
  );
}
