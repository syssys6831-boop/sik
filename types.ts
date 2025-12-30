
import { Timestamp } from 'firebase/firestore';

export interface StoredFile {
  id: string;
  name: string;
  type: string;
  dataUrl: string; // Base64 encoded data
  size: number;
  createdAt: Timestamp | null;
}

export interface Note {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  createdAt: Timestamp | null;
  lastEdited: Timestamp | null;
  size?: { width: number; height: number };
  status: 'active' | 'minimized' | 'archived';
}

export interface TimeBoxData {
  id: string; // date string YYYY-MM-DD
  entries: Record<string, { slot1: string; slot2: string }>;
  colors: Record<string, string>; // "hour-slot" -> color class
  position?: { x: number; y: number };
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  fixed: boolean; // 매일 고정 여부
  lastDate: string; // 마지막으로 처리된 날짜 YYYY-MM-DD
  createdAt: Timestamp | null;
  position?: { x: number; y: number };
  order: number; // 순서 정렬을 위한 필드
}
