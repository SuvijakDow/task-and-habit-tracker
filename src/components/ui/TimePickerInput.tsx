import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, Keyboard } from 'lucide-react';

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
  popoverPosition = 'bottom',
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);

  // Time picker internal state
  const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
  const [inputType, setInputType] = useState<'dial' | 'keyboard'>('dial');
  
  // Temporary selected time while popover is open
  const [tempHours, setTempHours] = useState<number>(0);
  const [tempMinutes, setTempMinutes] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  // Sync internal state with prop value when popover opens or prop changes
  useEffect(() => {
    setDisplayValue(value);
    const [h, m] = (value || '09:00').split(':').map(Number);
    setTempHours(isNaN(h) ? 9 : Math.max(0, Math.min(23, h)));
    setTempMinutes(isNaN(m) ? 0 : Math.max(0, Math.min(59, m)));
  }, [value, isOpen]);

  const handleOpen = () => {
    if (disabled) return;
    const [h, m] = (value || '09:00').split(':').map(Number);
    setTempHours(isNaN(h) ? 9 : Math.max(0, Math.min(23, h)));
    setTempMinutes(isNaN(m) ? 0 : Math.max(0, Math.min(59, m)));
    setMode('hours');
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d:]/g, '');
    setDisplayValue(val);

    // Auto-format when typing complete time HH:MM
    if (val.length === 5 && val[2] === ':') {
      const [h, m] = val.split(':').map(Number);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        onChange(formatted);
        setDisplayValue(formatted);
        setTempHours(h);
        setTempMinutes(m);
      }
    }
  };

  // Outside click listener
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

  // Pointer / Drag logic for Radial Clock
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
      setTempHours(newH);

      // Auto transition to minutes after selecting hour on release
      if (isFinal) {
        setTimeout(() => {
          setMode('minutes');
        }, 150);
      }
    } else {
      let newM = Math.round(deg / 6) % 60;
      setTempMinutes(newM);
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

  // Geometry calculation for rendering radial clock elements
  const dialRadius = 108; // half of dial width (216px)
  const outerR = 82;
  const innerR = 52;

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
          onChange={handleInputChange}
          onFocus={handleOpen}
          placeholder="00:00"
          maxLength={5}
          disabled={disabled}
          className="w-full min-h-[36px] sm:min-h-[44px] rounded-xl border border-purple-200 bg-white/90 px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-base font-semibold text-gray-800 placeholder:text-gray-400 shadow-sm transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/40 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
        />
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 p-1 text-purple-600 hover:text-purple-800 transition"
          title="Open Clock Time Picker"
        >
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {isOpen && !disabled && (
        <div
          className={`absolute ${
            popoverPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-1.5'
          } ${
            align === 'right' ? 'right-0 left-auto' : 'left-0 right-auto'
          } z-[10010] w-[280px] sm:w-[300px] bg-slate-900/95 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-4 shadow-[0_20px_50px_rgba(124,58,237,0.4)] text-white select-none`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[11px] font-bold text-purple-300 tracking-wider uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-pink-400" />
              เลือกเวลา
            </span>
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/80">
              <button
                type="button"
                onClick={() => setInputType('dial')}
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition ${
                  inputType === 'dial' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                นาฬิกา
              </button>
              <button
                type="button"
                onClick={() => setInputType('keyboard')}
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition ${
                  inputType === 'keyboard' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                แป้นพิมพ์
              </button>
            </div>
          </div>

          {/* Digital Clock Display Header */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setMode('hours')}
              className={`w-24 h-16 rounded-2xl flex items-center justify-center text-3xl font-extrabold transition-all duration-200 ${
                mode === 'hours'
                  ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/40 ring-2 ring-purple-400/80 scale-105'
                  : 'bg-slate-800/90 text-gray-300 border border-slate-700/80 hover:bg-slate-700/60'
              }`}
            >
              {String(tempHours).padStart(2, '0')}
            </button>

            <span className="text-2xl font-black text-purple-400/90 animate-pulse">:</span>

            <button
              type="button"
              onClick={() => setMode('minutes')}
              className={`w-24 h-16 rounded-2xl flex items-center justify-center text-3xl font-extrabold transition-all duration-200 ${
                mode === 'minutes'
                  ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/40 ring-2 ring-purple-400/80 scale-105'
                  : 'bg-slate-800/90 text-gray-300 border border-slate-700/80 hover:bg-slate-700/60'
              }`}
            >
              {String(tempMinutes).padStart(2, '0')}
            </button>
          </div>

          {/* Interactive Mode Content */}
          {inputType === 'dial' ? (
            <div className="relative my-2">
              {/* Dial Face */}
              <div
                ref={dialRef}
                onMouseDown={handlePointerDown}
                onTouchStart={handlePointerDown}
                className="relative w-[216px] h-[216px] mx-auto rounded-full bg-slate-800/90 border border-purple-500/20 shadow-inner flex items-center justify-center cursor-pointer touch-none"
              >
                {/* SVG Pointer Hand */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                  <defs>
                    <linearGradient id="purplePinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                  </defs>
                  {/* Line from center to target */}
                  <line
                    x1={dialRadius}
                    y1={dialRadius}
                    x2={handX}
                    y2={handY}
                    stroke="url(#purplePinkGrad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Center Dot */}
                  <circle cx={dialRadius} cy={dialRadius} r="5" fill="#EC4899" />
                </svg>

                {/* Hand End Circle Bubble */}
                <div
                  style={{
                    left: `${handX}px`,
                    top: `${handY}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white font-extrabold text-xs flex items-center justify-center shadow-md shadow-pink-500/30 pointer-events-none z-20"
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
                          className={`absolute text-xs font-extrabold pointer-events-none ${
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
                          className={`absolute text-[11px] font-bold pointer-events-none ${
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
            /* Keyboard Direct Input Mode */
            <div className="py-3 px-2 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">ชั่วโมง (0-23)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={tempHours}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTempHours(isNaN(val) ? 0 : Math.max(0, Math.min(23, val)));
                    }}
                    className="w-full h-12 text-center text-xl font-bold bg-slate-800 border border-purple-500/40 rounded-xl text-white focus:border-pink-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">นาที (0-59)</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={tempMinutes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setTempMinutes(isNaN(val) ? 0 : Math.max(0, Math.min(59, val)));
                    }}
                    className="w-full h-12 text-center text-xl font-bold bg-slate-800 border border-purple-500/40 rounded-xl text-white focus:border-pink-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Time Presets */}
              <div>
                <label className="block text-[10px] font-bold text-purple-300/80 mb-1.5 uppercase tracking-wider">ลัดเลือกเวลา</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['06:00', '09:00', '12:00', '13:00', '17:00', '18:00', '20:00', '21:00'].map((timeStr) => (
                    <button
                      key={timeStr}
                      type="button"
                      onClick={() => {
                        const [h, m] = timeStr.split(':').map(Number);
                        setTempHours(h);
                        setTempMinutes(m);
                      }}
                      className="py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-purple-600/80 text-[11px] font-bold text-purple-200 hover:text-white border border-slate-700 transition"
                    >
                      {timeStr}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Bar Footer */}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setInputType(inputType === 'dial' ? 'keyboard' : 'dial')}
              className="p-2 text-purple-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title={inputType === 'dial' ? 'สลับเป็นพิมพ์ตัวเลข' : 'สลับเป็นวงกลมนาฬิกา'}
            >
              {inputType === 'dial' ? <Keyboard className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-slate-800 transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-purple-600/30 hover:opacity-95 active:scale-95 transition"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
