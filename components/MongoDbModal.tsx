import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Server, ArrowRight, Shield, Sparkles, X, HardDrive, FileUp } from 'lucide-react';

interface MongoDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onSyncComplete?: () => void;
}

interface MongoStatus {
  connected: boolean;
  databaseName: string;
  uriMasked: string;
  storageType: string;
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
  const [mongoUri, setMongoUri] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mongodb/status');
      if (res.ok) {
        const data = await res.json();
        setMongoStatus(data);
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

  const handleConnectMongo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mongoUri.trim()) return;

    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch('/api/mongodb/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: mongoUri.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Connected to MongoDB successfully!' });
        fetchStatus();
        setMongoUri('');
        if (onSyncComplete) onSyncComplete();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to connect to MongoDB' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Connection error' });
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

      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `✓ ${data.totalQuizzes || quizzes.length} Quizzes synchronized with MongoDB & Local Storage!`
        });
        fetchStatus();
        if (onSyncComplete) onSyncComplete();
      } else {
        setMessage({ type: 'error', text: 'Sync encountered an issue' });
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
        className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border transition-all ${
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
              <h3 className="text-base font-black tracking-tight">MongoDB Database Center</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Cloud Database & Storage Sync</p>
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
                  {mongoStatus?.connected ? 'MongoDB Connected & Active' : 'Local Storage Mode Active'}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Database: <span className="font-bold">{mongoStatus?.databaseName || 'quizflash'}</span>
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
              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
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
                Upload and backup all your quizzes and files into MongoDB database.
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing to Database...' : 'Upload & Sync All Data to MongoDB'}
          </button>
        </div>

        {/* MongoDB URI Input Form */}
        <form onSubmit={handleConnectMongo} className="space-y-3">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              MongoDB Connection URI
            </label>
            <input
              type="password"
              value={mongoUri}
              onChange={(e) => setMongoUri(e.target.value)}
              placeholder="mongodb+srv://username:password@cluster.mongodb.net/quizflash"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <p className="text-[9px] text-slate-400 mt-1">
              Example: mongodb+srv://admin:pass@cluster0.abcde.mongodb.net/quizflash
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={loading || !mongoUri.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Database size={14} />
              {loading ? 'Connecting...' : 'Connect to MongoDB'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
