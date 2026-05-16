import { ComponentType, useState } from 'react';
import {
  Activity,
  FolderTree,
  ListChecks,
  TrendingUp,
} from 'lucide-react';
import { TasksPage } from '@/pages/TasksPage';
import { HabitsPage } from '@/pages/HabitsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { CategoriesPage } from '@/pages/CategoriesPage';

type Page = 'tasks' | 'habits' | 'categories' | 'analytics';

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
    { key: 'categories', label: 'Categories', mobileLabel: 'Groups', icon: FolderTree, iconClass: 'text-indigo-500' },
    { key: 'analytics', label: 'Analytics', mobileLabel: 'Stats', icon: TrendingUp, iconClass: 'text-purple-500' },
  ];

  const currentPageContent = (
    <>
      {currentPage === 'tasks' && <TasksPage />}
      {currentPage === 'habits' && <HabitsPage />}
      {currentPage === 'categories' && <CategoriesPage />}
      {currentPage === 'analytics' && <AnalyticsPage />}
    </>
  );

  return (
    <div>
      {/* Navigation Tabs */}
      <div className="hidden md:block sticky top-0 z-20 border-y border-white/60 bg-white/68 backdrop-blur-xl shadow-[0_10px_28px_rgba(124,58,237,0.12)] nav-animated">
        <nav className="hidden md:grid grid-cols-4 items-center gap-2 px-3 py-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setCurrentPage(item.key)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm lg:text-base font-semibold transition-all nav-item-motion focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                currentPage === item.key
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-[0_10px_24px_rgba(168,85,247,0.3)] scale-[1.01]'
                  : 'bg-white/72 text-purple-900/70 hover:bg-white hover:text-purple-700 border border-white/70'
              }`}
            >
              <item.icon className={`h-5 w-5 ${currentPage === item.key ? 'text-white' : item.iconClass}`} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-white/65 bg-white/88 backdrop-blur-xl shadow-[0_-8px_28px_rgba(124,58,237,0.16)] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="grid grid-cols-4 gap-1 px-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setCurrentPage(item.key)}
              className={`min-h-[44px] rounded-xl px-1.5 py-2 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                currentPage === item.key
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-[0_10px_24px_rgba(168,85,247,0.3)]'
                  : 'bg-white/72 text-purple-900/70 border border-white/70'
              }`}
              aria-label={item.label}
            >
              <span className="flex flex-col items-center justify-center gap-1">
                <item.icon className={`h-4 w-4 ${currentPage === item.key ? 'text-white' : item.iconClass}`} />
                <span className="leading-none">{item.mobileLabel}</span>
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Page Content */}
      <div key={currentPage} className="page-enter pt-3 pb-24 md:pb-0 md:pt-4">
        {currentPageContent}
      </div>
    </div>
  );
}
