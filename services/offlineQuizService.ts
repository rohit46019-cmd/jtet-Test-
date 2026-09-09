// Offline Quiz Management Service
// Provides durable offline persistence via IndexedDB + LocalStorage
// Allows downloading tests from server for complete offline access

import { StoredQuiz, Quiz } from '../types';

const OFFLINE_STORAGE_KEY = 'qf_offline_downloaded_map_v1';
const DB_NAME = 'QuizFlashOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_quizzes';

// Open IndexedDB safely with fallback
function openOfflineDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

export interface OfflineQuizMeta {
  quiz: StoredQuiz;
  downloadedAt: number;
  sizeKB: number;
}

export const offlineQuizService = {
  // Check if a quiz is downloaded for offline use
  isQuizDownloaded(quizId: string): boolean {
    if (!quizId) return false;
    try {
      const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (!raw) return false;
      const map: Record<string, OfflineQuizMeta> = JSON.parse(raw);
      return !!map[quizId];
    } catch {
      return false;
    }
  },

  // Get list of all offline downloaded IDs
  getDownloadedQuizIds(): Set<string> {
    try {
      const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (!raw) return new Set();
      const map: Record<string, OfflineQuizMeta> = JSON.parse(raw);
      return new Set(Object.keys(map));
    } catch {
      return new Set();
    }
  },

  // Get all downloaded quizzes for offline practice
  getDownloadedQuizzes(): StoredQuiz[] {
    try {
      const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (!raw) return [];
      const map: Record<string, OfflineQuizMeta> = JSON.parse(raw);
      return Object.values(map)
        .sort((a, b) => b.downloadedAt - a.downloadedAt)
        .map(item => item.quiz);
    } catch {
      return [];
    }
  },

  // Download / Save a quiz for offline access
  async downloadQuiz(quiz: StoredQuiz): Promise<{ success: boolean; message: string }> {
    if (!quiz || !quiz.id) {
      return { success: false, message: 'Invalid quiz payload' };
    }

    try {
      const quizJson = JSON.stringify(quiz);
      const sizeKB = Math.round((quizJson.length * 2) / 1024) || 1;

      const meta: OfflineQuizMeta = {
        quiz,
        downloadedAt: Date.now(),
        sizeKB
      };

      // 1. Save to LocalStorage Map
      const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
      const map: Record<string, OfflineQuizMeta> = raw ? JSON.parse(raw) : {};
      map[quiz.id] = meta;
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(map));

      // 2. Also persist to IndexedDB for high-capacity reliability
      try {
        const db = await openOfflineDB();
        if (db) {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(meta);
        }
      } catch (idbErr) {
        console.warn('IndexedDB write non-fatal notice:', idbErr);
      }

      // Also ensure it is present in local library cache
      try {
        const libRaw = localStorage.getItem('qf_lib_v4');
        const lib: StoredQuiz[] = libRaw ? JSON.parse(libRaw) : [];
        if (!lib.some(q => q.id === quiz.id)) {
          lib.unshift(quiz);
          localStorage.setItem('qf_lib_v4', JSON.stringify(lib.slice(0, 100)));
        }
      } catch (_) {}

      // Dispatch event to update all badges immediately
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qf_offline_updated', { detail: { quizId: quiz.id, action: 'download' } }));
      }

      return { success: true, message: `✓ "${quiz.title}" is saved for offline practice!` };
    } catch (e: any) {
      console.error('Failed to download quiz offline:', e);
      return { success: false, message: e.message || 'Failed to save quiz offline.' };
    }
  },

  // Remove a downloaded quiz to free up space
  async removeDownloadedQuiz(quizId: string): Promise<boolean> {
    if (!quizId) return false;
    try {
      const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (raw) {
        const map: Record<string, OfflineQuizMeta> = JSON.parse(raw);
        delete map[quizId];
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(map));
      }

      try {
        const db = await openOfflineDB();
        if (db) {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.delete(quizId);
        }
      } catch (_) {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qf_offline_updated', { detail: { quizId, action: 'remove' } }));
      }
      return true;
    } catch (e) {
      console.error('Failed to remove offline quiz:', e);
      return false;
    }
  },

  // Download all quizzes at once
  async downloadAllQuizzes(
    quizzes: StoredQuiz[], 
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ downloaded: number; total: number }> {
    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      return { downloaded: 0, total: 0 };
    }

    let completed = 0;
    for (const q of quizzes) {
      await this.downloadQuiz(q);
      completed++;
      if (onProgress) {
        onProgress(completed, quizzes.length);
      }
    }

    return { downloaded: completed, total: quizzes.length };
  },

  // Clear all downloaded quizzes
  async clearAllOfflineQuizzes(): Promise<boolean> {
    try {
      localStorage.removeItem(OFFLINE_STORAGE_KEY);
      try {
        const db = await openOfflineDB();
        if (db) {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.clear();
        }
      } catch (_) {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qf_offline_updated', { detail: { action: 'clear' } }));
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  // Get stats on offline downloaded tests
  getOfflineStats(): { count: number; totalQuestions: number; totalSizeKB: number } {
    try {
      const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (!raw) return { count: 0, totalQuestions: 0, totalSizeKB: 0 };
      const map: Record<string, OfflineQuizMeta> = JSON.parse(raw);
      const items = Object.values(map);
      const count = items.length;
      let totalQuestions = 0;
      let totalSizeKB = 0;
      items.forEach(item => {
        totalQuestions += (item.quiz?.questions?.length || 0);
        totalSizeKB += (item.sizeKB || 1);
      });
      return { count, totalQuestions, totalSizeKB };
    } catch {
      return { count: 0, totalQuestions: 0, totalSizeKB: 0 };
    }
  }
};
