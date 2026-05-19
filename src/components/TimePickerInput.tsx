import React, { useState, useRef, useEffect } from 'react';

interface TimePickerInputProps {
  value: string; // Format: "HH:MM"
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
}

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  value,
  onChange,
  label,
  disabled = false,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hours, minutes] = value.split(':').map(Number);

  const handleHourChange = (newHours: number) => {
    const newHours24 = Math.max(0, Math.min(23, newHours));
    const newValue = `${String(newHours24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    onChange(newValue);
    setDisplayValue(newValue);
  };

  const handleMinuteChange = (newMinutes: number) => {
    const newMinutes60 = Math.max(0, Math.min(59, newMinutes));
    const newValue = `${String(hours).padStart(2, '0')}:${String(newMinutes60).padStart(2, '0')}`;
    onChange(newValue);
    setDisplayValue(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d:]/g, '');
    setDisplayValue(val);

    // Auto-format when typing
    if (val.length === 5 && val[2] === ':') {
      const [h, m] = val.split(':').map(Number);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        onChange(formatted);
        setDisplayValue(formatted);
        setIsOpen(false);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
          {label} {required && '*'}
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="00:00"
          maxLength={5}
          disabled={disabled}
          className="w-full min-h-[36px] sm:min-h-[44px] rounded-lg border border-purple-200 bg-white/90 px-2.5 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-base text-gray-800 placeholder:text-gray-400 shadow-sm transition focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
        />
        <svg className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full mt-1 z-50 w-full bg-white border border-purple-200 rounded-lg shadow-lg p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Hours</label>
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleHourChange(hours + 1)}
                  className="w-8 h-8 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold transition"
                >
                  +
                </button>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={String(hours).padStart(2, '0')}
                  onChange={(e) => handleHourChange(parseInt(e.target.value) || 0)}
                  className="w-16 h-10 text-center text-lg font-semibold border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleHourChange(hours - 1)}
                  className="w-8 h-8 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold transition"
                >
                  −
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Minutes</label>
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMinuteChange(minutes + 5)}
                  className="w-8 h-8 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold transition"
                >
                  +
                </button>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={String(minutes).padStart(2, '0')}
                  onChange={(e) => handleMinuteChange(parseInt(e.target.value) || 0)}
                  className="w-16 h-10 text-center text-lg font-semibold border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleMinuteChange(minutes - 5)}
                  className="w-8 h-8 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold transition"
                >
                  −
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">Type or use buttons to set time (00:00 - 23:59)</p>
          </div>
        </div>
      )}
    </div>
  );
};
