import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, User, Target, Sparkles, CheckCircle2, RefreshCw, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatDuration } from '../types';

export default function Leaderboard() {
  const [users, setUsers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('qf_cached_leaderboard');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user: currentUser } = useAuth();

  const fetchLeaderboard = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Sort descending by totalPoints
          const sorted = data.sort((a: any, b: any) => (b.totalPoints || 0) - (a.totalPoints || 0));
          setUsers(sorted);
          localStorage.setItem('qf_cached_leaderboard', JSON.stringify(sorted));
        }
      } else {
        throw new Error(`Server returned status ${res.status}`);
      }
    } catch (err) {
      console.warn("Leaderboard fetch fallback to local cache:", err);
      try {
        const saved = localStorage.getItem('qf_cached_leaderboard');
        if (saved) {
          setUsers(JSON.parse(saved));
        }
      } catch (cacheErr) {
        console.warn("Failed to load local leaderboard cache:", cacheErr);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 15000); // Polling every 15s for live updates
    return () => clearInterval(interval);
  }, []);

  const userRankIndex = users.findIndex(u => u.id === currentUser?.uid || u.email === currentUser?.email);
  const currentUserData = userRankIndex !== -1 ? users[userRankIndex] : null;

  const formatDurationLocal = (seconds?: number) => {
    return formatDuration(seconds);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-in fade-in duration-300">
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-[10px] uppercase tracking-widest shadow-sm">
          <Sparkles size={14} className="text-amber-500 animate-pulse" /> Live Leaderboard & Rank
        </div>
        <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight flex items-center justify-center gap-3">
          <Trophy className="text-yellow-500 drop-shadow-md" size={32} /> Global Leaderboard
        </h2>
        <div className="flex items-center justify-center gap-2">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Rank Points Rule: +1 Mark per Correct Answer
          </p>
          <button 
            onClick={() => fetchLeaderboard(true)} 
            disabled={refreshing} 
            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
            title="Refresh Leaderboard"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* Current User High-Level Rank Summary Card */}
      {currentUser && (
        <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 border-black">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-lg sm:text-xl font-black border border-white/20 shadow-inner shrink-0">
              {userRankIndex !== -1 ? `#${userRankIndex + 1}` : '—'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-sm text-white flex items-center gap-2 truncate">
                Your Rank Position {userRankIndex === 0 && '👑 #1 Leader!'}
              </h4>
              <p className="text-[11px] text-blue-100 font-bold mt-0.5 truncate">
                {currentUserData?.name || currentUser.displayName || currentUser.email?.split('@')[0]}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-blue-100 font-bold mt-1.5">
                <span className="flex items-center gap-1 shrink-0">
                  <Target size={12} /> {currentUserData?.questionsAttempted || 0} Attempted
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <Clock size={12} /> {formatDuration(currentUserData?.totalTimeSpent)} Spent
                </span>
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t border-white/10 sm:border-0">
            <div className="text-2xl font-black tracking-tight">{currentUserData?.totalPoints || 0} <span className="text-xs font-bold text-yellow-300">PTS</span></div>
            <div className="text-[10px] text-blue-100 font-semibold uppercase tracking-wider flex items-center gap-1 justify-start sm:justify-end mt-0.5">
              <CheckCircle2 size={12} /> {currentUserData?.correctAnswers || 0} Correct Marks
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-800 rounded-[2.5rem] p-4 sm:p-6 shadow-md">
          <div className="space-y-3">
            {users.map((u, i) => {
              const isSelf = currentUser && (u.id === currentUser.uid || u.email === currentUser.email);
              const attempted = u.questionsAttempted || 0;
              const correct = u.correctAnswers || 0;
              const timeSpent = u.totalTimeSpent || 0;

              return (
                <div 
                  key={u.id || i} 
                  className={`flex items-center gap-3.5 sm:gap-4 p-4 rounded-3xl transition-all border-2 ${
                    isSelf 
                      ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-600 shadow-md' 
                      : i < 3 
                        ? 'bg-slate-50 dark:bg-slate-800/50 border-black dark:border-slate-800' 
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center font-black text-base sm:text-lg shrink-0">
                    {i === 0 ? <Trophy size={32} className="text-yellow-500 drop-shadow-md animate-bounce" /> :
                     i === 1 ? <Medal size={30} className="text-slate-400 drop-shadow-md" /> :
                     i === 2 ? <Medal size={28} className="text-amber-700 drop-shadow-md" /> :
                     <span className="text-slate-400 font-bold">#{i + 1}</span>}
                  </div>
                  
                  <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm font-black uppercase text-sm border border-black/20">
                    {u.name ? u.name.charAt(0) : (u.email ? u.email.charAt(0) : 'U')}
                  </div>
                  
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold truncate text-sm sm:text-base text-slate-900 dark:text-white">
                        {u.name || u.email?.split('@')[0] || 'Anonymous'}
                      </h4>
                      {isSelf && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest shrink-0">You</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                      <span className="flex items-center gap-1">
                        <Target size={12} className="text-blue-500" /> {attempted} Attempted
                      </span>
                      {correct > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={12} /> {correct} Correct (+{correct} Marks)
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock size={12} className="text-amber-500" /> {formatDuration(timeSpent)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <div className="font-black text-lg sm:text-xl text-blue-600 dark:text-blue-400 tracking-tight">
                      {u.totalPoints || 0}
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">PTS</div>
                  </div>
                </div>
              );
            })}
            
            {users.length === 0 && (
              <div className="text-center py-12 text-slate-400 italic">No rankings available yet. Complete a quiz to climb the leaderboard!</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
