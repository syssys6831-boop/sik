/**
 * DOM 조작 관련 유틸리티 함수
 */

/**
 * 윈도우 포커스 설정 (z-index 조정)
 */
export const setWindowFocus = (targetId: string): void => {
  const windows = document.querySelectorAll('[data-note-id], #timebox-window, #todobox-window');
  windows.forEach(win => {
    (win as HTMLElement).style.zIndex = '10';
  });
  
  let target: HTMLElement | null = null;
  if (targetId === 'timebox') {
    target = document.getElementById('timebox-window');
  } else if (targetId === 'todobox') {
    target = document.getElementById('todobox-window');
  } else {
    target = document.querySelector(`[data-note-id="${targetId}"]`);
  }
  
  if (target) {
    target.style.zIndex = '50';
  }
};

/**
 * 요소의 위치와 크기 정보 가져오기
 */
export const getElementBounds = (element: HTMLElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} => {
  return {
    x: parseFloat(element.style.left) || 0,
    y: parseFloat(element.style.top) || 0,
    width: parseFloat(element.style.width) || 0,
    height: parseFloat(element.style.height) || 0,
  };
};

/**
 * 드래그 타입에 따라 DOM 요소 찾기
 */
export const findDragElement = (
  type: 'note' | 'time' | 'todo' | 'resize' | 'todoResize',
  id?: string
): HTMLElement | null => {
  if (type === 'note' || type === 'resize') {
    return document.querySelector(`[data-note-id="${id}"]`);
  } else if (type === 'time') {
    return document.getElementById('timebox-window');
  } else if (type === 'todo' || type === 'todoResize') {
    return document.getElementById('todobox-window');
  }
  return null;
};

