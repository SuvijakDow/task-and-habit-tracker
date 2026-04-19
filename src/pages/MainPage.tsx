import React, { useState } from 'react';
import { TasksPage } from '@/pages/TasksPage';
import { HabitsPage } from '@/pages/HabitsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';

type Page = 'tasks' | 'habits' | 'analytics';

export function MainPage() {
  const [currentPage, setCurrentPage] = useState<Page>('tasks');

  return (
    <div>
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 sm:gap-4 md:gap-8">
            <button
              onClick={() => setCurrentPage('tasks')}
              className={`py-2 md:py-4 px-2 font-semibold transition-colors border-b-2 text-xs sm:text-sm md:text-base ${
                currentPage === 'tasks'
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              📋 Tasks
            </button>
            <button
              onClick={() => setCurrentPage('habits')}
              className={`py-2 md:py-4 px-2 font-semibold transition-colors border-b-2 text-xs sm:text-sm md:text-base ${
                currentPage === 'habits'
                  ? 'text-purple-600 border-purple-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              🔥 Daily Habits
            </button>
            <button
              onClick={() => setCurrentPage('analytics')}
              className={`py-2 md:py-4 px-2 font-semibold transition-colors border-b-2 text-xs sm:text-sm md:text-base ${
                currentPage === 'analytics'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-800'
              }`}
            >
              📊 Analytics
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
