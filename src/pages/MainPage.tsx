import { ComponentType, useState, lazy, Suspense } from 'react';
import {
  Activity,
  ListChecks,
  TrendingUp,
} from 'lucide-react';
const TasksPage = lazy(() => import('@/pages/TasksPage').then((m) => ({ default: m.TasksPage })));
const HabitsPage = lazy(() => import('@/pages/HabitsPage').then((m) => ({ default: m.HabitsPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));

type Page = 'tasks' | 'habits' | 'analytics';

export function MainPage() {
  const [currentPage, setCurrentPage] = useState<Page>('tasks');

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

  const currentPageContent = (
    <>
      {currentPage === 'tasks' && <TasksPage />}
      {currentPage === 'habits' && <HabitsPage />}
      {currentPage === 'analytics' && <AnalyticsPage />}
    </>
  );

  return (
    <div>
      {/* Navigation Tabs (Floating Segmented Capsule) */}
      <div className="hidden md:block sticky top-2 z-20 px-4 py-1 my-0.5">
        <nav className="max-w-2xl mx-auto grid grid-cols-3 items-center gap-2 p-1.5 rounded-2xl bg-[#180938]/95 border border-purple-500/35 shadow-xl shadow-purple-950/40 backdrop-blur-2xl">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setCurrentPage(item.key)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm lg:text-base font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                currentPage === item.key
                  ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 text-white shadow-md shadow-purple-500/35 scale-[1.01] border border-white/20'
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
      <nav className="mobile-bottom-nav md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-purple-800/40 bg-[#14082e]/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(15,23,42,0.4)] pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5">
        <div className="grid grid-cols-3 gap-1.5 px-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setCurrentPage(item.key)}
              className={`min-h-[42px] rounded-xl px-1 py-1.5 text-[11px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
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
      <div key={currentPage} className="page-enter pt-1 pb-[5.5rem] md:pb-0 md:pt-0">
        <Suspense fallback={<div className="p-4">Loading page...</div>}>
          {currentPageContent}
        </Suspense>
      </div>
    </div>
  );
}
