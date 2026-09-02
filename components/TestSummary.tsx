import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, CheckCircle2, XCircle, MinusCircle, Clock, Sparkles, 
  RotateCcw, Home, Bookmark, Award, Zap, BarChart3, ChevronDown, 
  ChevronUp, Check, X, ArrowRight, Target, HelpCircle, ShieldAlert, ArrowLeft, Share2
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

  useEffect(() => {
    if (score.accuracy >= 40) {
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.4 },
        colors: ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ec4899']
      });
    }
  }, [score.accuracy]);

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
    <div className="w-full max-w-md mx-auto pt-2 pb-24 px-4 animate-in fade-in slide-in-from-bottom-4 duration-300 text-slate-900 dark:text-white">
      
      {/* TOP APP HEADER */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          onClick={onRestart}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all shadow-xs shrink-0"
          title="Back to Home"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="text-center min-w-0 flex-1 px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Performance Analysis
          </span>
          <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate" title={quiz.title}>
            {quiz.title}
          </h1>
        </div>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: quiz.title, text: `I scored ${score.finalMarks} marks with ${score.accuracy}% accuracy on ${quiz.title}!` }).catch(() => {});
            } else {
              navigator.clipboard.writeText(window.location.href);
              alert("Link copied to clipboard!");
            }
          }}
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all shadow-xs shrink-0"
          title="Share Score"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* 1. SCORE BANNER WITH ROUND GRAPH */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 shadow-xl mb-4 text-center relative overflow-hidden">
        {/* Circular SVG Donut Graph */}
        <div className="relative w-28 h-28 mx-auto mb-3 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-100 dark:text-slate-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-slate-900 dark:text-white"
              strokeDasharray={`${score.finalMarks > 0 ? (score.finalMarks / (score.totalPossibleMarks || 1)) * 100 : 0}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {score.finalMarks}/{score.totalPossibleMarks}
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Marks</span>
          </div>
        </div>

        <div className="inline-block px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs mb-2">
          {score.accuracy}% Accuracy
        </div>

        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
          {score.accuracy >= 50 ? 'Outstanding performance!' : 'You missed the mark'}
        </p>

        {/* 3 STATS CARDS (Correct, Wrong, Skip) */}
        <div className="grid grid-cols-3 gap-2.5 mt-5">
          {/* Correct */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl text-center">
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto mb-1.5">
              <Check size={14} className="stroke-[3]" />
            </div>
            <div className="text-[10px] font-extrabold text-slate-400 uppercase">Correct</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">{score.correct}</div>
          </div>

          {/* Wrong */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl text-center">
            <div className="w-7 h-7 rounded-full bg-rose-500/15 text-rose-600 flex items-center justify-center mx-auto mb-1.5">
              <X size={14} className="stroke-[3]" />
            </div>
            <div className="text-[10px] font-extrabold text-slate-400 uppercase">Wrong</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">{score.incorrect}</div>
          </div>

          {/* Skip */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl text-center">
            <div className="w-7 h-7 rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto mb-1.5">
              <MinusCircle size={14} />
            </div>
            <div className="text-[10px] font-extrabold text-slate-400 uppercase">Skip</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">{score.skipped}</div>
          </div>
        </div>
      </div>

      {/* 2. POINTS & SCORING BREAKDOWN CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-5 shadow-lg mb-6 space-y-4">
        {/* Points Earned Header row */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Trophy size={16} />
            </div>
            <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">Points Earned</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-black text-xs">
            +{score.points} PTS
          </span>
        </div>

        {/* Rank Points */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500" /> Rank Points
          </span>
          <span className="font-black text-slate-900 dark:text-white">+{score.points} PTS</span>
        </div>

        <div className="text-[10px] font-black tracking-wider text-slate-400 uppercase text-center pt-1">
          Scoring
        </div>

        {/* Scoring list */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Correct
            </span>
            <span className="font-black text-emerald-600">+{score.positiveEarned}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Incorrect
            </span>
            <span className="font-black text-rose-600">-{score.negativeDeducted}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> Skipped
            </span>
            <span className="font-black text-slate-600 dark:text-slate-400">{score.skipped}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Clock size={13} className="text-blue-500" /> Duration
            </span>
            <span className="font-black text-slate-900 dark:text-white">{formattedTime(score.totalTime)}</span>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM BUTTONS (Review Answers & Try Again) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            const event = new CustomEvent('open-detailed-solutions');
            window.dispatchEvent(event);
          }}
          className="py-3.5 px-4 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs uppercase tracking-wider border border-slate-200 dark:border-slate-800 shadow-sm active:scale-95 transition-all text-center"
        >
          Review Answers
        </button>

        <button
          onClick={onRetake}
          className="py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all text-center"
        >
          Try Again
        </button>
      </div>

    </div>
  );
};
