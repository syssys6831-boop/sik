import { useCallback, useRef } from 'react';
import { findDragElement, getElementBounds, setWindowFocus } from '../utils/domUtils';
import { MIN_NOTE_WIDTH, MIN_NOTE_HEIGHT, MIN_TODOBOX_HEIGHT } from '../utils/constants';

export type DragType = 'note' | 'time' | 'todo' | 'resize' | 'todoResize';

interface DragState {
  id?: string;
  type: DragType;
  startX: number;
  startY: number;
  startPos: { x: number; y: number };
  startSize?: { w: number; h: number };
}

interface UseDragCallbacks {
  onNoteDragEnd?: (id: string, position: { x: number; y: number }) => void;
  onNoteResizeEnd?: (id: string, size: { width: number; height: number }) => void;
  onTimeBoxDragEnd?: (position: { x: number; y: number }) => void;
  onTodoBoxDragEnd?: (position: { x: number; y: number }) => void;
  onTodoBoxResizeEnd?: (size: { height: number }) => void;
  onBringToFront?: (id: string) => void;
}

/**
 * 드래그 앤 드롭 기능을 제공하는 커스텀 훅
 */
export const useDrag = (callbacks: UseDragCallbacks = {}) => {
  const draggingRef = useRef<DragState | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current) return;
    
    const { type, id, startX, startY, startPos, startSize } = draggingRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const el = findDragElement(type, id);
    if (!el) return;

    if (type === 'resize' && startSize) {
      el.style.width = `${Math.max(MIN_NOTE_WIDTH, startSize.w + dx)}px`;
      el.style.height = `${Math.max(MIN_NOTE_HEIGHT, startSize.h + dy)}px`;
    } else if (type === 'todoResize' && startSize) {
      el.style.height = `${Math.max(MIN_TODOBOX_HEIGHT, startSize.h + dy)}px`;
    } else {
      el.style.left = `${startPos.x + dx}px`;
      el.style.top = `${startPos.y + dy}px`;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!draggingRef.current) return;
    
    const { type, id } = draggingRef.current;
    const el = findDragElement(type, id);

    if (el) {
      const bounds = getElementBounds(el);

      switch (type) {
        case 'note':
          if (callbacks.onNoteDragEnd && id) {
            callbacks.onNoteDragEnd(id, { x: bounds.x, y: bounds.y });
          }
          break;
        case 'resize':
          if (callbacks.onNoteResizeEnd && id) {
            callbacks.onNoteResizeEnd(id, { width: bounds.width, height: bounds.height });
          }
          break;
        case 'time':
          if (callbacks.onTimeBoxDragEnd) {
            callbacks.onTimeBoxDragEnd({ x: bounds.x, y: bounds.y });
          }
          break;
        case 'todo':
          if (callbacks.onTodoBoxDragEnd) {
            callbacks.onTodoBoxDragEnd({ x: bounds.x, y: bounds.y });
          }
          break;
        case 'todoResize':
          if (callbacks.onTodoBoxResizeEnd) {
            callbacks.onTodoBoxResizeEnd({ height: bounds.height });
          }
          break;
      }
    }

    draggingRef.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, callbacks]);

  const startDragging = useCallback((
    e: React.MouseEvent,
    type: DragType,
    id?: string
  ) => {
    e.preventDefault();
    
    if (id && callbacks.onBringToFront) {
      callbacks.onBringToFront(id);
    }
    
    const targetId = id || (type === 'time' ? 'timebox' : 'todobox');
    setWindowFocus(targetId);

    const el = findDragElement(type, id);
    if (!el) return;

    const bounds = getElementBounds(el);
    
    draggingRef.current = {
      type,
      id,
      startX: e.clientX,
      startY: e.clientY,
      startPos: { x: bounds.x, y: bounds.y },
      startSize: { w: bounds.width, h: bounds.height },
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp, callbacks]);

  return { startDragging };
};

