import React, { useEffect, useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { HabitSet } from '@/types';
import { DEFAULT_PRESET_COLOR } from '@/constants/defaults';

interface RoutineSelectorDropdownProps {
  habitSets: HabitSet[];
  selectedSetId: string;
  onSelect: (setId: string) => void;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  headerLabel?: string;
  showActivePill?: boolean;
  className?: string;
}

export const RoutineSelectorDropdown: React.FC<RoutineSelectorDropdownProps> = ({
  habitSets,
  selectedSetId,
  onSelect,
  includeAllOption = false,
  allOptionLabel = 'All Routines',
  headerLabel = 'Switch Routine',
  showActivePill = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.routine-dropdown-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const selectedSet = habitSets.find((s) => s.id === selectedSetId);
  const displayName =
    includeAllOption && selectedSetId === 'all'
      ? allOptionLabel
      : selectedSet?.name || habitSets[0]?.name || 'General';
  const dotColor =
    includeAllOption && selectedSetId === 'all'
      ? '#9333EA'
      : selectedSet?.color || DEFAULT_PRESET_COLOR;

  return (
    <div className={`relative routine-dropdown-container min-w-0 flex-1 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex min-h-[36px] sm:min-h-[38px] w-full items-center justify-between rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-2xs transition-all hover:border-purple-400 hover:shadow-xs focus:outline-none sm:px-4 sm:text-sm"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          <Layers className="h-4 w-4 flex-shrink-0 text-purple-600" />
          <span className="hidden font-normal text-gray-500 sm:inline">Routine:</span>
          <div className="flex items-center gap-1.5 truncate">
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: dotColor }}
            />
            <span className="truncate font-bold text-gray-900">{displayName}</span>
          </div>
        </div>
        <ChevronDown
          className={`ml-2 h-4 w-4 flex-shrink-0 text-purple-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="modal-enter absolute left-0 top-full z-[100] mt-1.5 w-64 max-h-64 overflow-y-auto rounded-xl border-2 border-purple-300 bg-white py-1.5 shadow-[0_16px_36px_rgba(120,87,255,0.35)]">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            {headerLabel}
          </div>

          {includeAllOption && (
            <button
              type="button"
              onClick={() => {
                onSelect('all');
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition-all hover:bg-purple-50 sm:text-sm ${
                selectedSetId === 'all' ? 'bg-purple-50 font-bold text-purple-900' : 'text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-purple-600" />
                <span className="truncate">{allOptionLabel}</span>
              </div>
            </button>
          )}

          {habitSets.map((set) => {
            const isSelected = set.id === selectedSetId;
            return (
              <button
                key={set.id}
                type="button"
                onClick={() => {
                  onSelect(set.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition-all hover:bg-purple-50 sm:text-sm ${
                  isSelected ? 'bg-purple-50 font-bold text-purple-900' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: set.color || DEFAULT_PRESET_COLOR }}
                  />
                  <span className="truncate">{set.name}</span>
                </div>
                {showActivePill && set.isActive && (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shrink-0">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
