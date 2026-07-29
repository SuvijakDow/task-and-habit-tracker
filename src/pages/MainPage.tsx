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
      {/* Navigation Tabs */}
      <div className="hidden md:block sticky top-0 z-20 border-b border-purple-100/90 bg-white/90 backdrop-blur-2xl shadow-[0_8px_30px_rgba(124,58,237,0.1)] nav-animated">
        <nav className="hidden md:grid grid-cols-3 items-center gap-2.5 px-3 py-2.5 max-w-4xl mx-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setCurrentPage(item.key)}
              className={`inline-flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 text-sm lg:text-base font-bold transition-all nav-item-motion focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/70 ${
                currentPage === item.key
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-[0_10px_24px_rgba(168,85,247,0.35)] scale-[1.02]'
                  : 'bg-purple-50/70 text-purple-900/80 hover:bg-purple-100/90 hover:text-purple-950 border border-purple-200/60 shadow-2xs'
              }`}
            >
              <item.icon className={`h-5 w-5 ${currentPage === item.key ? 'text-white' : item.iconClass}`} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-purple-100/90 bg-white/95 backdrop-blur-xl shadow-[0_-8px_25px_rgba(124,58,237,0.12)] pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5">
        <div className="grid grid-cols-3 gap-1.5 px-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setCurrentPage(item.key)}
              className={`min-h-[42px] rounded-xl px-1 py-1.5 text-[11px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/70 ${
                currentPage === item.key
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-[0_8px_20px_rgba(168,85,247,0.3)]'
                  : 'bg-purple-50/70 text-purple-900/80 border border-purple-200/60'
              }`}
              aria-label={item.label}
            >
              <span className="flex flex-col items-center justify-center gap-0.5">
                <item.icon className={`h-4 w-4 ${currentPage === item.key ? 'text-white' : item.iconClass}`} />
                <span className="leading-none">{item.mobileLabel}</span>
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Page Content */}
      <div key={currentPage} className="page-enter pt-2.5 pb-[5.5rem] md:pb-0 md:pt-4">
        <Suspense fallback={<div className="p-4">Loading page...</div>}>
          {currentPageContent}
        </Suspense>
      </div>
    </div>
  );
}
