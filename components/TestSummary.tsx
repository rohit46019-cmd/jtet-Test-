import React, { useState } from 'react';
import { 
  Trophy, CheckCircle2, XCircle, MinusCircle, Clock, Sparkles, 
  RotateCcw, Home, Bookmark, Award, Zap, BarChart3, ChevronDown, 
  ChevronUp, Check, X, ArrowRight, Target, HelpCircle, ShieldAlert
} from 'lucide-react';
import { Quiz, UserAnswer, Question, QuizConfig, formatDuration } from '../types';

interface TestSummaryProps {
  quiz: Quiz;
  quizConfig: QuizConfig;
  results: UserAnswer[];
  score: {
    points: number;
    accuracy: number;
    correct: number;
    incorrect: number;
    attempted: number;
    skipped: number;
    totalQuestions: number;
    totalTime: number;
    posMarks: number;
    negMarks: number;
    positiveEarned: number;
    negativeDeducted: number;
    finalMarks: number;
    totalPossibleMarks: number;
  };
  isDarkMode: boolean;
  onRestart: () => void;
  onRetake: () => void;
  onRetakeIncorrect?: (incorrectQuestions: Question[]) => void;
  onBookmark: (q: Question) => void;
  savedIds: Set<string>;
  onExplain: (q: Question, userSelectedOpt: number | null) => void;
}

const highlightQuestionText = (text: string) => {
  if (!text) return null;
  // Return plain text without any highlight styling
  const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '');
  return <span>{cleanText}</span>;
};

export const TestSummary: React.FC<TestSummaryProps> = ({
  quiz,
  quizConfig,
  results,
  score,
  isDarkMode,
  onRestart,
  onRetake,
  onRetakeIncorrect,
  onBookmark,
  savedIds,
  onExplain
}) => {
  const [filter, setFilter] = useState<'ALL' | 'CORRECT' | 'INCORRECT' | 'SKIPPED'>('ALL');
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedQuestions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formattedTime = (seconds: number) => {
    return formatDuration(seconds);
  };

  const avgTimePerQuestion = score.attempted > 0 
    ? (score.totalTime / score.attempted).toFixed(1) 
    : '0';

  // Get incorrect questions list for retry
  const incorrectQuestions = quiz.questions.filter((q, idx) => {
    const userAnswer = results.find(a => 
      a.questionIndex !== undefined ? a.questionIndex === idx : a.questionId === q.id
    );
    const selectedIdx = userAnswer ? userAnswer.selectedOptionIndex : null;
    return selectedIdx !== null && selectedIdx !== q.correctAnswerIndex;
  });

  // Filter questions according to active filter tab
  const filteredQuestions = quiz.questions.map((q, idx) => {
    const userAnswer = results.find(a => 
      a.questionIndex !== undefined ? a.questionIndex === idx : a.questionId === q.id
    );
    const selectedIdx = userAnswer ? userAnswer.selectedOptionIndex : null;
    const isCorrect = selectedIdx === q.correctAnswerIndex;
    const isSkipped = selectedIdx === null;
    const isIncorrect = selectedIdx !== null && !isCorrect;

    return {
      q,
      idx,
      userAnswer,
      selectedIdx,
      isCorrect,
      isSkipped,
      isIncorrect
    };
  }).filter(item => {
    if (filter === 'CORRECT') return item.isCorrect;
    if (filter === 'INCORRECT') return item.isIncorrect;
    if (filter === 'SKIPPED') return item.isSkipped;
    return true;
  });

  // Grade badge determination
  let gradeBadge = {
    title: 'Outstanding Performance!',
    sub: 'You have mastered this test module with flying colors!',
    color: 'from-emerald-600 to-teal-600',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    icon: <Trophy className="text-amber-400 animate-bounce" size={28} />
  };

  if (score.accuracy < 50) {
    gradeBadge = {
      title: 'Keep Practicing!',
      sub: 'Review the detailed answers below to strengthen your weak topics.',
      color: 'from-amber-600 to-orange-600',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      icon: <Target className="text-amber-500" size={28} />
    };
  } else if (score.accuracy < 80) {
    gradeBadge = {
      title: 'Great Effort!',
      sub: 'Good foundation! A quick review of wrong answers will push you to 100%.',
      color: 'from-blue-600 to-indigo-600',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      icon: <Award className="text-blue-400" size={28} />
    };
  }

  return (
    <div className="w-full max-w-2xl mx-auto pt-4 pb-24 px-0 sm:px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* HEADER CARD */}
      <div className="w-full px-4 sm:px-0 mb-6 relative overflow-hidden transition-all text-slate-900 dark:text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              {gradeBadge.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${gradeBadge.badgeBg}`}>
                  {gradeBadge.title}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {quizConfig.mode === 'PRACTICE' ? 'Practice Mode' : 'Test Exam Mode'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate max-w-md">
                {quiz.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={onRetake}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
            >
              <RotateCcw size={13} /> Retake
            </button>
            <button
              onClick={onRestart}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-wider shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Home size={13} /> Dashboard
            </button>
          </div>
        </div>

        {/* HERO SCORE BANNER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          
          {/* Main Marks Box */}
          <div className="md:col-span-2 rounded-2xl p-5 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
            
            <div className="flex items-center justify-between mb-3 z-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-300 flex items-center gap-1.5">
                <BarChart3 size={13} /> Overall Performance Score
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 font-black text-xs">
                {score.accuracy}% Accuracy
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4 z-10">
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                {score.finalMarks}
              </span>
              <span className="text-lg sm:text-xl font-bold text-slate-300">
                / {score.totalPossibleMarks} Marks
              </span>
            </div>

            {/* Accuracy Bar */}
            <div className="space-y-1.5 z-10">
              <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden p-0.5 flex">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-sm"
                  style={{ width: `${(score.correct / score.totalQuestions) * 100}%` }}
                />
                <div 
                  className="h-full bg-rose-500 rounded-full transition-all duration-1000 shadow-sm ml-0.5"
                  style={{ width: `${(score.incorrect / score.totalQuestions) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="text-emerald-400">Correct ({score.correct})</span>
                <span className="text-rose-400">Incorrect ({score.incorrect})</span>
                <span>Skipped ({score.skipped})</span>
              </div>
            </div>
          </div>

          {/* Points & Speed Quick Stats */}
          <div className="flex flex-col gap-3 justify-between">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 dark:bg-amber-950/20 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 block">Rank Points</span>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">+{score.points} PTS</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                <Zap size={20} fill="currentColor" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Avg Time / Question</span>
                <span className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5 block">{avgTimePerQuestion}s</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Clock size={18} />
              </div>
            </div>
          </div>

        </div>

        {/* 4 DETAILED STAT CARDS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Correct */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
              <CheckCircle2 size={15} />
              <span className="text-[9px] font-black uppercase tracking-wider">Correct</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">+{score.positiveEarned}</span>
              <span className="text-[10px] font-extrabold text-emerald-600/70 dark:text-emerald-400/70">
                {score.correct} / {score.totalQuestions}
              </span>
            </div>
          </div>

          {/* Incorrect */}
          <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 mb-1">
              <XCircle size={15} />
              <span className="text-[9px] font-black uppercase tracking-wider">Incorrect</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-rose-700 dark:text-rose-300">-{score.negativeDeducted}</span>
              <span className="text-[10px] font-extrabold text-rose-600/70 dark:text-rose-400/70">
                {score.incorrect} Qs
              </span>
            </div>
          </div>

          {/* Skipped */}
          <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
              <MinusCircle size={15} />
              <span className="text-[9px] font-black uppercase tracking-wider">Skipped</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-slate-700 dark:text-slate-300">{score.skipped}</span>
              <span className="text-[10px] font-bold text-slate-400">Unanswered</span>
            </div>
          </div>

          {/* Total Time */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-slate-800/50 border border-blue-100 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1">
              <Clock size={15} />
              <span className="text-[9px] font-black uppercase tracking-wider">Total Duration</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-blue-900 dark:text-blue-200">{formattedTime(score.totalTime)}</span>
              <span className="text-[10px] font-bold text-slate-400">Time spent</span>
            </div>
          </div>
        </div>

      </div>

      {/* QUICK RETAKE WEAK AREAS BANNER IF INCORRECT > 0 */}
      {incorrectQuestions.length > 0 && onRetakeIncorrect && (
        <div className="mb-6 mx-4 sm:mx-0 p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-blue-500/10 border border-rose-500/20 dark:border-rose-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                Practice Your Weak Spots ({incorrectQuestions.length} Incorrect Questions)
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Retake only the questions you got wrong to turn errors into mastery!
              </p>
            </div>
          </div>
          <button
            onClick={() => onRetakeIncorrect(incorrectQuestions)}
            className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-md shadow-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <RotateCcw size={13} /> Retry Incorrect ({incorrectQuestions.length})
          </button>
        </div>
      )}

      {/* QUESTION SOLUTION & REVIEW SECTION */}
      <div className="w-full px-4 sm:px-0 transition-all text-slate-900 dark:text-white">
        
        {/* Section Title & Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400" />
              Detailed Solutions & Explanations
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Review correct answers, common traps & concept breakdowns
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                filter === 'ALL' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({quiz.questions.length})
            </button>
            <button
              onClick={() => setFilter('CORRECT')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                filter === 'CORRECT' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              Correct ({score.correct})
            </button>
            <button
              onClick={() => setFilter('INCORRECT')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                filter === 'INCORRECT' 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              Incorrect ({score.incorrect})
            </button>
            <button
              onClick={() => setFilter('SKIPPED')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                filter === 'SKIPPED' 
                  ? 'bg-slate-700 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Skipped ({score.skipped})
            </button>
          </div>
        </div>

        {/* QUESTIONS LIST */}
        {filteredQuestions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <HelpCircle size={32} className="mx-auto opacity-50" />
            <p className="text-xs font-bold uppercase tracking-wider">No questions found for this filter tab</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map(({ q, idx, selectedIdx, isCorrect, isSkipped }) => {
              const isSaved = savedIds.has(q.id);
              const isExpanded = expandedQuestions[q.id] ?? true;

              return (
                <div 
                  key={q.id || idx}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isCorrect 
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/50' 
                      : isSkipped 
                        ? 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80' 
                        : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/50'
                  }`}
                >
                  {/* Question Header Card Bar */}
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isCorrect 
                          ? 'bg-emerald-500 text-white' 
                          : isSkipped 
                            ? 'bg-slate-400 text-white' 
                            : 'bg-rose-500 text-white'
                      }`}>
                        Q{idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider ${
                            isCorrect 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' 
                              : isSkipped 
                                ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' 
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                          }`}>
                            {isCorrect ? '✓ Correct Answer' : isSkipped ? 'Skipped' : '✕ Incorrect Pick'}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed">
                          {highlightQuestionText(q.question)}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Save/Bookmark Button */}
                      <button
                        onClick={() => onBookmark(q)}
                        className={`p-1.5 rounded-lg transition-all ${
                          isSaved 
                            ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300' 
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                        }`}
                        title={isSaved ? "Saved in Vault" : "Bookmark Question"}
                      >
                        <Bookmark size={15} fill={isSaved ? "currentColor" : "none"} />
                      </button>

                      {/* Expand / Collapse toggle */}
                      <button
                        onClick={() => toggleExpand(q.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-all"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Question Content (Options & Explanations) */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100/60 dark:border-slate-800/60">
                      {/* Options List */}
                      <div className="grid grid-cols-1 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isOptionCorrect = optIdx === q.correctAnswerIndex;
                          const isOptionSelected = optIdx === selectedIdx;

                          let optStyle = 'bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                          let badge = null;

                          if (isOptionCorrect) {
                            optStyle = 'bg-emerald-100/90 dark:bg-emerald-950/60 border-emerald-400 text-emerald-950 dark:text-emerald-100 font-bold ring-1 ring-emerald-500/30';
                            badge = (
                              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1 shrink-0">
                                <Check size={10} /> Correct Answer
                              </span>
                            );
                          } else if (isOptionSelected && !isOptionCorrect) {
                            optStyle = 'bg-rose-100/90 dark:bg-rose-950/60 border-rose-400 text-rose-950 dark:text-rose-100 font-bold ring-1 ring-rose-500/30';
                            badge = (
                              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 shrink-0">
                                <X size={10} /> Your Choice
                              </span>
                            );
                          }

                          return (
                            <div 
                              key={optIdx}
                              className={`p-2.5 sm:p-3 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all ${optStyle}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 ${
                                  isOptionCorrect ? 'bg-emerald-600 text-white' : isOptionSelected ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="leading-snug">{opt}</span>
                              </div>
                              {badge}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation & AI Teacher Bar */}
                      <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-blue-600 dark:text-blue-400 font-black text-[9.5px] uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={12} className="text-amber-500" /> Explanation & Concept Breakdown
                          </span>
                          <button
                            onClick={() => onExplain(q, selectedIdx)}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs active:scale-95 transition-all shrink-0"
                          >
                            <Sparkles size={11} className="text-amber-300" /> AI Deep Concept
                          </button>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-xs leading-normal">
                          {q.explanation || "No static explanation available. Click 'AI Deep Concept' for a complete step-by-step breakdown!"}
                        </p>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER ACTION BAR */}
      <div className="mt-8 px-4 sm:px-0 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button 
          onClick={onRestart} 
          className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Home size={16} /> Return To Dashboard
        </button>

        <button 
          onClick={onRetake} 
          className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} /> Retake Full Test
        </button>
      </div>

    </div>
  );
};
