import React, { useState, useEffect } from 'react';
import { Sparkles, X, CheckCircle2, AlertTriangle, Check, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { Question, Quiz } from '../types';
import { auditAndFixQuizQuestions, AuditFixResult } from '../services/geminiService';

interface AiAuditModalProps {
  quiz: Quiz;
  isOpen: boolean;
  onClose: () => void;
  onApplyFixedQuiz: (updatedQuiz: Quiz) => void;
  isDarkMode?: boolean;
}

export const AiAuditModal: React.FC<AiAuditModalProps> = ({
  quiz,
  isOpen,
  onClose,
  onApplyFixedQuiz,
  isDarkMode: propDarkMode
}) => {
  const isDarkMode = propDarkMode ?? (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const [isRunning, setIsRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditFixResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startAudit = async () => {
    try {
      setIsRunning(true);
      setError(null);
      const result = await auditAndFixQuizQuestions(quiz.questions);
      setAuditResult(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to complete AI audit. Please check your API key.');
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setAuditResult(null);
      startAudit();
    }
  }, [isOpen, quiz.id]);

  const handleApply = () => {
    if (!auditResult) return;
    const updatedQuiz: Quiz = {
      ...quiz,
      questions: auditResult.questions
    };
    onApplyFixedQuiz(updatedQuiz);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[320] flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRunning) onClose();
      }}
    >
      <div 
        className={`w-full max-w-2xl my-2 sm:my-auto max-h-[92vh] sm:max-h-[85vh] rounded-3xl shadow-2xl border transition-all flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-800 text-white' 
            : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Sticky Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight truncate">
                  AI Quiz Answer Audit & Auto-Fix
                </h3>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
                  Verification
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                Detects wrongly marked answers & repairs explanations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRunning}
            aria-label="Close"
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/40 text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 font-bold text-xs flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40"
          >
            <X size={16} />
            <span className="hidden xs:inline">Close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.5)_transparent]">
          {/* Target Quiz Overview */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Target Quiz</span>
              <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate max-w-sm">
                {quiz.title}
              </h4>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Questions</span>
              <div className="text-xs font-black text-blue-600 dark:text-blue-400">
                {quiz.questions.length} Questions
              </div>
            </div>
          </div>

          {/* Running State */}
          {isRunning && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center animate-spin">
                  <RefreshCw size={28} />
                </div>
              </div>
              <div className="text-center">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  AI is Fact-Checking Answer Keys...
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-md">
                  Analyzing all {quiz.questions.length} questions, cross-verifying each option against verified facts, and correcting wrong ticks.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isRunning && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle size={16} />
                <span>Audit Error</span>
              </div>
              <p className="text-[11px]">{error}</p>
              <button
                onClick={startAudit}
                className="mt-2 px-3 py-1.5 bg-rose-600 text-white rounded-xl text-[10px] font-bold"
              >
                Retry Audit
              </button>
            </div>
          )}

          {/* Audit Completed Results */}
          {auditResult && !isRunning && (
            <div className="space-y-4">
              {/* Summary Stats Card */}
              <div className={`p-4 rounded-2xl border ${
                auditResult.fixedCount > 0 
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' 
                  : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
              }`}>
                <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide">
                  {auditResult.fixedCount > 0 ? (
                    <>
                      <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
                      <span className="text-amber-800 dark:text-amber-300">
                        {auditResult.fixedCount} Wrong Answer(s) Detected & Fixed!
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-800 dark:text-emerald-300">
                        All {quiz.questions.length} Answers Are 100% Correct & Verified!
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                  {auditResult.fixedCount > 0
                    ? `AI successfully identified ${auditResult.fixedCount} question(s) where the answer key was incorrectly ticked. Explanations were also enhanced.`
                    : 'No incorrect answer keys found. Explanations and concept notes have been enhanced for high-yield revision.'}
                </p>
              </div>

              {/* List of Corrected Items (if any) */}
              {auditResult.fixedCount > 0 && (
                <div className="space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                    Corrections Applied ({auditResult.auditNotes.length})
                  </div>
                  {auditResult.auditNotes.map((note, nIdx) => (
                    <div
                      key={nIdx}
                      className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-400">
                        <span>Question #{note.questionIndex}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                          Key Fixed
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-800 dark:text-white leading-snug">
                        {note.questionText}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300">
                          <span className="text-[9px] font-black uppercase text-rose-500 block mb-0.5">
                            Old Wrong Key (पहले गलत था)
                          </span>
                          <div className="line-through font-medium truncate">
                            Option {String.fromCharCode(65 + note.oldCorrectIndex)}: {note.oldOption}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300">
                          <span className="text-[9px] font-black uppercase text-emerald-600 block mb-0.5">
                            Verified Correct Answer (AI द्वारा सही किया गया)
                          </span>
                          <div className="font-bold truncate">
                            Option {String.fromCharCode(65 + note.newCorrectIndex)}: {note.newOption}
                          </div>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-[10px] text-slate-600 dark:text-slate-400">
                        <strong className="text-blue-600 dark:text-blue-400">AI Reason: </strong>
                        {note.reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 gap-2">
          <button
            onClick={onClose}
            disabled={isRunning}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition active:scale-95"
          >
            Cancel
          </button>

          {auditResult && !isRunning ? (
            <button
              onClick={handleApply}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Check size={16} />
              <span>Apply & Save {auditResult.fixedCount > 0 ? `${auditResult.fixedCount} Fixes` : 'Audit'}</span>
            </button>
          ) : (
            <button
              onClick={startAudit}
              disabled={isRunning}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
              <span>{isRunning ? 'Auditing...' : 'Re-Run Audit'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
