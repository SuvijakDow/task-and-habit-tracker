import { ComponentType, useState } from 'react';
import {
  Activity,
  ChevronDown,
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

  return (
    <div>
      {/* Navigation Tabs */}
      <div className="sticky top-0 z-20 px-4 sm:px-6 pt-2">
        <div className="max-w-3xl mx-auto">
          <div className="md:hidden relative py-2.5">
            <button
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              className="w-full inline-flex items-center justify-between rounded-2xl border border-white/60 bg-white/65 px-3.5 py-2.5 text-xs font-semibold text-purple-700 shadow-sm"
            >
              <span className="inline-flex items-center gap-1.5">
                <currentNavItem.icon className={`h-4 w-4 ${currentNavItem.iconClass}`} />
                {currentNavItem.label}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isMobileNavOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMobileNavOpen && (
              <div className="glass-card absolute left-0 right-0 mt-2 overflow-hidden">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setCurrentPage(item.key);
                      setIsMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition ${
                      currentPage === item.key
                        ? 'text-purple-700 bg-purple-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${item.iconClass}`} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav className="hidden md:flex items-center gap-6 bg-white/30 backdrop-blur-md rounded-2xl shadow-sm px-3 py-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setCurrentPage(item.key)}
                className={`inline-flex items-center gap-2 px-4 py-3 border-b-[3px] text-base md:text-lg font-semibold transition-colors ${
                  currentPage === item.key
                    ? 'text-purple-700 border-purple-500'
                    : 'text-purple-900/60 border-transparent hover:text-purple-700'
                }`}
              >
                <item.icon className={`h-5 w-5 ${item.iconClass}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      {currentPage === 'tasks' && <TasksPage />}
      {currentPage === 'habits' && <HabitsPage />}
      {currentPage === 'categories' && <CategoriesPage />}
      {currentPage === 'analytics' && <AnalyticsPage />}
    </div>
  );
}
