import React, { useState, useEffect } from 'react';
import { Smartphone, HardDrive, ShieldCheck, CheckCircle2, Cloud, Download, Upload, RefreshCw, X, AlertCircle, Sparkles } from 'lucide-react';
import { phoneStorageService, StorageInfo } from '../services/phoneStorageService';
import { StoredQuiz, BookmarkedQuestion, Category } from '../types';

interface PhoneStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  library?: StoredQuiz[];
  bookmarks?: BookmarkedQuestion[];
  categories?: Category[];
  onPermissionChanged?: (granted: boolean) => void;
  onDataImported?: (data: { library?: StoredQuiz[]; bookmarks?: BookmarkedQuestion[]; categories?: Category[] }) => void;
  onForceSync?: () => Promise<void>;
}

export const PhoneStorageModal: React.FC<PhoneStorageModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = false,
  library = [],
  bookmarks = [],
  categories = [],
  onPermissionChanged,
  onDataImported,
  onForceSync
}) => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, library, bookmarks]);

  const loadStats = async () => {
    const info = await phoneStorageService.getStorageInfo();
    setStorageInfo(info);
  };

  const handleGrantPermission = async () => {
    setIsSyncing(true);
    const res = await phoneStorageService.requestPermission();
    await loadStats();
    setIsSyncing(false);
    if (onPermissionChanged) {
      onPermissionChanged(true);
    }
    setMsg({
      text: '✓ Phone Storage Permission Granted! Data is saved locally on device & synced with MongoDB.',
      type: 'success'
    });
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleExportBackup = () => {
    const success = phoneStorageService.exportBackupFile({
      library,
      bookmarks,
      categories
    });
    if (success) {
      setMsg({ text: '✓ Backup file successfully downloaded to your Phone Storage / Downloads folder!', type: 'success' });
    } else {
      setMsg({ text: 'Failed to export backup file.', type: 'error' });
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await phoneStorageService.importBackupFile(file);
    if (res.success && res.data) {
      if (onDataImported) {
        onDataImported(res.data);
      }
      setMsg({ text: '✓ Backup file imported successfully! Quizzes and data updated in Phone Storage and MongoDB.', type: 'success' });
      await loadStats();
    } else {
      setMsg({ text: res.error || 'Failed to import backup.', type: 'error' });
    }
  };

  const handleManualSync = async () => {
    if (onForceSync) {
      setIsSyncing(true);
      try {
        await onForceSync();
        await loadStats();
        setMsg({ text: '✓ Successfully synced Phone Storage with MongoDB Cloud!', type: 'success' });
      } catch (err: any) {
        setMsg({ text: 'Sync error: ' + (err.message || 'Could not reach server'), type: 'error' });
      } finally {
        setIsSyncing(false);
      }
    }
  };

  if (!isOpen) return null;

  const isGranted = storageInfo?.permissionStatus === 'granted';

  return (
    <div 
      className="fixed inset-0 z-[300] flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className={`w-full max-w-lg my-2 sm:my-auto max-h-[92vh] sm:max-h-[85vh] rounded-3xl shadow-2xl border transition-all flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-800 text-white' 
            : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Sticky Header with prominent close button */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Smartphone size={20} className="sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black tracking-tight truncate">
                  Phone Storage & Sync
                </h2>
                {isGranted && (
                  <span className="text-[9px] sm:text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Offline Local Storage + MongoDB Cloud
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            aria-label="Close modal"
            className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 active:scale-95 shadow-sm border border-red-200/60 dark:border-red-900/60"
            title="Close modal"
          >
            <X size={16} className="stroke-[2.5]" />
            <span>Close</span>
          </button>
        </div>

        {/* Scrollable Content Body with custom scrollbar */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.5)_transparent]">
          {/* Status Notification Message */}
          {msg && (
            <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
              msg.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}>
              {msg.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
              <span className="leading-snug">{msg.text}</span>
            </div>
          )}

          {/* Dual Storage Feature explanation */}
          <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
            isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200/70'
          }`}>
            <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400 text-xs">
              <ShieldCheck size={16} className="shrink-0" />
              <span>How your data is stored (डेटा कैसे सुरक्षित रहता है):</span>
            </div>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 pl-5 list-disc text-[11px]">
              <li>
                <strong>Phone Offline Storage:</strong> Sabhi quizzes, bookmarks, categories aur test results aapke phone ke browser storage me save rehte hain taaki offline bhi chale.
              </li>
              <li>
                <strong>MongoDB Cloud Database:</strong> Same data cloud me sync hota hai taaki aap kisi bhi device par apna data access kar sakein.
              </li>
            </ul>
          </div>

          {/* Storage Quota & Statistics */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/60'}`}>
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Local Quizzes</div>
              <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {library.length}
              </div>
              <div className="text-[9px] text-slate-400">On Phone</div>
            </div>

            <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/60'}`}>
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Bookmarks</div>
              <div className="text-base sm:text-lg font-black text-amber-500 mt-0.5">
                {bookmarks.length}
              </div>
              <div className="text-[9px] text-slate-400">Questions</div>
            </div>

            <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/60'}`}>
              <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Phone Usage</div>
              <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                {storageInfo?.usedKB ? `${storageInfo.usedKB} KB` : 'Active'}
              </div>
              <div className="text-[9px] text-slate-400">Durable Cache</div>
            </div>
          </div>

          {/* Permission Prompt Section if not granted */}
          {!isGranted && (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3">
              <div className="flex items-start gap-3">
                <Sparkles size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    Allow Phone Storage Permission?
                  </h4>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                    Storage allow karne se aapka browser offline tests aur question banks ko phone memory me securely reserve rakhega.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-1 flex-wrap sm:flex-nowrap">
                <button
                  onClick={handleGrantPermission}
                  disabled={isSyncing}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <ShieldCheck size={14} />
                  <span>Grant Permission</span>
                </button>
                <button
                  onClick={() => {
                    phoneStorageService.denyPermission();
                    onClose();
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
                >
                  Not Now
                </button>
              </div>
            </div>
          )}

          {/* Backup & Restore to Phone Storage Tools */}
          <div className="space-y-2 pt-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Phone Storage Tools (Backup / Restore)
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleExportBackup}
                className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 active:scale-98 ${
                  isDarkMode 
                    ? 'bg-slate-800/80 border-slate-700 hover:border-blue-500/50' 
                    : 'bg-slate-50 border-slate-200 hover:border-blue-400'
                }`}
              >
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
                  <Download size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Export Backup (.json)</div>
                  <div className="text-[10px] text-slate-400 truncate">Download to Phone Storage</div>
                </div>
              </button>

              <label className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer active:scale-98 ${
                isDarkMode 
                  ? 'bg-slate-800/80 border-slate-700 hover:border-emerald-500/50' 
                  : 'bg-slate-50 border-slate-200 hover:border-emerald-400'
              }`}>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Upload size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">Import from Phone</div>
                  <div className="text-[10px] text-slate-400 truncate">Restore from .json file</div>
                </div>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleFileImport} 
                  className="hidden" 
                />
              </label>
            </div>

            {onForceSync && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className={`w-full p-3 rounded-2xl border text-center transition flex items-center justify-center gap-2 mt-2 active:scale-98 ${
                  isDarkMode 
                    ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-slate-300' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin text-blue-600' : ''} />
                <span className="text-xs font-bold truncate">
                  {isSyncing ? 'Syncing with MongoDB & Storage...' : 'Sync Phone Storage with MongoDB Cloud'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <X size={15} />
            <span>Close Modal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
