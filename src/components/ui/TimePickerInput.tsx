import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, Keyboard, X } from 'lucide-react';

interface TimePickerInputProps {
  value: string; // Format: "HH:MM"
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  popoverPosition?: 'bottom' | 'top';
  align?: 'left' | 'right';
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
  const dialRef = useRef<HTMLDivElement>(null);

  // Keyboard input mode refs
  const hoursInputRef = useRef<HTMLInputElement>(null);
  const minutesInputRef = useRef<HTMLInputElement>(null);

  // Time picker internal state
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const [inputType, setInputType] = useState<'dial' | 'keyboard'>('dial');
  
  // Temporary selected time while modal is open
  const [tempHours, setTempHours] = useState<number>(9);
  const [tempMinutes, setTempMinutes] = useState<number>(0);
  const [hoursInputStr, setHoursInputStr] = useState<string>('09');
  const [minutesInputStr, setMinutesInputStr] = useState<string>('00');
  const [isDragging, setIsDragging] = useState(false);

  // Sync internal state with prop value when modal opens or prop changes
  useEffect(() => {
    setDisplayValue(value);
    const [h, m] = (value || '09:00').split(':').map(Number);
    const validH = isNaN(h) ? 9 : Math.max(0, Math.min(23, h));
    const validM = isNaN(m) ? 0 : Math.max(0, Math.min(59, m));
    setTempHours(validH);
    setTempMinutes(validM);
    setHoursInputStr(String(validH).padStart(2, '0'));
    setMinutesInputStr(String(validM).padStart(2, '0'));
  }, [value, isOpen]);

  const updateTempHoursFromDial = (h: number) => {
    const validH = Math.max(0, Math.min(23, h));
    setTempHours(validH);
    setHoursInputStr(String(validH).padStart(2, '0'));
  };

  const updateTempMinutesFromDial = (m: number) => {
    const validM = Math.max(0, Math.min(59, m));
    setTempMinutes(validM);
    setMinutesInputStr(String(validM).padStart(2, '0'));
  };

  const handleOpen = () => {
    if (disabled) return;
    const [h, m] = (value || '09:00').split(':').map(Number);
    const validH = isNaN(h) ? 9 : Math.max(0, Math.min(23, h));
    const validM = isNaN(m) ? 0 : Math.max(0, Math.min(59, m));
    setTempHours(validH);
    setTempMinutes(validM);
    setHoursInputStr(String(validH).padStart(2, '0'));
    setMinutesInputStr(String(validM).padStart(2, '0'));
    setMode('hours');
    setInputType('dial');
    setIsOpen(true);
  };

  const handleConfirm = () => {
    const formatted = `${String(tempHours).padStart(2, '0')}:${String(tempMinutes).padStart(2, '0')}`;
    onChange(formatted);
    setDisplayValue(formatted);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setDisplayValue(value);
    setIsOpen(false);
  };

  // Switch between Dial and Keyboard input views
  const handleSwitchInputType = (type: 'dial' | 'keyboard') => {
    setInputType(type);
    if (type === 'keyboard') {
      setTimeout(() => {
        if (hoursInputRef.current) {
          hoursInputRef.current.focus();
          hoursInputRef.current.select();
        }
      }, 50);
    } else {
      // Dismiss mobile keyboard when switching back to dial
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  // Handlers for typing numbers in Keyboard View
  const handleHoursBoxChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    let digits = raw;

    // If previous string was already 2 digits (e.g. "09") and user appended a new digit (e.g. "091")
    if (hoursInputStr.length >= 2 && raw.length > hoursInputStr.length) {
      digits = raw.slice(hoursInputStr.length);
    } else if (raw.length > 2) {
      digits = raw.slice(-2);
    }

    setHoursInputStr(digits);

    if (digits.length > 0) {
      const parsed = parseInt(digits, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 23) {
        setTempHours(parsed);
      }
    }

    if (digits.length === 2 && minutesInputRef.current) {
      minutesInputRef.current.focus();
      minutesInputRef.current.select();
    }
  };

  const handleMinutesBoxChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    let digits = raw;

    // If previous string was already 2 digits (e.g. "00") and user appended a new digit (e.g. "003")
    if (minutesInputStr.length >= 2 && raw.length > minutesInputStr.length) {
      digits = raw.slice(minutesInputStr.length);
    } else if (raw.length > 2) {
      digits = raw.slice(-2);
    }

    setMinutesInputStr(digits);

    if (digits.length > 0) {
      const parsed = parseInt(digits, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 59) {
        setTempMinutes(parsed);
      }
    }
  };

  const handleHoursBoxBlur = () => {
    setHoursInputStr(String(tempHours).padStart(2, '0'));
  };

  const handleMinutesBoxBlur = () => {
    setMinutesInputStr(String(tempMinutes).padStart(2, '0'));
  };

  // Pointer / Drag logic for Radial Clock Dial
  const updateTimeFromPointer = useCallback((clientX: number, clientY: number, isFinal = false) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Calculate angle in degrees from top (12 o'clock)
    let angleRad = Math.atan2(dy, dx);
    let deg = (angleRad * (180 / Math.PI) + 90 + 360) % 360;

    if (mode === 'hours') {
      const sector = Math.round(deg / 30) % 12;
      // Threshold between inner circle (12..23) and outer circle (0..11)
      const isInner = dist < (rect.width / 2) * 0.62;
      let newH = isInner ? 12 + sector : sector;
      updateTempHoursFromDial(newH);

      // Auto transition to minutes after selecting hour on release
      if (isFinal) {
        setTimeout(() => {
          setMode('minutes');
        }, 150);
      }
    } else {
      let newM = Math.round(deg / 6) % 60;
      updateTempMinutesFromDial(newM);
    }
  }, [mode]);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    updateTimeFromPointer(clientX, clientY, false);
  };

  const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    updateTimeFromPointer(clientX, clientY, false);
  }, [isDragging, updateTimeFromPointer]);

  const handlePointerUp = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;
    updateTimeFromPointer(clientX, clientY, true);
  }, [isDragging, updateTimeFromPointer]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
      return () => {
        window.removeEventListener('mousemove', handlePointerMove);
        window.removeEventListener('mouseup', handlePointerUp);
        window.removeEventListener('touchmove', handlePointerMove);
        window.removeEventListener('touchend', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Geometry calculation for rendering radial clock elements (Dial size: 250px x 250px)
  const dialRadius = 125; // half of 250px
  const outerR = 94;
  const innerR = 60;

  // Calculate hand endpoint for SVG / Pointer Line
  let handAngleDeg = 0;
  let handLength = outerR;

  if (mode === 'hours') {
    const isInner = tempHours >= 12;
    handLength = isInner ? innerR : outerR;
    const sector = tempHours % 12;
    handAngleDeg = sector * 30;
  } else {
    handLength = outerR;
    handAngleDeg = tempMinutes * 6;
  }

  const handRad = (handAngleDeg - 90) * (Math.PI / 180);
  const handX = dialRadius + handLength * Math.cos(handRad);
  const handY = dialRadius + handLength * Math.sin(handRad);

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
          readOnly
          onClick={handleOpen}
          onFocus={(e) => {
            e.target.blur();
            handleOpen();
          }}
          placeholder="00:00"
          disabled={disabled}
          className="w-full min-h-[36px] sm:min-h-[44px] rounded-xl border border-purple-200 bg-white/90 px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-base font-semibold text-gray-800 placeholder:text-gray-400 shadow-sm transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/40 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500 cursor-pointer"
        />
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 p-1 text-purple-600 hover:text-purple-800 transition"
          title="Open Time Picker"
        >
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Prominent Fixed Overlay Modal for Time Picker */}
      {isOpen && !disabled && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-[330px] sm:w-[360px] max-w-[95vw] bg-slate-900 border border-purple-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.8)] text-white select-none relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-purple-300 tracking-wider uppercase flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-pink-400" />
                Select Time
              </span>
              
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Time Display Cards (Clock Mode vs Keyboard Mode) */}
            {inputType === 'dial' ? (
              /* Dial Mode: Big button cards (No keyboard popup on mobile) */
              <div className="flex flex-col items-center mb-3">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => setMode('hours')}
                      className={`w-28 h-20 rounded-2xl flex items-center justify-center text-4xl font-extrabold transition-all duration-200 ${
                        mode === 'hours'
                          ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-xl shadow-purple-500/40 ring-2 ring-purple-400 scale-105'
                          : 'bg-slate-800/90 text-gray-300 border border-slate-700/80 hover:bg-slate-700/60'
                      }`}
                    >
                      {String(tempHours).padStart(2, '0')}
                    </button>
                    <span className="text-[11px] font-bold text-gray-400 mt-1">Hours</span>
                  </div>

                  <span className="text-3xl font-black text-purple-400/90 pb-5 animate-pulse">:</span>

                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => setMode('minutes')}
                      className={`w-28 h-20 rounded-2xl flex items-center justify-center text-4xl font-extrabold transition-all duration-200 ${
                        mode === 'minutes'
                          ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-xl shadow-purple-500/40 ring-2 ring-purple-400 scale-105'
                          : 'bg-slate-800/90 text-gray-300 border border-slate-700/80 hover:bg-slate-700/60'
                      }`}
                    >
                      {String(tempMinutes).padStart(2, '0')}
                    </button>
                    <span className="text-[11px] font-bold text-gray-400 mt-1">Minutes</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Keyboard Mode: Google Material Style Inputs (Pops up Numpad keyboard on mobile) */
              <div className="flex flex-col items-center mb-3">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center">
                    <input
                      ref={hoursInputRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={hoursInputStr}
                      onFocus={(e) => {
                        setMode('hours');
                        e.target.select();
                      }}
                      onChange={(e) => handleHoursBoxChange(e.target.value)}
                      onBlur={handleHoursBoxBlur}
                      className={`w-28 h-20 rounded-2xl text-center text-4xl font-extrabold transition-all duration-200 focus:outline-none ${
                        mode === 'hours'
                          ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white border-2 border-purple-400 shadow-xl shadow-purple-500/40'
                          : 'bg-slate-800/90 text-gray-300 border border-slate-700/80'
                      }`}
                    />
                    <span className="text-[11px] font-bold text-gray-400 mt-1">Hours</span>
                  </div>

                  <span className="text-3xl font-black text-purple-400/90 pb-5 animate-pulse">:</span>

                  <div className="flex flex-col items-center">
                    <input
                      ref={minutesInputRef}
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={minutesInputStr}
                      onFocus={(e) => {
                        setMode('minutes');
                        e.target.select();
                      }}
                      onChange={(e) => handleMinutesBoxChange(e.target.value)}
                      onBlur={handleMinutesBoxBlur}
                      className={`w-28 h-20 rounded-2xl text-center text-4xl font-extrabold transition-all duration-200 focus:outline-none ${
                        mode === 'minutes'
                          ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white border-2 border-purple-400 shadow-xl shadow-purple-500/40'
                          : 'bg-slate-800/90 text-gray-300 border border-slate-700/80'
                      }`}
                    />
                    <span className="text-[11px] font-bold text-gray-400 mt-1">Minutes</span>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Content: Clock Dial vs Keyboard View */}
            {inputType === 'dial' ? (
              <div className="relative my-2">
                <div
                  ref={dialRef}
                  onMouseDown={handlePointerDown}
                  onTouchStart={handlePointerDown}
                  className="relative w-[250px] h-[250px] mx-auto rounded-full bg-slate-800/90 border border-purple-500/20 shadow-inner flex items-center justify-center cursor-pointer touch-none"
                >
                  {/* SVG Pointer Hand: Uses gradientUnits="userSpaceOnUse" so stroke NEVER disappears at 0, 90, 180, 270 degrees */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    <defs>
                      <linearGradient id="purplePinkGrad" x1="0" y1="0" x2="250" y2="250" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#A855F7" />
                        <stop offset="100%" stopColor="#EC4899" />
                      </linearGradient>
                    </defs>
                    {/* Permanent Line from center dot to selected bubble */}
                    <line
                      x1={dialRadius}
                      y1={dialRadius}
                      x2={handX}
                      y2={handY}
                      stroke="url(#purplePinkGrad)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    {/* Center Dot */}
                    <circle cx={dialRadius} cy={dialRadius} r="6" fill="#EC4899" />
                  </svg>

                  {/* Hand End Circle Bubble */}
                  <div
                    style={{
                      left: `${handX}px`,
                      top: `${handY}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="absolute w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white font-extrabold text-xs flex items-center justify-center shadow-lg shadow-pink-500/40 pointer-events-none z-20"
                  >
                    {mode === 'hours'
                      ? String(tempHours).padStart(2, '0')
                      : String(tempMinutes).padStart(2, '0')}
                  </div>

                  {/* Render Dial Numbers */}
                  {mode === 'hours' ? (
                    <>
                      {/* Outer Circle (0..11) */}
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => {
                        const angle = (h * 30 - 90) * (Math.PI / 180);
                        const nx = dialRadius + outerR * Math.cos(angle);
                        const ny = dialRadius + outerR * Math.sin(angle);
                        const isSelected = tempHours === h;

                        return (
                          <div
                            key={`out-${h}`}
                            style={{
                              left: `${nx}px`,
                              top: `${ny}px`,
                              transform: 'translate(-50%, -50%)',
                            }}
                            className={`absolute text-sm font-extrabold pointer-events-none ${
                              isSelected ? 'text-transparent' : 'text-gray-300'
                            }`}
                          >
                            {h}
                          </div>
                        );
                      })}

                      {/* Inner Circle (12..23) */}
                      {[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((h) => {
                        const angle = ((h - 12) * 30 - 90) * (Math.PI / 180);
                        const nx = dialRadius + innerR * Math.cos(angle);
                        const ny = dialRadius + innerR * Math.sin(angle);
                        const isSelected = tempHours === h;

                        return (
                          <div
                            key={`in-${h}`}
                            style={{
                              left: `${nx}px`,
                              top: `${ny}px`,
                              transform: 'translate(-50%, -50%)',
                            }}
                            className={`absolute text-xs font-bold pointer-events-none ${
                              isSelected ? 'text-transparent' : 'text-gray-400'
                            }`}
                          >
                            {h}
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    /* Minutes Mode (00, 05, 10, ..., 55) */
                    [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => {
                      const angle = (m * 6 - 90) * (Math.PI / 180);
                      const nx = dialRadius + outerR * Math.cos(angle);
                      const ny = dialRadius + outerR * Math.sin(angle);
                      const isSelected = tempMinutes === m;

                      return (
                        <div
                          key={`min-${m}`}
                          style={{
                            left: `${nx}px`,
                            top: `${ny}px`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          className={`absolute text-xs font-extrabold pointer-events-none ${
                            isSelected ? 'text-transparent' : 'text-gray-300'
                          }`}
                        >
                          {String(m).padStart(2, '0')}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Keyboard Mode Extra Options (Quick Presets) */
              <div className="py-2 px-1 my-2">
                <label className="block text-[11px] font-bold text-purple-300/80 mb-2 uppercase tracking-wider text-center">Quick Select</label>
                <div className="grid grid-cols-4 gap-2">
                  {['06:00', '09:00', '12:00', '13:00', '17:00', '18:00', '20:00', '21:00'].map((timeStr) => (
                    <button
                      key={timeStr}
                      type="button"
                      onClick={() => {
                        const [h, m] = timeStr.split(':').map(Number);
                        updateTempHoursFromDial(h);
                        updateTempMinutesFromDial(m);
                      }}
                      className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-purple-600 text-xs font-bold text-purple-200 hover:text-white border border-slate-700 transition shadow-sm"
                    >
                      {timeStr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar Footer */}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-800">
              {/* Bottom Left Mode Toggle Button (Google Style) */}
              <button
                type="button"
                onClick={() => handleSwitchInputType(inputType === 'dial' ? 'keyboard' : 'dial')}
                className="p-2.5 text-purple-300 hover:text-white rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-purple-600/80 transition"
                title={inputType === 'dial' ? 'Type time using keyboard' : 'Select time using clock dial'}
              >
                {inputType === 'dial' ? <Keyboard className="w-5 h-5 text-pink-400" /> : <Clock className="w-5 h-5 text-purple-400" />}
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-6 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-600/40 hover:opacity-95 active:scale-95 transition"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
