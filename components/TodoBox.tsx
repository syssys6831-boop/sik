
import React, { useState } from 'react';
import { Todo } from '../types';
import XIcon from './icons/XIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import PinIcon from './icons/PinIcon';
import CheckIcon from './icons/CheckIcon';

interface TodoBoxProps {
  todos: Todo[];
  isOpen: boolean;
  onClose: () => void;
  onAddTodo: (text: string) => void;
  onToggleTodo: (id: string, completed: boolean) => void;
  onToggleFixed: (id: string, fixed: boolean) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateOrder: (reorderedTodos: Todo[]) => void;
  position: { x: number, y: number };
  size: { height: number };
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onResizeStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  currentDate: string;
}

const TodoBox: React.FC<TodoBoxProps> = ({
  todos, isOpen, onClose, onAddTodo, onToggleTodo, onToggleFixed, onDeleteTodo, onUpdateOrder,
  position, size, onMouseDown, onResizeStart, onTouchStart, currentDate
}) => {
  const [newTodo, setNewTodo] = useState('');
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      onAddTodo(newTodo);
      setNewTodo('');
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => {
        target.classList.add('opacity-40');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItemIndex(null);
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('opacity-40');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    // Boundary check: prevent dragging across completion status if preferred,
    // but here we allow it and the sorting logic will handle it.
    const newTodos = [...todos];
    const draggedItem = newTodos[draggedItemIndex];
    newTodos.splice(draggedItemIndex, 1);
    newTodos.splice(index, 0, draggedItem);
    
    setDraggedItemIndex(index);
    onUpdateOrder(newTodos);
  };

  // Grouping for visual separation (optional, but requested checked items to the bottom)
  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <div
      id="todobox-window"
      className="fixed z-20 w-80 sm:w-[400px] glass-morphism rounded-[24px] shadow-2xl flex flex-col overflow-hidden select-none transition-shadow duration-300 hover:shadow-emerald-500/10"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        height: `${size.height}px`
      }}
    >
      {/* Header */}
      <div 
        className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-emerald-50/30 cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div>
          <h2 className="text-xl font-black tracking-tight text-emerald-900 leading-none flex items-center gap-2">
            DAILY TASKS
          </h2>
          <p className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-widest mt-1.5">{currentDate}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-emerald-100 text-emerald-400 transition-all hover:scale-105 active:scale-95">
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Input Section */}
      <div className="p-5 pb-2">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-grow group">
            <input 
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="오늘 무엇을 할까요?"
              className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-300 transition-all placeholder-slate-300"
            />
          </div>
          <button 
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-90 hover:scale-105"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        </form>
      </div>

      {/* List Section */}
      <div className="flex-grow overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
        {todos.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center opacity-30">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
               <PlusIcon className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Your list is empty</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Active Todos */}
            {todos.map((todo, index) => (
              <div 
                key={todo.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                className={`group flex items-center gap-4 p-4 rounded-2xl transition-all border cursor-move ${
                  todo.completed 
                  ? 'bg-slate-50 border-transparent opacity-60 grayscale' 
                  : todo.fixed 
                    ? 'bg-amber-50/50 border-amber-100 shadow-sm' 
                    : 'bg-white border-slate-100 shadow-sm hover:border-emerald-200'
                } ${draggedItemIndex === index ? 'ring-2 ring-emerald-400 scale-[0.98]' : ''}`}
              >
                {/* Checkbox */}
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleTodo(todo.id, !todo.completed); }}
                  className={`w-7 h-7 flex-shrink-0 rounded-xl border-2 flex items-center justify-center transition-all ${
                    todo.completed 
                    ? 'bg-emerald-500 border-emerald-500 text-white scale-105' 
                    : 'border-slate-200 bg-white group-hover:border-emerald-400'
                  }`}
                >
                  {todo.completed && <CheckIcon className="w-4 h-4" />}
                </button>

                {/* Task Content - Read Only Span */}
                <div className="flex flex-col flex-grow min-w-0 pointer-events-none">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className={`font-bold text-[15px] text-slate-800 break-words leading-tight ${
                      todo.completed ? 'line-through text-slate-400 font-medium' : ''
                    }`}>
                      {todo.text}
                    </span>
                    
                    {todo.fixed && (
                      <span className="flex-shrink-0 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm shadow-amber-200">
                        DAILY
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleFixed(todo.id, !todo.fixed); }}
                    className={`p-2 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                      todo.fixed 
                      ? 'bg-amber-100 text-amber-600' 
                      : 'text-slate-300 hover:bg-slate-100 hover:text-amber-500'
                    }`}
                    title={todo.fixed ? "Remove Daily" : "Set Daily"}
                  >
                    <PinIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteTodo(todo.id); }}
                    className="p-2 rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-all hover:scale-110 active:scale-95"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {/* Completed Separator - Only show if both categories exist */}
            {activeTodos.length > 0 && completedTodos.length > 0 && (
              <div className="flex items-center gap-3 py-2 opacity-30 px-2">
                <div className="h-[1px] flex-grow bg-slate-300"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed</span>
                <div className="h-[1px] flex-grow bg-slate-300"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vertical Resize Handle */}
      <div 
        className="h-2 bg-slate-50/50 hover:bg-emerald-100 cursor-ns-resize transition-colors flex items-center justify-center gap-1 group/handle"
        onMouseDown={onResizeStart}
      >
        <div className="w-12 h-1 bg-slate-200 group-hover/handle:bg-emerald-400 rounded-full transition-all"></div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default TodoBox;
