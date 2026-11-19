import { ComponentType, useState, useEffect, startTransition, lazy, Suspense } from 'react';
import {
  Activity,
  ListChecks,
  TrendingUp,
} from 'lucide-react';

const importTasksPage = () => import('@/pages/TasksPage');
const importHabitsPage = () => import('@/pages/HabitsPage');
const importAnalyticsPage = () => import('@/pages/AnalyticsPage');

const TasksPage = lazy(() => importTasksPage().then((m) => ({ default: m.TasksPage })));
const HabitsPage = lazy(() => importHabitsPage().then((m) => ({ default: m.HabitsPage })));
const AnalyticsPage = lazy(() => importAnalyticsPage().then((m) => ({ default: m.AnalyticsPage })));

type Page = 'tasks' | 'habits' | 'analytics';

function PageSkeleton() {
  return (
    <div className="max-w-3xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 pt-3.5 sm:pt-4 space-y-5">
      <div className="h-24 sm:h-28 rounded-3xl skeleton-shimmer border border-purple-200/60" />
      <div className="h-14 rounded-2xl skeleton-shimmer border border-purple-100/80" />
      <div className="space-y-3">
        <div className="h-20 rounded-2xl skeleton-shimmer border border-purple-100/80" />
        <div className="h-20 rounded-2xl skeleton-shimmer border border-purple-100/80" />
        <div className="h-20 rounded-2xl skeleton-shimmer border border-purple-100/80" />
      </div>
    </div>
  );
}

export function MainPage() {
  const [currentPage, setCurrentPage] = useState<Page>('tasks');
  const [visitedPages, setVisitedPages] = useState<Set<Page>>(() => new Set(['tasks']));

  // Prefetch sibling route chunks during browser idle time for 0ms first tab switch
  useEffect(() => {
    const prefetchAll = () => {
      importHabitsPage();
      importAnalyticsPage();
    };
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof win.requestIdleCallback === 'function') {
      const id = win.requestIdleCallback(prefetchAll, { timeout: 2000 });
      return () => win.cancelIdleCallback?.(id);
    }
    const timer = globalThis.setTimeout(prefetchAll, 1200);
    return () => globalThis.clearTimeout(timer);
  }, []);

  const prefetchPage = (page: Page) => {
    if (page === 'habits') importHabitsPage();
    else if (page === 'analytics') importAnalyticsPage();
    else importTasksPage();
  };

  const handlePageChange = (page: Page) => {
    if (page === currentPage) return;
    startTransition(() => {
      setVisitedPages((prev) => {
        if (prev.has(page)) return prev;
        const next = new Set(prev);
        next.add(page);
        return next;
      });
      setCurrentPage(page);
    });
  };

  const navItems: Array<{
    key: Page;
    label: string;
    mobileLabel: string;
    icon: ComponentType<{ className?: string }>;
    iconClass: string;
  }> = [
    { key: 'tasks', label: 'Tasks', mobileLabel: 'Tasks', icon: ListChecks, iconClass: 'text-fuchsia-500' },
    { key: 'habits', label: 'Daily Habits', mobileLabel: 'Habits', icon: Activity, iconClass: 'text-pink-500' },
    { key: 'analytics', label: 'Analytics', mobileLabel: 'Stats', icon: TrendingUp, iconClass: 'text-purple-500' },
  ];

  return (
    <div>
      {/* Navigation Tabs (Floating Segmented Capsule) */}
      <div className="hidden md:block sticky top-2 z-20 px-4 py-1 my-0.5">
        <nav className="max-w-2xl mx-auto grid grid-cols-3 items-center gap-2 p-1.5 rounded-2xl bg-[#180938]/95 border border-purple-500/35 shadow-xl shadow-purple-950/35 backdrop-blur-md">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handlePageChange(item.key)}
              onMouseEnter={() => prefetchPage(item.key)}
              onFocus={() => prefetchPage(item.key)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm lg:text-base font-bold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                currentPage === item.key
                  ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 text-white shadow-md shadow-purple-500/35 border border-white/20'
                  : 'bg-purple-950/50 hover:bg-purple-900/70 text-purple-100 hover:text-white border border-purple-500/20'
              }`}
            >
              <item.icon className={`h-4.5 w-4.5 ${currentPage === item.key ? 'text-white' : 'text-purple-300'}`} />
              <span className={currentPage === item.key ? 'text-white font-extrabold' : 'text-purple-100 font-bold'}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-purple-800/40 bg-[#14082e]/95 shadow-[0_-8px_30px_rgba(15,23,42,0.4)] pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5">
        <div className="grid grid-cols-3 gap-1.5 px-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handlePageChange(item.key)}
              onTouchStart={() => prefetchPage(item.key)}
              className={`min-h-[42px] rounded-xl px-1 py-1.5 text-[11px] font-bold transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                currentPage === item.key
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-[0_8px_20px_rgba(192,132,252,0.4)] border border-white/20'
                  : 'bg-purple-950/50 text-purple-100 border border-purple-500/20'
              }`}
              aria-label={item.label}
            >
              <span className="flex flex-col items-center justify-center gap-0.5">
                <item.icon className={`h-4 w-4 ${currentPage === item.key ? 'text-white' : 'text-purple-300'}`} />
                <span className={`leading-none ${currentPage === item.key ? 'text-white font-bold' : 'text-purple-100 font-semibold'}`}>
                  {item.mobileLabel}
                </span>
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Page Content */}
      <div className="pt-1 pb-28 md:pb-0 md:pt-0">
        <Suspense fallback={<PageSkeleton />}>
          {visitedPages.has('tasks') && (
            <div className={currentPage === 'tasks' ? 'page-enter' : 'hidden'}>
              <TasksPage />
            </div>
          )}
          {visitedPages.has('habits') && (
            <div className={currentPage === 'habits' ? 'page-enter' : 'hidden'}>
              <HabitsPage />
            </div>
          )}
          {visitedPages.has('analytics') && (
            <div className={currentPage === 'analytics' ? 'page-enter' : 'hidden'}>
              <AnalyticsPage />
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
