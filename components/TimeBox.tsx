
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TimeBoxData } from '../types';
import XIcon from './icons/XIcon';
import { HIGHLIGHTER_COLORS } from '../hooks/useFirestoreNotes';

interface TimeBoxProps {
  data: TimeBoxData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateEntry: (hour: number, slot: 1 | 2, text: string) => void;
  onUpdateColors: (colors: Record<string, string>) => void;
  currentDate: string;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
}

const TimeBox: React.FC<TimeBoxProps> = ({ 
  data, 
  isOpen, 
  onClose, 
  onUpdateEntry, 
  onUpdateColors,
  currentDate,
  onMouseDown,
  onTouchStart
}) => {
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartKey, setDragStartKey] = useState<string | null>(null);
  
  // hours array adjusted to remove 24 (length 17 = 7 to 23)
  const hours = useMemo(() => Array.from({ length: 17 }, (_, i) => i + 7), []);

  const getSlotValue = (key: string) => {
    const [h, s] = key.split('-').map(Number);
    return h * 2 + s;
  };

  const handleSlotMouseDown = (hour: number, slot: 1 | 2) => {
    const key = `${hour}-${slot}`;
    setIsDragging(true);
    setDragStartKey(key);
    setSelectedSlots([key]);
  };

  const handleSlotMouseEnter = (hour: number, slot: 1 | 2) => {
    if (!isDragging || !dragStartKey) return;
    
    const currentKey = `${hour}-${slot}`;
    const startVal = getSlotValue(dragStartKey);
    const endVal = getSlotValue(currentKey);
    
    const min = Math.min(startVal, endVal);
    const max = Math.max(startVal, endVal);
    
    const newRange: string[] = [];
    hours.forEach(h => {
      [1, 2].forEach(s => {
        const val = h * 2 + s;
        if (val >= min && val <= max) {
          newRange.push(`${h}-${s}`);
        }
      });
    });
    
    setSelectedSlots(newRange);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDragStartKey(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  if (!isOpen) return null;

  const position = data?.position || { x: 100, y: 100 };

  const applyColor = (colorClass: string) => {
    if (selectedSlots.length === 0) return;
    const newColors = { ...(data?.colors || {}) };
    selectedSlots.forEach(key => {
      newColors[key] = colorClass;
    });
    onUpdateColors(newColors);
    setSelectedSlots([]);
  };

  return (
    <div 
      id="timebox-window"
      className="fixed z-20 w-80 sm:w-[550px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-200 select-none"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* Header */}
      <div 
        className="flex justify-between items-center p-5 border-b bg-slate-50"
      >
        <div 
          className="flex-grow cursor-grab active:cursor-grabbing"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          <h2 className="text-2xl font-black tracking-tighter uppercase italic text-slate-800 leading-none">Daily Planner</h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{currentDate}</p>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors flex-shrink-0"
        >
          <XIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Highlighter Toolbar */}
      <div className="bg-slate-950 p-4 flex items-center justify-between shadow-2xl">
         <div className="flex gap-4 items-center">
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Highlighter</span>
           <div className="flex gap-2.5">
             {HIGHLIGHTER_COLORS.map(c => (
               <button 
                key={c.name}
                onClick={() => applyColor(c.class)}
                disabled={selectedSlots.length === 0}
                className={`w-10 h-10 rounded-full border-2 border-slate-800 shadow-lg ${c.class || 'bg-white'} hover:scale-110 active:scale-95 transition-all disabled:opacity-20 disabled:scale-90 disabled:cursor-not-allowed group relative flex items-center justify-center`}
               >
                 {c.class === '' && <XIcon className="w-4 h-4 text-slate-400" />}
                 {selectedSlots.length > 0 && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900"></div>}
               </button>
             ))}
           </div>
         </div>
         {selectedSlots.length > 0 && (
           <button 
             onClick={() => setSelectedSlots([])}
             className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] px-4 py-2 rounded-lg font-black uppercase tracking-tighter transition-all"
           >
             Clear Selection ({selectedSlots.length})
           </button>
         )}
      </div>

      {/* Time Grid */}
      <div className="flex-grow overflow-y-auto p-5 bg-white custom-scrollbar">
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-slate-50/20">
          <div className="flex bg-slate-100 border-b border-slate-200 text-[11px] font-black uppercase tracking-[0.15em]">
             <div className="w-24 flex-shrink-0 text-center py-4 border-r border-slate-200 text-black">Time</div>
             <div className="flex-grow text-center py-4 text-slate-400">Schedule & Tasks</div>
          </div>
          
          <div className="relative">
            {hours.map((hour) => (
              <TimeBoxRow 
                key={hour}
                hour={hour}
                data={data}
                handleSlotMouseDown={handleSlotMouseDown}
                handleSlotMouseEnter={handleSlotMouseEnter}
                selectedSlots={selectedSlots}
                onUpdateEntry={onUpdateEntry}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

const TimeBoxRow: React.FC<{
  hour: number;
  data: TimeBoxData | null;
  handleSlotMouseDown: (h: number, s: 1 | 2) => void;
  handleSlotMouseEnter: (h: number, s: 1 | 2) => void;
  selectedSlots: string[];
  onUpdateEntry: (h: number, s: 1 | 2, t: string) => void;
}> = ({ hour, data, handleSlotMouseDown, handleSlotMouseEnter, selectedSlots, onUpdateEntry }) => {
  return (
    <div className="flex border-b border-slate-100 last:border-b-0 min-h-[64px]">
      <div className="w-24 flex-shrink-0 flex items-center justify-center font-black text-black border-r border-slate-200 bg-slate-50/50 text-lg select-none">
        {hour.toString().padStart(2, '0')}
      </div>
      <div className="flex flex-grow relative">
        {[1, 2].map((s) => {
          const slot = s as 1 | 2;
          const key = `${hour}-${slot}`;
          const isSelected = selectedSlots.includes(key);
          const bgColor = data?.colors[key] || 'bg-transparent';
          const val = data?.entries[hour.toString()]?.[`slot${slot}` as 'slot1' | 'slot2'] || '';

          return (
            <div 
              key={key}
              onMouseDown={() => handleSlotMouseDown(hour, slot)}
              onMouseEnter={() => handleSlotMouseEnter(hour, slot)}
              className={`w-1/2 relative transition-all flex items-stretch
                ${isSelected ? 'ring-2 ring-blue-500 z-10 bg-blue-50/60 shadow-inner' : bgColor}
                ${slot === 1 ? 'border-r border-dotted border-slate-200' : ''}
                hover:bg-slate-50/40 cursor-text
              `}
            >
              <OptimizedInput 
                initialValue={val}
                onUpdate={(newVal) => onUpdateEntry(hour, slot, newVal)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OptimizedInput: React.FC<{ initialValue: string, onUpdate: (val: string) => void }> = ({ initialValue, onUpdate }) => {
  const [val, setVal] = useState(initialValue);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (!isInternalChange.current) setVal(initialValue);
    isInternalChange.current = false;
  }, [initialValue]);

  return (
    <input
      type="text"
      className="w-full h-full px-5 py-4 bg-transparent focus:outline-none placeholder-slate-200 font-bold text-slate-800 text-[16px] pointer-events-auto cursor-text block leading-normal border-none outline-none"
      value={val}
      onChange={(e) => {
        isInternalChange.current = true;
        setVal(e.target.value);
      }}
      onBlur={() => {
        if (val !== initialValue) {
          onUpdate(val);
        }
      }}
      placeholder="..."
    />
  );
};

export default TimeBox;
