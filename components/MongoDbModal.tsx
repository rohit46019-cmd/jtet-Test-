import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Sparkles, X, HardDrive } from 'lucide-react';

interface MongoDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onSyncComplete?: () => void;
}

interface MongoStatus {
  connected: boolean;
  databaseName: string;
  storageType: string;
  error?: string | null;
  counts: {
    quizzes: number;
    categories: number;
    users: number;
    uploadedFiles: number;
  };
}

export const MongoDbModal: React.FC<MongoDbModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onSyncComplete
}) => {
  const [mongoStatus, setMongoStatus] = useState<MongoStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mongodb/status');
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { error: text || 'Invalid server response' };
      }
      if (res.ok) {
        setMongoStatus(data);
        if (data.error && !data.connected) {
          setMessage({
            type: 'info',
            text: `Cloud database is inactive. Using Local Offline Mode (${data.error})`
          });
        }
      } else {
        setMongoStatus({
          connected: false,
          databaseName: 'quizflash',
          storageType: 'local_file_cache',
          error: data.error || text,
          counts: { quizzes: 0, categories: 0, users: 0, uploadedFiles: 0 }
        });
      }
    } catch (e) {
      console.error('Failed to fetch MongoDB status', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setMessage(null);
    }
  }, [isOpen]);

  const handleRetryMongo = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch('/api/mongodb/status?retry=true');
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch (e) { data = { error: text }; }
      if (res.ok && data.connected) {
        setMessage({ type: 'success', text: 'Successfully connected and verified MongoDB Atlas cluster!' });
        setMongoStatus(data);
        if (onSyncComplete) onSyncComplete();
      } else {
        setMessage({ 
          type: 'error', 
          text: data.error || 'Failed to establish cloud database connection. Please verify MONGODB_URI in environment variables.' 
        });
        await fetchStatus();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Retry connection failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      setMessage(null);
      
      const localLib = localStorage.getItem('qf_lib_v4');
      const localCats = localStorage.getItem('qf_categories');
      const quizzes = localLib ? JSON.parse(localLib) : [];
      const categories = localCats ? JSON.parse(localCats) : [];

      const res = await fetch('/api/mongodb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizzes, categories })
      });

      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch (e) { data = { error: text }; }

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `✓ ${data.totalQuizzes || quizzes.length} Quizzes successfully backed up to MongoDB Atlas!`
        });
        fetchStatus();
        if (onSyncComplete) onSyncComplete();
      } else {
        setMessage({ type: 'error', text: data.error || text || 'Sync encountered an issue' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border transition-all ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">MongoDB Cloud Sync</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Auto-connected via environment secrets</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Card */}
        <div className={`p-4 rounded-2xl border mb-5 ${
          mongoStatus?.connected 
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200' 
            : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  mongoStatus?.connected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  mongoStatus?.connected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}></span>
              </span>
              <div>
                <div className="text-xs font-black uppercase tracking-wider">
                  {mongoStatus?.connected ? 'MongoDB Connected' : 'Local Storage Mode Active'}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Secure cluster connection active.
                </div>
              </div>
            </div>
            <button 
              onClick={fetchStatus} 
              disabled={loading}
              className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-all text-xs flex items-center gap-1 font-bold"
              title="Refresh status"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Counts Grid */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-black/10 dark:border-white/10 text-center">
            <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
              <div className="text-sm font-black">{mongoStatus?.counts?.quizzes ?? 0}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider opacity-70">Quizzes</div>
            </div>
            <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
              <div className="text-sm font-black">{mongoStatus?.counts?.categories ?? 0}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider opacity-70">Categories</div>
            </div>
            <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
              <div className="text-sm font-black">{mongoStatus?.counts?.uploadedFiles ?? 0}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider opacity-70">Files</div>
            </div>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
              : message.type === 'info'
              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={15} /> : message.type === 'info' ? <HardDrive size={15} /> : <AlertCircle size={15} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Quick Sync Action */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 mb-5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-500" /> Database Synchronization
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Upload and backup all your quizzes and categories into your secure MongoDB database.
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={syncing || !mongoStatus?.connected}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing to Database...' : 'Backup Local Data to MongoDB'}
          </button>
        </div>

        {/* Retry / Reload Button */}
        {!mongoStatus?.connected && (
          <button
            onClick={handleRetryMongo}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-amber-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 mb-4 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Testing Connection...' : 'Retry Connecting MongoDB'}
          </button>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-wider shadow-md hover:opacity-90 active:scale-95 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
