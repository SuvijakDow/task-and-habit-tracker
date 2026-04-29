import { ComponentType, useState } from 'react';
import {
  Activity,
  ChevronDown,
  FolderTree,
  ListChecks,
  TrendingUp,
} from 'lucide-react';
import { TasksPage } from '@/pages/TasksPage';
import HabitsPage from '@/pages/HabitsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { CategoriesPage } from '@/pages/CategoriesPage';

type Page = 'tasks' | 'habits' | 'categories' | 'analytics';

export function MainPage() {
  const [currentPage, setCurrentPage] = useState<Page>('tasks');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const navItems: Array<{
    key: Page;
    label: string;
    icon: ComponentType<{ className?: string }>;
    iconClass: string;
  }> = [
    { key: 'tasks', label: 'Tasks', icon: ListChecks, iconClass: 'text-fuchsia-500' },
    { key: 'habits', label: 'Daily Habits', icon: Activity, iconClass: 'text-pink-500' },
    { key: 'categories', label: 'Categories', icon: FolderTree, iconClass: 'text-indigo-500' },
    { key: 'analytics', label: 'Analytics', icon: TrendingUp, iconClass: 'text-purple-500' },
  ];

  const currentNavItem = navItems.find((item) => item.key === currentPage) || navItems[0];
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
      <div className="sticky top-0 z-20 border-y border-white/60 bg-white/68 backdrop-blur-xl shadow-[0_10px_28px_rgba(124,58,237,0.12)] nav-animated">
        <div className="md:hidden relative px-3 py-2.5">
          <button
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
            className="w-full inline-flex items-center justify-between rounded-2xl border border-white/75 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-purple-700 shadow-sm nav-item-motion"
          >
            <span className="inline-flex items-center gap-1.5">
              <currentNavItem.icon className={`h-4 w-4 ${currentNavItem.iconClass}`} />
              {currentNavItem.label}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isMobileNavOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMobileNavOpen && (
            <div className="glass-card modal-enter absolute left-3 right-3 mt-2 overflow-hidden rounded-2xl border border-white/70 bg-white/92 shadow-[0_16px_38px_rgba(124,58,237,0.18)]">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setCurrentPage(item.key);
                    setIsMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold transition ${
                    currentPage === item.key
                      ? 'text-purple-700 bg-purple-50/90'
                      : 'text-gray-700 hover:bg-gray-50/90'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${item.iconClass}`} />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="hidden md:grid grid-cols-4 items-center gap-2 px-3 py-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setCurrentPage(item.key)}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm lg:text-base font-semibold transition-all nav-item-motion ${
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

      {/* Page Content */}
      <div key={currentPage} className="page-enter pt-3 md:pt-4">
        {currentPageContent}
      </div>
    </div>
  );
}
