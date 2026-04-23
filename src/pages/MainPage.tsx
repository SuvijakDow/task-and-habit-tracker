import { useState } from 'react';
import { BarChart2, CheckSquare, Flame } from 'lucide-react';
import { TasksPage } from '@/pages/TasksPage';
import { HabitsPage } from '@/pages/HabitsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';

type Page = 'tasks' | 'habits' | 'analytics';

export function MainPage() {
  const [currentPage, setCurrentPage] = useState<Page>('tasks');

  return (
    <div>
      {/* Navigation Tabs */}
      <div className="bg-white/40 backdrop-blur-sm border-b border-white/70 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 sm:gap-3 md:gap-5">
            <button
              onClick={() => setCurrentPage('tasks')}
              className={`relative py-2 md:py-4 px-2 text-xs sm:text-sm md:text-base font-medium transition-colors ${
                currentPage === 'tasks'
                  ? 'text-purple-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 md:h-5 md:w-5 text-fuchsia-500" />
                Tasks
              </span>
              {currentPage === 'tasks' && (
                <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-purple-500" />
              )}
            </button>
            <button
              onClick={() => setCurrentPage('habits')}
              className={`relative py-2 md:py-4 px-2 text-xs sm:text-sm md:text-base font-medium transition-colors ${
                currentPage === 'habits'
                  ? 'text-purple-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Flame className="h-4 w-4 md:h-5 md:w-5 text-pink-500" />
                Daily Habits
              </span>
              {currentPage === 'habits' && (
                <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-purple-500" />
              )}
            </button>
            <button
              onClick={() => setCurrentPage('analytics')}
              className={`relative py-2 md:py-4 px-2 text-xs sm:text-sm md:text-base font-medium transition-colors ${
                currentPage === 'analytics'
                  ? 'text-purple-700'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <BarChart2 className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                Analytics
              </span>
              {currentPage === 'analytics' && (
                <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-purple-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Page Content */}
      {currentPage === 'tasks' && <TasksPage />}
      {currentPage === 'habits' && <HabitsPage />}
      {currentPage === 'analytics' && <AnalyticsPage />}
    </div>
  );
}
