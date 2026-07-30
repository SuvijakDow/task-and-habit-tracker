import React, { createContext, useContext, useCallback, ReactNode } from 'react';

interface DataRefreshContextType {
  refreshTasks: () => void;
  refreshHabits: () => void;
  refreshTaskPresets: () => void;
  refreshHabitSets: () => void;
  refreshCategories: () => void;
  refreshAnalytics: () => void;
  registerRefreshTasks: (fn: () => void) => void;
  registerRefreshHabits: (fn: () => void) => void;
  registerRefreshTaskPresets: (fn: () => void) => void;
  registerRefreshHabitSets: (fn: () => void) => void;
  registerRefreshCategories: (fn: () => void) => void;
  registerRefreshAnalytics: (fn: () => void) => void;
}

const DataRefreshContext = createContext<DataRefreshContextType | undefined>(undefined);

export const DataRefreshProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const refreshTasksRef = React.useRef<(() => void) | null>(null);
  const refreshHabitsRef = React.useRef<(() => void) | null>(null);
  const refreshTaskPresetsRef = React.useRef<(() => void) | null>(null);
  const refreshHabitSetsRef = React.useRef<(() => void) | null>(null);
  const refreshCategoriesRef = React.useRef<(() => void) | null>(null);
  const refreshAnalyticsRef = React.useRef<(() => void) | null>(null);

  const registerRefreshTasks = useCallback((fn: () => void) => {
    refreshTasksRef.current = fn;
  }, []);

  const registerRefreshHabits = useCallback((fn: () => void) => {
    refreshHabitsRef.current = fn;
  }, []);

  const registerRefreshTaskPresets = useCallback((fn: () => void) => {
    refreshTaskPresetsRef.current = fn;
  }, []);

  const registerRefreshHabitSets = useCallback((fn: () => void) => {
    refreshHabitSetsRef.current = fn;
  }, []);

  const registerRefreshCategories = useCallback((fn: () => void) => {
    refreshCategoriesRef.current = fn;
  }, []);

  const registerRefreshAnalytics = useCallback((fn: () => void) => {
    refreshAnalyticsRef.current = fn;
  }, []);

  const refreshTasks = useCallback(() => {
    if (refreshTasksRef.current) {
      refreshTasksRef.current();
    }
  }, []);

  const refreshHabits = useCallback(() => {
    if (refreshHabitsRef.current) {
      refreshHabitsRef.current();
    }
  }, []);

  const refreshTaskPresets = useCallback(() => {
    if (refreshTaskPresetsRef.current) {
      refreshTaskPresetsRef.current();
    }
  }, []);

  const refreshHabitSets = useCallback(() => {
    if (refreshHabitSetsRef.current) {
      refreshHabitSetsRef.current();
    }
  }, []);

  const refreshCategories = useCallback(() => {
    if (refreshCategoriesRef.current) {
      refreshCategoriesRef.current();
    }
  }, []);

  const refreshAnalytics = useCallback(() => {
    if (refreshAnalyticsRef.current) {
      refreshAnalyticsRef.current();
    }
  }, []);

  return (
    <DataRefreshContext.Provider value={{ refreshTasks, refreshHabits, refreshTaskPresets, refreshHabitSets, refreshCategories, refreshAnalytics, registerRefreshTasks, registerRefreshHabits, registerRefreshTaskPresets, registerRefreshHabitSets, registerRefreshCategories, registerRefreshAnalytics }}>
      {children}
    </DataRefreshContext.Provider>
  );
};

export const useDataRefresh = () => {
  const context = useContext(DataRefreshContext);
  if (context === undefined) {
    throw new Error('useDataRefresh must be used within a DataRefreshProvider');
  }
  return context;
};
