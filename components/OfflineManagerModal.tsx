import React, { useState, useEffect } from 'react';
import { HardDrive, CloudDownload, Trash2, CheckCircle2, Play, X, Sparkles, WifiOff, FileCheck, RefreshCw, Smartphone } from 'lucide-react';
import { StoredQuiz } from '../types';
import { offlineQuizService } from '../services/offlineQuizService';

interface OfflineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  library: StoredQuiz[];
  isDarkMode: boolean;
  onStartQuiz: (quiz: StoredQuiz) => void;
}

export const OfflineManagerModal: React.FC<OfflineManagerModalProps> = ({
  isOpen,
  onClose,
  library,
  isDarkMode,
  onStartQuiz
}) => {
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(() => offlineQuizService.getDownloadedQuizIds());
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ completed: number; total: number } | null>(null);
  const [stats, setStats] = useState(() => offlineQuizService.getOfflineStats());
  const [activeTab, setActiveTab] = useState<'ALL' | 'DOWNLOADED'>('DOWNLOADED');
  const [searchFilter, setSearchFilter] = useState('');

  const refreshState = () => {
    setDownloadedIds(offlineQuizService.getDownloadedQuizIds());
    setStats(offlineQuizService.getOfflineStats());
  };

  useEffect(() => {
    refreshState();
    const handleUpdate = () => refreshState();
    window.addEventListener('qf_offline_updated', handleUpdate);
    return () => window.removeEventListener('qf_offline_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleDownloadSingle = async (quiz: StoredQuiz) => {
    await offlineQuizService.downloadQuiz(quiz);
    refreshState();
  };

  const handleRemoveSingle = async (quizId: string) => {
    await offlineQuizService.removeDownloadedQuiz(quizId);
    refreshState();
  };

  const handleDownloadAll = async () => {
    if (library.length === 0) return;
    setIsDownloadingAll(true);
    setDownloadProgress({ completed: 0, total: library.length });
    
    await offlineQuizService.downloadAllQuizzes(library, (completed, total) => {
      setDownloadProgress({ completed, total });
    });

    setIsDownloadingAll(false);
    setDownloadProgress(null);
    refreshState();
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to remove all downloaded tests from device storage?')) {
      await offlineQuizService.clearAllOfflineQuizzes();
      refreshState();
    }
  };

  const filteredQuizzes = library.filter(q => {
    const matchesSearch = !searchFilter.trim() || q.title.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesTab = activeTab === 'ALL' || downloadedIds.has(q.id);
    return matchesSearch && matchesTab;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-800 text-white' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-indigo-600/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <HardDrive size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Offline Test Downloads</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider">
                  Device Storage
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Server se test download karein taaki bina internet ke open aur practice ho sakein.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Storage Stats Banner */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2.5 sm:gap-4 text-center">
          <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-xs">
            <div className="text-lg sm:text-xl font-black text-emerald-500">{stats.count}</div>
            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Offline Tests</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-xs">
            <div className="text-lg sm:text-xl font-black text-cyan-500">{stats.totalQuestions}</div>
            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Questions</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-xs">
            <div className="text-lg sm:text-xl font-black text-indigo-500">{stats.totalSizeKB} KB</div>
            <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Space Used</div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              onClick={() => setActiveTab('DOWNLOADED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'DOWNLOADED' 
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Offline Ready ({stats.count})
            </button>
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ALL' 
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Tests ({library.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              disabled={isDownloadingAll || library.length === 0}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isDownloadingAll ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Saving {downloadProgress?.completed}/{downloadProgress?.total}
                </>
              ) : (
                <>
                  <CloudDownload size={13} />
                  Download All Tests
                </>
              )}
            </button>

            {stats.count > 0 && (
              <button
                onClick={handleClearAll}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                title="Clear All Offline Downloads"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/60">
          <input 
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search quizzes..."
            className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium outline-none border transition-colors ${
              isDarkMode 
                ? 'bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500' 
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500'
            }`}
          />
        </div>

        {/* Quiz List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
          {filteredQuizzes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <WifiOff size={24} />
              </div>
              <p className="text-xs font-bold">
                {activeTab === 'DOWNLOADED' 
                  ? 'Koi test offline download nahi kiya gaya hai.' 
                  : 'No quizzes match your filter.'}
              </p>
              {activeTab === 'DOWNLOADED' && library.length > 0 && (
                <button
                  onClick={() => setActiveTab('ALL')}
                  className="text-xs text-emerald-500 font-bold hover:underline"
                >
                  Sabhi tests dekhein aur download karein &rarr;
                </button>
              )}
            </div>
          ) : (
            filteredQuizzes.map((q) => {
              const isDownloaded = downloadedIds.has(q.id);
              return (
                <div 
                  key={q.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isDownloaded 
                      ? isDarkMode 
                        ? 'bg-emerald-950/20 border-emerald-900/40 hover:border-emerald-700/60' 
                        : 'bg-emerald-50/50 border-emerald-200/80 hover:border-emerald-300'
                      : isDarkMode 
                        ? 'bg-slate-800/40 border-slate-800 hover:border-slate-700' 
                        : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {isDownloaded ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase tracking-wider">
                          <CheckCircle2 size={10} /> Offline Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-wider">
                          Server Only
                        </span>
                      )}
                      <span className="text-[8px] font-bold text-slate-400">
                        • {q.questions?.length || 0} Questions
                      </span>
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm truncate leading-snug">{q.title}</h4>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Play offline button */}
                    <button
                      onClick={() => {
                        onClose();
                        onStartQuiz(q);
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                      title="Start Quiz Now"
                    >
                      <Play size={10} fill="currentColor" /> Play
                    </button>

                    {/* Download / Remove toggle button */}
                    {isDownloaded ? (
                      <button
                        onClick={() => handleRemoveSingle(q.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                        title="Remove offline download"
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDownloadSingle(q)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm active:scale-95"
                        title="Download to phone for offline use"
                      >
                        <CloudDownload size={12} /> Download
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 text-center flex items-center justify-center gap-2">
          <Smartphone size={14} className="text-emerald-500 shrink-0" />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Downloaded tests aapke phone ke browser storage me permanently save rahenge aur airplane mode me bhi khulenge.
          </p>
        </div>
      </div>
    </div>
  );
};
