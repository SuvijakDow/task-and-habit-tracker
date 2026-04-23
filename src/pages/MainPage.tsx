import { ComponentType, useState } from 'react';
import {
  BarChart2,
  CheckSquare,
  ChevronDown,
  Flame,
  FolderTree,
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
    { key: 'tasks', label: 'Tasks', icon: CheckSquare, iconClass: 'text-fuchsia-500' },
    { key: 'habits', label: 'Daily Habits', icon: Flame, iconClass: 'text-pink-500' },
    { key: 'categories', label: 'Categories', icon: FolderTree, iconClass: 'text-indigo-500' },
    { key: 'analytics', label: 'Analytics', icon: BarChart2, iconClass: 'text-purple-500' },
  ];

  const currentNavItem = navItems.find((item) => item.key === currentPage) || navItems[0];

  return (
    <div>
      {/* Navigation Tabs */}
      <div className="bg-white/40 backdrop-blur-sm border-b border-white/70 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:hidden relative py-2">
            <button
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              className="w-full inline-flex items-center justify-between rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-xs font-semibold text-purple-700"
            >
              <span className="inline-flex items-center gap-1.5">
                <currentNavItem.icon className={`h-4 w-4 ${currentNavItem.iconClass}`} />
                {currentNavItem.label}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isMobileNavOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMobileNavOpen && (
              <div className="absolute left-0 right-0 mt-2 rounded-xl border border-white/70 bg-white/95 backdrop-blur-md shadow-lg overflow-hidden">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setCurrentPage(item.key);
                      setIsMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium transition ${
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

          <div className="hidden md:flex gap-2 sm:gap-3 md:gap-5">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setCurrentPage(item.key)}
                className={`relative py-2 md:py-4 px-2 text-xs sm:text-sm md:text-base font-medium transition-colors ${
                  currentPage === item.key
                    ? 'text-purple-700'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <item.icon className={`h-4 w-4 md:h-5 md:w-5 ${item.iconClass}`} />
                  {item.label}
                </span>
                {currentPage === item.key && (
                  <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-purple-500" />
                )}
              </button>
            ))}
          </div>
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
