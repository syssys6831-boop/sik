
import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebaseConfig';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
  writeBatch,
  FirestoreError
} from 'firebase/firestore';
import { Note, StoredFile, TimeBoxData, Todo } from '../types';
import { getLocalDateString } from '../utils/dateUtils';
import { DEFAULT_NOTE_SIZE, DEFAULT_NOTE_POSITION_OFFSET } from '../utils/constants';

export const NOTE_COLORS = [
  'bg-amber-200 text-amber-900',
  'bg-sky-200 text-sky-900',
  'bg-emerald-200 text-emerald-900',
  'bg-rose-200 text-rose-900',
  'bg-violet-200 text-violet-900',
];

export const HIGHLIGHTER_COLORS = [
  { name: 'None', class: '' },
  { name: 'Yellow', class: 'bg-yellow-100/80' },
  { name: 'Pink', class: 'bg-rose-100/80' },
  { name: 'Blue', class: 'bg-sky-100/80' },
  { name: 'Green', class: 'bg-emerald-100/80' },
];

const notesCollectionRef = collection(db, 'notes');
const filesCollectionRef = collection(db, 'files');
const todosCollectionRef = collection(db, 'todos');

/**
 * Firebase 에러를 사용자 친화적인 메시지로 변환
 */
const handleFirestoreError = (error: FirestoreError, operation: string): void => {
  console.error(`Firestore ${operation} error:`, error);
  
  // 에러 타입에 따른 처리
  switch (error.code) {
    case 'permission-denied':
      console.error('Firebase 권한이 거부되었습니다. Firebase 설정을 확인해주세요.');
      break;
    case 'unavailable':
      console.error('Firebase 서비스가 일시적으로 사용할 수 없습니다. 네트워크 연결을 확인해주세요.');
      break;
    default:
      console.error(`Firebase 오류 발생: ${error.message}`);
  }
};

export const useFirestoreNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [timeBox, setTimeBox] = useState<TimeBoxData | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todayStr, setTodayStr] = useState(getLocalDateString());
  const [todoBoxPos, setTodoBoxPos] = useState({ x: 50, y: 150 });
  const [todoBoxSize, setTodoBoxSize] = useState({ height: 500 });
  
  // 로딩 및 에러 상태
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update todayStr at midnight
  useEffect(() => {
    const timer = setInterval(() => {
      const nowStr = getLocalDateString();
      if (nowStr !== todayStr) setTodayStr(nowStr);
    }, 1000 * 60);
    return () => clearInterval(timer);
  }, [todayStr]);

  // Unified Subscription for Settings
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'todoBox'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.position) setTodoBoxPos(data.position);
        if (data.size) setTodoBoxSize(data.size);
      }
    });
    return () => unsubscribe();
  }, []);

  // Notes Subscription
  useEffect(() => {
    const q = query(notesCollectionRef, orderBy('lastEdited', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
        setIsLoading(false);
        setError(null);
      },
      (error) => {
        handleFirestoreError(error, 'notes subscription');
        setError('노트를 불러오는 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    );
  }, []);

  // Files Subscription
  useEffect(() => {
    const q = query(filesCollectionRef, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        setFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoredFile)));
      },
      (error) => {
        handleFirestoreError(error, 'files subscription');
      }
    );
  }, []);

  // TimeBox Subscription
  useEffect(() => {
    const docRef = doc(db, 'timeboxes', todayStr);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTimeBox({ id: docSnap.id, ...data } as TimeBoxData);
        } else {
          setTimeBox({ id: todayStr, entries: {}, colors: {}, position: { x: window.innerWidth - 600, y: 100 } });
        }
      },
      (error) => {
        handleFirestoreError(error, 'timebox subscription');
      }
    );
  }, [todayStr]);

  // Todo List Subscription with Optimized Rollover and Completion-aware Sorting
  useEffect(() => {
    // We query by order initially, but we will re-sort in the client to ensure completed items stay at the bottom
    const q = query(todosCollectionRef, orderBy('order', 'asc'));
    return onSnapshot(
      q,
      async (snapshot) => {
        try {
          const allTodos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Todo));
          const rolloverBatch = writeBatch(db);
          let hasChanges = false;

          allTodos.forEach(todo => {
            if (todo.lastDate !== todayStr) {
              if (todo.fixed) {
                rolloverBatch.update(doc(db, 'todos', todo.id), { completed: false, lastDate: todayStr });
                hasChanges = true;
              } else if (!todo.completed) {
                rolloverBatch.update(doc(db, 'todos', todo.id), { lastDate: todayStr });
                hasChanges = true;
              }
            }
          });

          if (hasChanges) {
            await rolloverBatch.commit();
          } else {
            // FILTER: Keep only today's or fixed todos
            const currentTodos = allTodos.filter(t => t.lastDate === todayStr || t.fixed);
            
            // SORT: Completed items to the bottom, then by order
            const sortedTodos = [...currentTodos].sort((a, b) => {
              if (a.completed !== b.completed) {
                return a.completed ? 1 : -1; // completed (true) goes to the end (1)
              }
              return (a.order || 0) - (b.order || 0);
            });
            
            setTodos(sortedTodos);
          }
        } catch (error) {
          handleFirestoreError(error as FirestoreError, 'todos processing');
        }
      },
      (error) => {
        handleFirestoreError(error, 'todos subscription');
      }
    );
  }, [todayStr]);

  const addTodo = useCallback(async (text: string) => {
    if (!text.trim()) return;
    try {
      // Get max order among uncompleted todos to put the new item at the end of the "active" section
      const activeTodos = todos.filter(t => !t.completed);
      const maxOrder = activeTodos.length > 0 ? Math.max(...activeTodos.map(t => t.order || 0)) : 0;
      
      await addDoc(todosCollectionRef, {
        text,
        completed: false,
        fixed: false,
        lastDate: todayStr,
        createdAt: serverTimestamp(),
        order: maxOrder + 1
      });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'add todo');
    }
  }, [todayStr, todos]);

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    try {
      await updateDoc(doc(db, 'todos', id), { completed });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'toggle todo');
    }
  }, []);

  const toggleFixedTodo = useCallback(async (id: string, fixed: boolean) => {
    try {
      await updateDoc(doc(db, 'todos', id), { fixed });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'toggle fixed todo');
    }
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'todos', id));
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'delete todo');
    }
  }, []);

  const updateTodoPosition = useCallback(async (pos: { x: number, y: number }) => {
    try {
      await setDoc(doc(db, 'settings', 'todoBox'), { position: pos }, { merge: true });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update todo position');
    }
  }, []);

  const updateTodoBoxSize = useCallback(async (size: { height: number }) => {
    try {
      await setDoc(doc(db, 'settings', 'todoBox'), { size }, { merge: true });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update todo box size');
    }
  }, []);

  const updateTodoOrder = useCallback(async (reorderedTodos: Todo[]) => {
    const batch = writeBatch(db);
    // When reordering, we update the global 'order' field based on the new visual positions
    reorderedTodos.forEach((todo, index) => {
      const todoRef = doc(db, 'todos', todo.id);
      batch.update(todoRef, { order: index });
    });
    await batch.commit();
  }, []);

  const updateTimeBoxEntry = useCallback(async (hour: number, slot: 1 | 2, text: string) => {
    try {
      const docRef = doc(db, 'timeboxes', todayStr);
      const hourKey = hour.toString();
      const snap = await getDoc(docRef);
      const data = (snap.exists() ? snap.data() : { entries: {} }) as any;
      const entry = data.entries?.[hourKey] || { slot1: '', slot2: '' };
      const newEntries = { ...data.entries, [hourKey]: { ...entry, [`slot${slot}`]: text } };
      await setDoc(docRef, { entries: newEntries }, { merge: true });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update timebox entry');
    }
  }, [todayStr]);

  const updateTimeBoxPosition = useCallback(async (pos: { x: number, y: number }) => {
    try {
      await setDoc(doc(db, 'timeboxes', todayStr), { position: pos }, { merge: true });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update timebox position');
    }
  }, [todayStr]);

  const updateTimeBoxColors = useCallback(async (colors: Record<string, string>) => {
    try {
      await setDoc(doc(db, 'timeboxes', todayStr), { colors }, { merge: true });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update timebox colors');
    }
  }, [todayStr]);

  const addNote = useCallback(async () => {
    try {
      await addDoc(notesCollectionRef, {
        content: '',
        color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
        position: {
          x: DEFAULT_NOTE_POSITION_OFFSET.x + Math.random() * DEFAULT_NOTE_POSITION_OFFSET.randomRange,
          y: DEFAULT_NOTE_POSITION_OFFSET.y + Math.random() * DEFAULT_NOTE_POSITION_OFFSET.randomRange
        },
        size: DEFAULT_NOTE_SIZE,
        status: 'active',
        createdAt: serverTimestamp(),
        lastEdited: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'add note');
      throw error;
    }
  }, []);

  const updateNoteContent = useCallback(async (id: string, content: string) => {
    try {
      await updateDoc(doc(db, 'notes', id), { content, lastEdited: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update note content');
    }
  }, []);

  const updateNotePosition = useCallback(async (id: string, position: { x: number; y: number }) => {
    try {
      await updateDoc(doc(db, 'notes', id), { position });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update note position');
    }
  }, []);

  const updateNoteSize = useCallback(async (id: string, size: { width: number; height: number }) => {
    try {
      await updateDoc(doc(db, 'notes', id), { size, lastEdited: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update note size');
    }
  }, []);

  const updateNoteColor = useCallback(async (id: string, color: string) => {
    try {
      await updateDoc(doc(db, 'notes', id), { color, lastEdited: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update note color');
    }
  }, []);

  const updateNoteStatus = useCallback(async (id: string, status: any) => {
    try {
      await updateDoc(doc(db, 'notes', id), { status, lastEdited: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update note status');
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notes', id));
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'delete note');
    }
  }, []);

  const bringToFront = useCallback(async (id: string) => {
    try {
      await updateDoc(doc(db, 'notes', id), { status: 'active', lastEdited: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'bring note to front');
    }
  }, []);

  const addFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        try {
          await addDoc(filesCollectionRef, {
            name: file.name,
            type: file.type,
            dataUrl: e.target.result,
            size: file.size,
            createdAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error as FirestoreError, 'add file');
        }
      }
    };
    reader.onerror = () => {
      console.error('파일 읽기 오류가 발생했습니다.');
    };
    reader.readAsDataURL(file);
  }, []);

  const deleteFile = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'files', id));
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'delete file');
    }
  }, []);

  return { 
    notes, files, timeBox, todos, todayStr, todoBoxPos, todoBoxSize,
    isLoading, error,
    addNote, updateNoteContent, updateNotePosition, updateNoteSize, updateNoteColor, updateNoteStatus, deleteNote, bringToFront,
    addFile, deleteFile,
    updateTimeBoxEntry, updateTimeBoxPosition, updateTimeBoxColors,
    addTodo, toggleTodo, toggleFixedTodo, deleteTodo, updateTodoPosition, updateTodoBoxSize, updateTodoOrder
  };
};
