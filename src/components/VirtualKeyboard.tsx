import React, { useRef } from 'react';
import { ChevronUp, ChevronDown, Delete, ChevronLeft, ChevronRight, CornerDownLeft, TextCursorInput } from 'lucide-react';

interface VirtualKeyboardProps {
  onKeyPress: (key: string, modifiers?: { select?: boolean, ctrl?: boolean }) => void;
  isDark: boolean;
}

// Standard layout providing generous mobile touch targets and full character access
const KEYBOARD_ROWS = [
  ['**', '*', '_', '^', '$', '{', '}', '[', ']', '#', 'Tab'],
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '\\', 'Backspace'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
  ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  ['Ctrl', 'Select', 'Space', 'Left', 'Up', 'Down', 'Right']
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
    if (['Caps', 'Shift', 'Ctrl', 'Select', 'Left', 'Right', 'Up', 'Down', '**'].includes(key)) return key;

    const shiftMap: Record<string, string> = {
      '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
      '-': '_', '=': '+', ';': ':', "'": '"', ',': '<', '.': '>', '/': '?',
      '[': '{', ']': '}', '\\': '|'
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
    if (key === 'Shift') {
      setIsShift(!isShift);
    } else if (key === 'Caps') {
      setIsCaps(!isCaps);
    } else if (key === 'Select') {
      setIsSelect(!isSelect);
    } else if (key === 'Ctrl') {
      setIsCtrl(!isCtrl);
    } else if (key === 'Left') {
      onKeyPress('ArrowLeft', { select: isSelect, ctrl: isCtrl });
    } else if (key === 'Right') {
      onKeyPress('ArrowRight', { select: isSelect, ctrl: isCtrl });
    } else if (key === 'Up') {
      onKeyPress('ArrowUp', { select: isSelect, ctrl: isCtrl });
    } else if (key === 'Down') {
      onKeyPress('ArrowDown', { select: isSelect, ctrl: isCtrl });
    } else {
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

    // Adjusted trackpad threshold for smoother, responsive dragging
    const THRESHOLD = 10;
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
    <div 
      className={`p-2 pb-3 w-full flex flex-col gap-2 ${isDark ? 'bg-[#2C2C2E]' : 'bg-[#E5E5EA]'} border-t ${isDark ? 'border-[#3A3A3C]' : 'border-[#D1D1D6]'} select-none touch-none`}
      style={{ touchAction: 'none' }}
    >
      
      {/* Dynamic Header Toolbar */}
      <div className="flex items-center justify-between px-1 gap-3 h-11 shrink-0 select-none">
        {/* DRAG CURSOR Trackpad */}
        <div 
          className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-xl shadow-xs touch-none text-[10px] font-bold tracking-widest cursor-col-resize transition-all duration-200
          ${isDark ? 'bg-[#1C1C1E] text-gray-400 active:bg-[#121214] active:text-white border border-[#3A3A3C]' : 'bg-white text-gray-500 active:bg-gray-100 active:text-gray-800 border border-slate-200/60'}`}
          onPointerDown={handleTrackpadDown}
          onPointerMove={handleTrackpadMove}
          onPointerUp={handleTrackpadUp}
          onPointerCancel={handleTrackpadUp}
        >
          <ChevronLeft size={12} className="opacity-60 animate-pulse" />
          <TextCursorInput size={13} className="opacity-80" />
          <span className="uppercase text-[9px] tracking-widest">DRAG TRACKPAD FOR CURSOR</span>
          <ChevronRight size={12} className="opacity-60 animate-pulse" />
        </div>
      </div>

      {/* Button Layout Grid - Optimized Gaps and Padding */}
      <div className="flex flex-col gap-1.5 w-full max-w-3xl mx-auto">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1.5 justify-center w-full">
             {row.map((key, keyIndex) => {
               const displayKey = getDisplayKey(key);
               const isSpecial = ['Backspace', 'Tab', 'Caps', 'Enter', 'Shift', 'Ctrl', 'Select', 'Left', 'Right', 'Up', 'Down'].includes(key);
               
               // Render specialized custom formatting keys
               const renderKeyContent = () => {
                 if (key === 'Backspace') return <Delete size={17} className="opacity-90" />;
                 if (key === 'Enter') return <CornerDownLeft size={15} className="opacity-90" />;
                 if (key === 'Left') return <ChevronLeft size={16} />;
                 if (key === 'Right') return <ChevronRight size={16} />;
                 if (key === 'Up') return <ChevronUp size={16} />;
                 if (key === 'Down') return <ChevronDown size={16} />;
                 if (key === 'Shift') return 'SHIFT';
                 if (key === 'Space') return 'SPACE';
                 if (key === 'Ctrl') return 'CTRL';
                 if (key === 'Select') return 'SEL';
                 if (key === '**') return <span className="font-extrabold text-sm">B</span>;
                 if (key === '*') return <span className="italic font-serif font-bold text-sm">I</span>;
                 return displayKey;
               };

               return (
                 <button
                   key={`${rowIndex}-${keyIndex}`}
                   onPointerDown={(e) => handlePointerDown(e, key)}
                   onClick={(e) => e.preventDefault()}
                   className={`
                     flex items-center justify-center rounded-xl select-none transition-all duration-75 shadow-xs
                     active:translate-y-[1.5px] active:shadow-inner active:brightness-95
                     ${isDark 
                       ? 'bg-[#505054] text-white active:bg-[#3E3E42] border-b-2 border-[#1C1C1E] active:border-b-0' 
                       : (isSpecial 
                           ? 'bg-[#B0B0B8] text-slate-900 active:bg-[#909098] border-b-2 border-[#8E8E93] active:border-b-0' 
                           : 'bg-white text-slate-900 active:bg-[#E5E5EA] border-b-2 border-slate-300 shadow-xs active:border-b-0')
                     }
                     ${key === 'Space' 
                       ? 'flex-[3.5] h-12 min-w-[120px]' 
                       : 'h-12 flex-1 min-w-0'
                     }
                     ${isSpecial ? (['Left', 'Right', 'Up', 'Down', 'Ctrl', 'Select'].includes(key) ? 'flex-[1.1]' : 'flex-[1.25]') : ''}
                     ${isSpecial ? 'text-[10px] sm:text-[11px] font-bold tracking-tight' : 'text-[15px] font-semibold'}
                     ${key === 'Shift' && isShift ? (isDark ? 'bg-amber-600 border-b-0 translate-y-[1.5px]' : 'bg-amber-500 border-b-0 translate-y-[1.5px] text-white') : ''}
                     ${key === 'Caps' && isCaps ? (isDark ? 'bg-amber-600 border-b-0 translate-y-[1.5px]' : 'bg-amber-500 border-b-0 translate-y-[1.5px] text-white') : ''}
                     ${key === 'Ctrl' && isCtrl ? (isDark ? 'bg-blue-600 border-b-0 translate-y-[1.5px]' : 'bg-blue-500 border-b-0 translate-y-[1.5px] text-white') : ''}
                     ${key === 'Select' && isSelect ? (isDark ? 'bg-indigo-600 border-b-0 translate-y-[1.5px]' : 'bg-indigo-500 border-b-0 translate-y-[1.5px] text-white') : ''}
                   `}
                 >
                   {renderKeyContent()}
                 </button>
               )
             })}
          </div>
        ))}
      </div>
    </div>
  );
});
VirtualKeyboard.displayName = 'VirtualKeyboard';
