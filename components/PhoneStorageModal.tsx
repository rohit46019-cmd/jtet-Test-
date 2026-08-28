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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border transition-all ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-800 text-white' 
            : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center">
              <Smartphone size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Phone & Device Storage
                {isGranted && (
                  <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Active
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dual Persistence: Phone Offline Storage + MongoDB Cloud
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Notification Message */}
        {msg && (
          <div className={`mt-4 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
            msg.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}>
            {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="mt-5 space-y-4">
          {/* Dual Storage Feature explanation */}
          <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
            isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200/70'
          }`}>
            <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400 text-xs">
              <ShieldCheck size={16} />
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
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Local Quizzes</div>
              <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {library.length}
              </div>
              <div className="text-[9px] text-slate-400">On Phone</div>
            </div>

            <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/60'}`}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bookmarks</div>
              <div className="text-lg font-black text-amber-500 mt-0.5">
                {bookmarks.length}
              </div>
              <div className="text-[9px] text-slate-400">Questions</div>
            </div>

            <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/60'}`}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Usage</div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
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

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleGrantPermission}
                  disabled={isSyncing}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={14} />
                  <span>Grant Phone Storage Permission</span>
                </button>
                <button
                  onClick={() => {
                    phoneStorageService.denyPermission();
                    onClose();
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Not Now
                </button>
              </div>
            </div>
          )}

          {/* Backup & Restore to Phone Storage Tools */}
          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Phone Storage Tools (Backup / Restore)
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleExportBackup}
                className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 ${
                  isDarkMode 
                    ? 'bg-slate-800/80 border-slate-700 hover:border-blue-500/50' 
                    : 'bg-slate-50 border-slate-200 hover:border-blue-400'
                }`}
              >
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <Download size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold">Export Backup (.json)</div>
                  <div className="text-[10px] text-slate-400">Download to Phone Storage</div>
                </div>
              </button>

              <label className={`p-3 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-800/80 border-slate-700 hover:border-emerald-500/50' 
                  : 'bg-slate-50 border-slate-200 hover:border-emerald-400'
              }`}>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <Upload size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold">Import from Phone</div>
                  <div className="text-[10px] text-slate-400">Restore from .json file</div>
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
                className={`w-full p-3 rounded-2xl border text-center transition flex items-center justify-center gap-2 mt-2 ${
                  isDarkMode 
                    ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-slate-300' 
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin text-blue-600' : ''} />
                <span className="text-xs font-bold">
                  {isSyncing ? 'Syncing with MongoDB & Storage...' : 'Sync Phone Storage with MongoDB Cloud'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
