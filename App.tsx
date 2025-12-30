import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { useFirestoreNotes } from './hooks/useFirestoreNotes';
import { useDrag } from './hooks/useDrag';
import { setWindowFocus } from './utils/domUtils';
import { formatDateString } from './utils/dateUtils';
import LoginScreen from './components/LoginScreen';
import NoteCard from './components/NoteCard';
import PlusIcon from './components/icons/PlusIcon';
import ListIcon from './components/icons/ListIcon';
import ClockIcon from './components/icons/ClockIcon';
import CheckIcon from './components/icons/CheckIcon';
import NoteList from './components/NoteList';
import TimeBox from './components/TimeBox';
import TodoBox from './components/TodoBox';

const App: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();
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
  const [isAddingNote, setIsAddingNote] = useState(false);
  const previousNotesCountRef = useRef(0);

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

  const handleAddNote = useCallback(async () => {
    if (isAddingNote) return; // 중복 클릭 방지
    
    setIsAddingNote(true);
    try {
      await addNote();
    } catch (err) {
      console.error('노트 추가 실패:', err);
      // 에러는 useFirestoreNotes의 error 상태로 처리됨
    } finally {
      setIsAddingNote(false);
    }
  }, [addNote, isAddingNote]);

  // 새 노트가 생성되면 자동으로 맨 위로 올리기
  useEffect(() => {
    const activeNotes = notes.filter(n => n.status === 'active');
    const currentCount = activeNotes.length;
    
    // 노트가 새로 추가되었을 때 (개수가 증가했을 때)
    if (currentCount > previousNotesCountRef.current && currentCount > 0) {
      // lastEdited 기준으로 정렬하여 가장 최신 노트 찾기
      const sortedNotes = [...activeNotes].sort((a, b) => {
        const aTime = a.lastEdited?.toMillis() || a.createdAt?.toMillis() || 0;
        const bTime = b.lastEdited?.toMillis() || b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });
      if (sortedNotes[0]) {
        // 약간의 지연을 두어 DOM이 업데이트된 후 z-index 조정
        setTimeout(() => {
          setWindowFocus(sortedNotes[0].id);
        }, 50);
      }
    }
    
    previousNotesCountRef.current = currentCount;
  }, [notes]);

  // 로그인하지 않은 경우 로그인 화면 표시
  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0f172a]">
        <div className="text-white text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

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
      {notes
        .filter(n => n.status === 'active')
        .sort((a, b) => {
          // lastEdited 기준으로 내림차순 정렬 (최신 것이 나중에 렌더링되어 z-index가 높아짐)
          const aTime = a.lastEdited?.toMillis() || a.createdAt?.toMillis() || 0;
          const bTime = b.lastEdited?.toMillis() || b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        })
        .map((note) => (
          <NoteCard
            key={note.id} note={note} onContentChange={updateNoteContent} onMinimize={(id) => updateNoteStatus(id, 'minimized')} onStatusChange={updateNoteStatus}
            onMouseDown={(id, e) => {
              bringToFront(id);
              setWindowFocus(id);
              startDragging(e, 'note', id);
            }} 
            onTouchStart={() => {}} 
            onResizeStart={(id, e) => {
              bringToFront(id);
              setWindowFocus(id);
              startDragging(e as any, 'resize', id);
            }} 
            onColorChange={updateNoteColor}
          />
      ))}
      
      {/* User Info & Logout */}
      <div className="fixed top-4 right-4 z-[100] flex items-center gap-3">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-3 border border-slate-700/50">
          {user.photoURL && (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'User'} 
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-white text-sm font-medium">
            {user.displayName || user.email}
          </span>
          <button
            onClick={logout}
            className="text-slate-400 hover:text-white text-sm px-3 py-1 rounded hover:bg-slate-700 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>

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
            onClick={handleAddNote}
            disabled={isAddingNote}
            className={`w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-2xl hover:bg-blue-500 transition-all flex items-center justify-center hover:scale-110 active:scale-95 group ring-8 ring-blue-600/10 ${isAddingNote ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isAddingNote ? (
              <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <PlusIcon className="w-10 h-10 group-hover:rotate-90 transition-transform duration-500" />
            )}
          </button>
        </div>
      </div>
    </main>
  );
};

export default App;
