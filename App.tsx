import React, { useState, useCallback } from 'react';
import { useFirestoreNotes } from './hooks/useFirestoreNotes';
import { useDrag } from './hooks/useDrag';
import { setWindowFocus } from './utils/domUtils';
import { formatDateString } from './utils/dateUtils';
import NoteCard from './components/NoteCard';
import PlusIcon from './components/icons/PlusIcon';
import ListIcon from './components/icons/ListIcon';
import ClockIcon from './components/icons/ClockIcon';
import CheckIcon from './components/icons/CheckIcon';
import NoteList from './components/NoteList';
import TimeBox from './components/TimeBox';
import TodoBox from './components/TodoBox';

const App: React.FC = () => {
  const { 
    notes, files, timeBox, todos, todayStr, todoBoxPos, todoBoxSize,
    isLoading, error,
    addNote, updateNoteContent, updateNotePosition, updateNoteSize, updateNoteColor, updateNoteStatus, deleteNote, bringToFront,
    addFile, deleteFile,
    updateTimeBoxEntry, updateTimeBoxPosition, updateTimeBoxColors,
    addTodo, toggleTodo, toggleFixedTodo, deleteTodo, updateTodoPosition, updateTodoBoxSize, updateTodoOrder
  } = useFirestoreNotes();

  const [isNoteListOpen, setIsNoteListOpen] = useState(false);
  const [isTimeBoxOpen, setIsTimeBoxOpen] = useState(false);
  const [isTodoBoxOpen, setIsTodoBoxOpen] = useState(false);

  // 드래그 훅 사용
  const { startDragging } = useDrag({
    onNoteDragEnd: updateNotePosition,
    onNoteResizeEnd: updateNoteSize,
    onTimeBoxDragEnd: updateTimeBoxPosition,
    onTodoBoxDragEnd: updateTodoPosition,
    onTodoBoxResizeEnd: updateTodoBoxSize,
    onBringToFront: bringToFront,
  });

  const handleNoteSelect = useCallback((id: string) => {
    bringToFront(id);
    setWindowFocus(id);
  }, [bringToFront]);

  return (
    <main className="h-screen w-full overflow-hidden bg-[#0f172a] relative">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e293b_0%,#0f172a_100%)]"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
      
      {/* 에러 메시지 표시 */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-[200]">
          {error}
        </div>
      )}

      {/* 로딩 상태 표시 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
          <div className="bg-slate-800 text-white px-8 py-4 rounded-lg">
            데이터를 불러오는 중...
          </div>
        </div>
      )}

      <NoteList
        notes={notes} files={files} isOpen={isNoteListOpen} onClose={() => setIsNoteListOpen(false)}
        onNoteSelect={handleNoteSelect} onDeletePermanent={deleteNote} onAddFile={addFile} onDeleteFile={deleteFile}
      />

      <TimeBox 
        data={timeBox} isOpen={isTimeBoxOpen} onClose={() => setIsTimeBoxOpen(false)}
        onUpdateEntry={updateTimeBoxEntry} onUpdateColors={updateTimeBoxColors} currentDate={todayStr}
        onMouseDown={(e) => startDragging(e, 'time')} onTouchStart={() => {}} 
      />

      <TodoBox 
        todos={todos} isOpen={isTodoBoxOpen} onClose={() => setIsTodoBoxOpen(false)}
        onAddTodo={addTodo} onToggleTodo={toggleTodo} onToggleFixed={toggleFixedTodo} onDeleteTodo={deleteTodo} onUpdateOrder={updateTodoOrder}
        position={todoBoxPos} size={todoBoxSize} 
        onMouseDown={(e) => startDragging(e, 'todo')} 
        onResizeStart={(e) => startDragging(e, 'todoResize')} 
        onTouchStart={() => {}} currentDate={todayStr}
      />

      {/* Decorative Title */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center w-full px-4 z-0 pointer-events-none select-none opacity-20">
        <h1 className="text-7xl font-black text-white tracking-tighter uppercase italic drop-shadow-2xl">WORKSPACE</h1>
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="h-[1px] w-20 bg-white/20"></div>
          <p className="text-white text-xs font-bold tracking-[0.8em] uppercase">{formatDateString(todayStr)}</p>
          <div className="h-[1px] w-20 bg-white/20"></div>
        </div>
      </div>

      {/* Note Cards */}
      {notes.filter(n => n.status === 'active').map((note) => (
          <NoteCard
            key={note.id} note={note} onContentChange={updateNoteContent} onMinimize={(id) => updateNoteStatus(id, 'minimized')} onStatusChange={updateNoteStatus}
            onMouseDown={(id, e) => startDragging(e, 'note', id)} onTouchStart={() => {}} 
            onResizeStart={(id, e) => startDragging(e as any, 'resize', id)} 
            onColorChange={updateNoteColor}
          />
      ))}
      
      {/* Floating Action Menu */}
      <div className="fixed bottom-10 right-10 flex flex-col items-center gap-5 z-[100]">
        <div className="flex flex-col gap-3 group">
          <button
            onClick={() => { setIsTodoBoxOpen(p => !p); if (!isTodoBoxOpen) setTimeout(() => setWindowFocus('todobox'), 100); }}
            className={`w-14 h-14 text-white rounded-2xl shadow-xl transition-all duration-500 hover:rotate-6 flex items-center justify-center ${isTodoBoxOpen ? 'bg-emerald-500 scale-110 shadow-emerald-500/40 ring-4 ring-emerald-500/20' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            <CheckIcon className="w-7 h-7" />
          </button>

          <button
            onClick={() => { setIsTimeBoxOpen(p => !p); if (!isTimeBoxOpen) setTimeout(() => setWindowFocus('timebox'), 100); }}
            className={`w-14 h-14 text-white rounded-2xl shadow-xl transition-all duration-500 hover:-rotate-6 flex items-center justify-center ${isTimeBoxOpen ? 'bg-sky-500 scale-110 shadow-sky-500/40 ring-4 ring-sky-500/20' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            <ClockIcon className="w-7 h-7" />
          </button>

          <button 
            onClick={() => setIsNoteListOpen(true)} 
            className="w-14 h-14 bg-slate-800 text-white rounded-2xl shadow-xl hover:bg-slate-700 transition-all flex items-center justify-center hover:scale-110"
          >
            <ListIcon className="w-7 h-7" />
          </button>

          <button 
            onClick={addNote} 
            className="w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-2xl hover:bg-blue-500 transition-all flex items-center justify-center hover:scale-110 active:scale-95 group ring-8 ring-blue-600/10"
          >
            <PlusIcon className="w-10 h-10 group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>
      </div>
    </main>
  );
};

export default App;
