// Phone & Device Storage Management Service
// Handles Dual-Persistence (MongoDB + Local Phone Storage), Storage Permissions, Quota, Export & Import

export interface StorageInfo {
  isPersisted: boolean;
  permissionStatus: 'granted' | 'denied' | 'prompt';
  usedKB: number;
  totalKB: number;
  quizCount: number;
  bookmarkCount: number;
  resultsCount: number;
  lastSyncedAt: number | null;
}

const STORAGE_KEYS = {
  PERMISSION: 'qf_phone_storage_permission',
  LIBRARY: 'qf_lib_v4',
  BOOKMARKS: 'qf_bookmarks_v4',
  CATEGORIES: 'qf_categories',
  RESULTS: 'qf_results_v4',
  QUIZ_CONFIG: 'qf_quiz_config',
  USER_KEYS: 'qf_user_api_keys',
  THEME: 'qf_theme',
  LAST_SYNC: 'qf_last_storage_sync'
};

export const phoneStorageService = {
  // Check if phone storage permission has been granted
  getPermissionStatus(): 'granted' | 'denied' | 'prompt' {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.PERMISSION);
      if (val === 'granted') return 'granted';
      if (val === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'prompt';
    }
  },

  // Request phone storage permission & persistent browser storage
  async requestPermission(): Promise<{ success: boolean; isPersisted: boolean }> {
    try {
      let isPersisted = false;
      if (navigator.storage && navigator.storage.persist) {
        isPersisted = await navigator.storage.persist();
      }
      localStorage.setItem(STORAGE_KEYS.PERMISSION, 'granted');
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
      return { success: true, isPersisted };
    } catch (e) {
      console.warn('Storage permission request error:', e);
      try {
        localStorage.setItem(STORAGE_KEYS.PERMISSION, 'granted');
      } catch (_) {}
      return { success: true, isPersisted: false };
    }
  },

  // Deny / dismiss permission prompt
  denyPermission() {
    try {
      localStorage.setItem(STORAGE_KEYS.PERMISSION, 'denied');
    } catch (_) {}
  },

  // Calculate approximate phone storage usage
  async getStorageInfo(): Promise<StorageInfo> {
    const status = this.getPermissionStatus();
    let isPersisted = false;
    let usedKB = 0;
    let totalKB = 0;

    try {
      if (navigator.storage && navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        usedKB = Math.round((estimate.usage || 0) / 1024);
        totalKB = Math.round((estimate.quota || 0) / 1024);
      }
    } catch (e) {
      console.warn('Could not estimate storage:', e);
    }

    // Calculate localStorage size if estimate is 0
    if (usedKB === 0) {
      try {
        let totalLen = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) {
            totalLen += (localStorage.getItem(k) || '').length * 2;
          }
        }
        usedKB = Math.round(totalLen / 1024);
      } catch (_) {}
    }

    let quizCount = 0;
    let bookmarkCount = 0;
    let resultsCount = 0;
    let lastSyncedAt: number | null = null;

    try {
      const lib = localStorage.getItem(STORAGE_KEYS.LIBRARY);
      if (lib) quizCount = JSON.parse(lib).length;
      const bmarks = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      if (bmarks) bookmarkCount = JSON.parse(bmarks).length;
      const res = localStorage.getItem(STORAGE_KEYS.RESULTS);
      if (res) resultsCount = JSON.parse(res).length;
      const sync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      if (sync) lastSyncedAt = parseInt(sync, 10);
    } catch (_) {}

    return {
      isPersisted,
      permissionStatus: status,
      usedKB,
      totalKB,
      quizCount,
      bookmarkCount,
      resultsCount,
      lastSyncedAt
    };
  },

  // Save data safely to phone storage
  saveItem(key: string, value: any): boolean {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
      return true;
    } catch (e) {
      console.error('Failed to save to phone storage:', e);
      return false;
    }
  },

  // Read data safely from phone storage
  getItem<T>(key: string, fallback: T): T {
    try {
      const item = localStorage.getItem(key);
      if (!item) return fallback;
      try {
        return JSON.parse(item);
      } catch {
        return item as unknown as T;
      }
    } catch {
      return fallback;
    }
  },

  // Export full backup directly to user's phone/PC storage as a downloadable .json file
  exportBackupFile(data: { library: any[]; bookmarks: any[]; categories: any[]; quizConfig?: any }): boolean {
    try {
      const backupObj = {
        app: 'QuizFlash',
        version: '4.0',
        exportedAt: new Date().toISOString(),
        timestamp: Date.now(),
        ...data
      };
      const jsonStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `quizflash_phone_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('Export backup failed:', e);
      return false;
    }
  },

  // Parse imported backup file from phone
  async importBackupFile(file: File): Promise<{ success: boolean; data?: any; error?: string }> {
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const parsed = JSON.parse(content);
            if (!parsed.library && !Array.isArray(parsed)) {
              resolve({ success: false, error: 'Invalid Quiz Flash backup format.' });
              return;
            }
            resolve({ success: true, data: parsed });
          } catch (err: any) {
            resolve({ success: false, error: 'Failed to parse JSON file: ' + err.message });
          }
        };
        reader.onerror = () => resolve({ success: false, error: 'Failed to read file from storage.' });
        reader.readAsText(file);
      } catch (err: any) {
        resolve({ success: false, error: err.message });
      }
    });
  }
};
