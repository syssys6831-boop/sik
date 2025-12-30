
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
  where,
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

// Collection references (will be filtered by userId in queries)
const getNotesCollectionRef = () => collection(db, 'notes');
const getFilesCollectionRef = () => collection(db, 'files');
const getTodosCollectionRef = () => collection(db, 'todos');

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

export const useFirestoreNotes = (userId: string | null) => {
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

  // Unified Subscription for Settings (user-specific)
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    
    const settingsDocRef = doc(db, 'settings', `todoBox_${userId}`);
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.position) setTodoBoxPos(data.position);
        if (data.size) setTodoBoxSize(data.size);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  // Notes Subscription (user-specific)
  useEffect(() => {
    if (!userId) {
      setNotes([]);
      setIsLoading(false);
      return;
    }
    
    let unsubscribe: (() => void) | null = null;
    
    // 먼저 인덱스가 있는 쿼리 시도
    const q = query(
      getNotesCollectionRef(), 
      where('userId', '==', userId),
      orderBy('lastEdited', 'desc')
    );
    
    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
        setIsLoading(false);
        setError(null);
      },
      (error) => {
        // 인덱스 에러인 경우 fallback 쿼리 사용
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
          console.warn('인덱스가 없어 fallback 쿼리를 사용합니다. Firebase Console에서 인덱스를 생성해주세요.');
          // 인덱스 없이 쿼리 (클라이언트에서 정렬)
          const fallbackQ = query(
            getNotesCollectionRef(),
            where('userId', '==', userId)
          );
          unsubscribe = onSnapshot(
            fallbackQ,
            (snapshot) => {
              const notesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
              // 클라이언트에서 정렬
              notesData.sort((a, b) => {
                const aTime = a.lastEdited?.toMillis() || a.createdAt?.toMillis() || 0;
                const bTime = b.lastEdited?.toMillis() || b.createdAt?.toMillis() || 0;
                return bTime - aTime;
              });
              setNotes(notesData);
              setIsLoading(false);
              setError(null);
            },
            (fallbackError) => {
              handleFirestoreError(fallbackError, 'notes subscription (fallback)');
              setError(`노트를 불러오는 중 오류가 발생했습니다: ${fallbackError.message}`);
              setIsLoading(false);
            }
          );
        } else {
          handleFirestoreError(error, 'notes subscription');
          setError(`노트를 불러오는 중 오류가 발생했습니다: ${error.message}`);
          setIsLoading(false);
        }
      }
    );
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  // Files Subscription (user-specific)
  useEffect(() => {
    if (!userId) {
      setFiles([]);
      return;
    }
    
    let unsubscribe: (() => void) | null = null;
    
    const q = query(
      getFilesCollectionRef(), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoredFile)));
      },
      (error) => {
        // 인덱스 에러인 경우 fallback 쿼리 사용
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
          console.warn('인덱스가 없어 fallback 쿼리를 사용합니다.');
          const fallbackQ = query(
            getFilesCollectionRef(),
            where('userId', '==', userId)
          );
          unsubscribe = onSnapshot(
            fallbackQ,
            (snapshot) => {
              const filesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StoredFile));
              filesData.sort((a, b) => {
                const aTime = a.createdAt?.toMillis() || 0;
                const bTime = b.createdAt?.toMillis() || 0;
                return bTime - aTime;
              });
              setFiles(filesData);
            },
            (fallbackError) => {
              handleFirestoreError(fallbackError, 'files subscription (fallback)');
            }
          );
        } else {
          handleFirestoreError(error, 'files subscription');
        }
      }
    );
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  // TimeBox Subscription (user-specific)
  useEffect(() => {
    if (!userId) {
      setTimeBox(null);
      return;
    }
    
    const docRef = doc(db, 'timeboxes', `${userId}_${todayStr}`);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTimeBox({ id: docSnap.id, ...data } as TimeBoxData);
        } else {
          setTimeBox({ id: `${userId}_${todayStr}`, entries: {}, colors: {}, position: { x: window.innerWidth - 600, y: 100 } });
        }
      },
      (error) => {
        handleFirestoreError(error, 'timebox subscription');
      }
    );
  }, [todayStr, userId]);

  // Todo List Subscription with Optimized Rollover and Completion-aware Sorting (user-specific)
  useEffect(() => {
    if (!userId) {
      setTodos([]);
      return;
    }
    
    let unsubscribe: (() => void) | null = null;
    
    const processTodos = async (snapshot: any) => {
      try {
        const allTodos = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Todo));
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
    };
    
    // We query by order initially, but we will re-sort in the client to ensure completed items stay at the bottom
    const q = query(
      getTodosCollectionRef(), 
      where('userId', '==', userId),
      orderBy('order', 'asc')
    );
    
    unsubscribe = onSnapshot(
      q,
      processTodos,
      (error) => {
        // 인덱스 에러인 경우 fallback 쿼리 사용
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
          console.warn('인덱스가 없어 fallback 쿼리를 사용합니다.');
          const fallbackQ = query(
            getTodosCollectionRef(),
            where('userId', '==', userId)
          );
          unsubscribe = onSnapshot(
            fallbackQ,
            (snapshot) => {
              const allTodos = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Todo));
              // 클라이언트에서 필터링 및 정렬
              const currentTodos = allTodos.filter(t => t.lastDate === todayStr || t.fixed);
              const sortedTodos = [...currentTodos].sort((a, b) => {
                if (a.completed !== b.completed) {
                  return a.completed ? 1 : -1;
                }
                return (a.order || 0) - (b.order || 0);
              });
              setTodos(sortedTodos);
            },
            (fallbackError) => {
              handleFirestoreError(fallbackError, 'todos subscription (fallback)');
            }
          );
        } else {
          handleFirestoreError(error, 'todos subscription');
        }
      }
    );
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [todayStr, userId]);

  const addTodo = useCallback(async (text: string) => {
    if (!text.trim() || !userId) return;
    try {
      // Get max order among uncompleted todos to put the new item at the end of the "active" section
      const activeTodos = todos.filter(t => !t.completed);
      const maxOrder = activeTodos.length > 0 ? Math.max(...activeTodos.map(t => t.order || 0)) : 0;
      
      await addDoc(getTodosCollectionRef(), {
        text,
        completed: false,
        fixed: false,
        lastDate: todayStr,
        userId,
        createdAt: serverTimestamp(),
        order: maxOrder + 1
      });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'add todo');
    }
  }, [todayStr, todos, userId]);

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
    if (!userId) return;
    try {
      await setDoc(doc(db, 'settings', `todoBox_${userId}`), { position: pos }, { merge: true });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update todo position');
    }
  }, [userId]);

  const updateTodoBoxSize = useCallback(async (size: { height: number }) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'settings', `todoBox_${userId}`), { size }, { merge: true });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update todo box size');
    }
  }, [userId]);

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
    if (!userId) return;
    try {
      const docRef = doc(db, 'timeboxes', `${userId}_${todayStr}`);
      const hourKey = hour.toString();
      const snap = await getDoc(docRef);
      const data = (snap.exists() ? snap.data() : { entries: {} }) as any;
      const entry = data.entries?.[hourKey] || { slot1: '', slot2: '' };
      const newEntries = { ...data.entries, [hourKey]: { ...entry, [`slot${slot}`]: text } };
      await setDoc(docRef, { entries: newEntries }, { merge: true });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update timebox entry');
    }
  }, [todayStr, userId]);

  const updateTimeBoxPosition = useCallback(async (pos: { x: number, y: number }) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'timeboxes', `${userId}_${todayStr}`), { position: pos }, { merge: true });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update timebox position');
    }
  }, [todayStr, userId]);

  const updateTimeBoxColors = useCallback(async (colors: Record<string, string>) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'timeboxes', `${userId}_${todayStr}`), { colors }, { merge: true });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'update timebox colors');
    }
  }, [todayStr, userId]);

  const addNote = useCallback(async () => {
    if (!userId) return;
    try {
      await addDoc(getNotesCollectionRef(), {
        content: '',
        color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
        position: {
          x: DEFAULT_NOTE_POSITION_OFFSET.x + Math.random() * DEFAULT_NOTE_POSITION_OFFSET.randomRange,
          y: DEFAULT_NOTE_POSITION_OFFSET.y + Math.random() * DEFAULT_NOTE_POSITION_OFFSET.randomRange
        },
        size: DEFAULT_NOTE_SIZE,
        status: 'active',
        userId,
        createdAt: serverTimestamp(),
        lastEdited: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error as FirestoreError, 'add note');
      throw error;
    }
  }, [userId]);

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
    if (!userId) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        try {
          await addDoc(getFilesCollectionRef(), {
            name: file.name,
            type: file.type,
            dataUrl: e.target.result,
            size: file.size,
            userId,
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
  }, [userId]);

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
