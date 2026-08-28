import React from 'react';
import { SavedQuizSession } from '../types';
import { Play, RotateCcw, Timer, CheckSquare, Sparkles, X, AlertCircle } from 'lucide-react';

interface ResumeOrRestartModalProps {
  session: SavedQuizSession;
  onResume: () => void;
  onStartFresh: () => void;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const ResumeOrRestartModal: React.FC<ResumeOrRestartModalProps> = ({
  session,
  onResume,
  onStartFresh,
  onClose,
  isDarkMode = false
}) => {
  const { quiz, quizConfig, currentQuestionIndex, userAnswers, timer } = session;
  const answeredCount = userAnswers.filter(a => a.selectedOptionIndex !== null).length;
  const totalQuestions = quiz.questions.length;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className={`w-full max-w-md rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border relative animate-in zoom-in-95 duration-300 overflow-hidden ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
      }`}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        >
          <X size={20} />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-inner">
            <Timer size={28} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Previous Attempt Saved
            </span>
            <h3 className="text-lg font-black tracking-tight mt-1 text-slate-900 dark:text-white line-clamp-1">
              Resume or Start Fresh?
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          Aapne yeh test pehle pause ya close kiya tha. Aap ise wahin se resume kar sakte hain ya nayi shuruaat kar sakte hain:
        </p>

        {/* Test Stats Snapshot Card */}
        <div className={`p-4 rounded-2xl border mb-6 ${
          isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200/70'
        }`}>
          <div className="text-xs font-black text-slate-800 dark:text-slate-200 truncate mb-3" title={quiz.title}>
            📖 {quiz.title}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Position</div>
              <div className="text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5">
                Q {currentQuestionIndex + 1} <span className="text-[10px] text-slate-400 font-bold">/ {totalQuestions}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Answered</div>
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {answeredCount} <span className="text-[10px] text-slate-400 font-bold">Done</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Elapsed</div>
              <div className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                {formatTime(timer)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-700/50 text-[10px]">
            <span className="text-slate-400 font-medium">Mode:</span>
            <span className={`font-black uppercase tracking-wider ${
              quizConfig.mode === 'PRACTICE' ? 'text-emerald-500' : 'text-indigo-500'
            }`}>
              {quizConfig.mode === 'PRACTICE' ? '✦ Practice Mode' : '✓ Exam Mode'}
            </span>
          </div>
        </div>

        {/* Action Buttons: Resume vs Start Fresh */}
        <div className="flex flex-col gap-2.5">
          {/* 1. Resume Option */}
          <button
            onClick={onResume}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2.5"
          >
            <Play size={16} fill="currentColor" />
            <span>Resume from Question {currentQuestionIndex + 1}</span>
          </button>

          {/* 2. Start Fresh Option */}
          <button
            onClick={onStartFresh}
            className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border active:scale-95 ${
              isDarkMode
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <RotateCcw size={15} />
            <span>Start Fresh (From Beginning)</span>
          </button>

          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full py-2.5 text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors uppercase tracking-widest mt-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
