import React, { useRef } from 'react';
import { ChevronUp, ChevronDown, Delete, ChevronLeft, ChevronRight, CornerDownLeft, Command, TextCursorInput } from 'lucide-react';

interface VirtualKeyboardProps {
  onKeyPress: (key: string, modifiers?: { select?: boolean, ctrl?: boolean }) => void;
  isDark: boolean;
}

const ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
  ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
  ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
  ['Ctrl', 'Select', 'Space', 'Left', 'Right']
];

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = React.memo(({ onKeyPress, isDark }) => {
  const [isShift, setIsShift] = React.useState(false);
  const [isCaps, setIsCaps] = React.useState(false);
  const [isSelect, setIsSelect] = React.useState(false);
  const [isCtrl, setIsCtrl] = React.useState(false);

  const lastPosRef = useRef<{x: number, y: number} | null>(null);
  const accRef = useRef<{x: number, y: number}>({x: 0, y: 0});

  const getDisplayKey = (key: string) => {
    if (key === 'Space') return ' ';
    if (key === 'Enter') return '\n';
    if (key === 'Backspace') return 'Backspace';
    if (key === 'Tab') return '\t';
    if (['Caps', 'Shift', 'Ctrl', 'Select', 'Left', 'Right'].includes(key)) return key;

    const shiftMap: Record<string, string> = {
      '`': '~', '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^',
      '7': '&', '8': '*', '9': '(', '0': ')', '-': '_', '=': '+',
      '[': '{', ']': '}', '\\': '|', ';': ':', "'": '"', ',': '<', '.': '>', '/': '?'
    };

    let displayKey = key;
    if (isShift && shiftMap[key]) {
      displayKey = shiftMap[key];
    } else if (key.length === 1) {
      if (isShift || isCaps) displayKey = displayKey.toUpperCase();
      else displayKey = displayKey.toLowerCase();
    }
    return displayKey;
  };

  const handleKeyPress = (key: string) => {
    if (key === 'Shift') setIsShift(!isShift);
    else if (key === 'Caps') setIsCaps(!isCaps);
    else if (key === 'Select') setIsSelect(!isSelect);
    else if (key === 'Ctrl') setIsCtrl(!isCtrl);
    else if (key === 'Left') {
       onKeyPress('ArrowLeft', { select: isSelect, ctrl: isCtrl });
    }
    else if (key === 'Right') {
       onKeyPress('ArrowRight', { select: isSelect, ctrl: isCtrl });
    }
    else {
      onKeyPress(getDisplayKey(key), { select: isSelect, ctrl: isCtrl });
      if (isShift) setIsShift(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, key: string) => {
    e.preventDefault();
    handleKeyPress(key);
  };

  const handleTrackpadDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    accRef.current = { x: 0, y: 0 };
  };

  const handleTrackpadMove = (e: React.PointerEvent) => {
    if (!lastPosRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };

    accRef.current.x += dx;
    accRef.current.y += dy;

    const THRESHOLD = 12;
    while (accRef.current.x > THRESHOLD) {
       onKeyPress('ArrowRight', { select: isSelect, ctrl: isCtrl });
       accRef.current.x -= THRESHOLD;
    }
    while (accRef.current.x < -THRESHOLD) {
       onKeyPress('ArrowLeft', { select: isSelect, ctrl: isCtrl });
       accRef.current.x += THRESHOLD;
    }
    while (accRef.current.y > THRESHOLD * 2) {
       onKeyPress('ArrowDown', { select: isSelect, ctrl: isCtrl });
       accRef.current.y -= THRESHOLD * 2;
    }
    while (accRef.current.y < -THRESHOLD * 2) {
       onKeyPress('ArrowUp', { select: isSelect, ctrl: isCtrl });
       accRef.current.y += THRESHOLD * 2;
    }
  };

  const handleTrackpadUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    lastPosRef.current = null;
  };

  return (
    <div className={`p-1 pt-1.5 w-full flex flex-col gap-1 ${isDark ? 'bg-[#3A3A3C]' : 'bg-[#D1D1D6]'}`}>
      <div 
        className={`flex items-center justify-center gap-3 h-[clamp(24px,6vh,32px)] landscape:h-[clamp(20px,10vh,24px)] mx-auto w-full max-w-sm rounded-[5px] shadow-sm select-none touch-none font-semibold text-xs transition-colors
        ${isDark ? 'bg-[#2C2C2E] text-[#98989D] active:bg-[#48484A]' : 'bg-white text-gray-500 active:bg-gray-200'}`}
        onPointerDown={handleTrackpadDown}
        onPointerMove={handleTrackpadMove}
        onPointerUp={handleTrackpadUp}
        onPointerCancel={handleTrackpadUp}
      >
        <ChevronLeft size={14} className="opacity-70" /> 
        <TextCursorInput size={14} className="opacity-90" />
        <span className="opacity-90 tracking-wide font-bold">DRAG TO MOVE CURSOR</span>
        <ChevronRight size={14} className="opacity-70" />
      </div>

      <div className="flex flex-col gap-0.5 sm:gap-1 w-full max-w-3xl mx-auto">
        {ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className={`flex gap-[2px] sm:gap-[3px] justify-center w-full`}>
             {row.map((key, keyIndex) => {
               const displayKey = getDisplayKey(key);
               const isSpecial = ['Backspace', 'Tab', 'Caps', 'Enter', 'Shift', 'Ctrl', 'Select', 'Left', 'Right'].includes(key);
               return (
                 <button
                   key={`${rowIndex}-${keyIndex}`}
                   onPointerDown={(e) => handlePointerDown(e, key)}
                   onClick={(e) => e.preventDefault()}
                   className={`
                     flex items-center justify-center rounded-[5px] select-none transition-colors shadow-sm
                     ${isDark ? 'bg-[#636366] text-white active:bg-[#48484A]' : (isSpecial ? 'bg-[#AEAEB2]' : 'bg-white text-black active:bg-[#E5E5EA]')}
                     ${!isDark && isSpecial ? 'active:bg-[#8E8E93] text-black' : ''}
                     ${key === 'Space' ? 'flex-[4] h-[clamp(32px,8vh,42px)] landscape:h-[clamp(26px,12vh,28px)] min-w-[120px]' : 'h-[clamp(32px,8vh,42px)] landscape:h-[clamp(26px,12vh,28px)] flex-1 min-w-0'}
                     ${isSpecial ? (['Left', 'Right', 'Ctrl', 'Select'].includes(key) ? 'flex-[1.5]' : 'flex-[1.2]') : ''}
                     ${isSpecial ? 'text-[10px] sm:text-xs font-semibold' : 'text-[16px] uppercase'}
                     ${key === 'Shift' && isShift ? (isDark ? 'bg-white text-black' : 'bg-white text-black ring-1 ring-blue-500 shadow-xl') : ''}
                     ${key === 'Caps' && isCaps ? (isDark ? 'bg-white text-black' : 'bg-white text-black ring-1 ring-blue-500 shadow-xl') : ''}
                     ${key === 'Ctrl' && isCtrl ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white shadow-xl') : ''}
                     ${key === 'Select' && isSelect ? (isDark ? 'bg-amber-600 text-white' : 'bg-amber-500 text-white shadow-xl') : ''}
                   `}
                 >
                   {key === 'Backspace' ? <Delete size={16} className="w-4 h-4" /> :
                    key === 'Enter' ? <CornerDownLeft size={14} className="w-3.5 h-3.5" /> :
                    key === 'Shift' ? 'SHIFT' :
                    key === 'Space' ? '' :
                    key === 'Ctrl' ? 'CTRL' :
                    key === 'Select' ? 'SEL' :
                    key === 'Left' ? <ChevronLeft size={16} className="w-4 h-4" /> :
                    key === 'Right' ? <ChevronRight size={16} className="w-4 h-4" /> :
                    displayKey}
                 </button>
               )
             })}
          </div>
        ))}
      </div>
    </div>
  );
});
