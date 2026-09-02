import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, CheckCircle2, XCircle, Bookmark, Sparkles, 
  HelpCircle, ChevronLeft, ChevronRight, Check, X, Brain, Grid, Home, RotateCcw
} from 'lucide-react';
import { Quiz, UserAnswer, Question } from '../types';

interface TestSolutionsPageProps {
  quiz: Quiz;
  results: UserAnswer[];
  score: {
    correct: number;
    incorrect: number;
    skipped: number;
    totalQuestions: number;
  };
  isDarkMode: boolean;
  onBack: () => void;
  onRetake?: () => void;
  onBookmark: (q: Question) => void;
  savedIds: Set<string>;
  onExplain: (q: Question, userSelectedOpt: number | null) => void;
}

const highlightQuestionText = (text: string) => {
  if (!text) return null;
  const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '');
  return <span>{cleanText}</span>;
};

export const TestSolutionsPage: React.FC<TestSolutionsPageProps> = ({
  quiz,
  results,
  score,
  isDarkMode,
  onBack,
  onRetake,
  onBookmark,
  savedIds,
  onExplain
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [showPalette, setShowPalette] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'CORRECT' | 'INCORRECT' | 'SKIPPED'>('ALL');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    if (distance > 45) {
      // Swiped left -> Next
      handleNext();
    } else if (distance < -45) {
      // Swiped right -> Prev
      handlePrev();
    }
  };

  // Filter indices map
  const questionItems = quiz.questions.map((q, idx) => {
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
      selectedIdx,
      isCorrect,
      isSkipped,
      isIncorrect
    };
  });

  const filteredItems = questionItems.filter(item => {
    if (filter === 'CORRECT') return item.isCorrect;
    if (filter === 'INCORRECT') return item.isIncorrect;
    if (filter === 'SKIPPED') return item.isSkipped;
    return true;
  });

  const currentItem = questionItems[currentQuestionIndex];
  if (!currentItem) return null;

  const { q: currentQuestion, selectedIdx, isCorrect, isSkipped, isIncorrect } = currentItem;
  const isSaved = savedIds.has(currentQuestion.id);

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setSlideDirection(1);
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setSlideDirection(-1);
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#fcfdfe] dark:bg-slate-950 text-slate-900 dark:text-white select-text">
      
      {/* Question Navigator Modal/Drawer */}
      <AnimatePresence>
        {showPalette && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Grid size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white">Question Navigator</h3>
                    <p className="text-[10px] font-bold text-slate-400">Click any question number to jump directly</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPalette(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status Legend */}
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider px-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Correct ({score.correct})
                </span>
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Wrong ({score.incorrect})
                </span>
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Skipped ({score.skipped})
                </span>
              </div>

              {/* Question Grid */}
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto p-1 scroll-smooth">
                {quiz.questions.map((_, i) => {
                  const item = questionItems[i];
                  const isActive = i === currentQuestionIndex;
                  let bgClass = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700";

                  if (isActive) {
                    bgClass = "bg-blue-600 text-white font-black ring-4 ring-blue-500/30 scale-105 border-2 border-blue-700 shadow-md";
                  } else if (item.isCorrect) {
                    bgClass = "bg-emerald-500 text-white font-black";
                  } else if (item.isIncorrect) {
                    bgClass = "bg-rose-500 text-white font-black";
                  } else if (item.isSkipped) {
                    bgClass = "bg-amber-500 text-white font-black";
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setSlideDirection(i >= currentQuestionIndex ? 1 : -1);
                        setCurrentQuestionIndex(i);
                        setShowPalette(false);
                      }}
                      className={`h-11 rounded-xl flex items-center justify-center font-black text-xs transition-all active:scale-95 ${bgClass}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  onClick={() => setShowPalette(false)}
                  className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-wider"
                >
                  Close Navigator
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Test-like Header Navigation */}
      <div className="bg-slate-900 text-white dark:bg-slate-950 border-b border-slate-800 px-3 sm:px-4 py-3 shadow-md flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs active:scale-95 shrink-0"
            title="Back"
          >
            <ArrowLeft size={13} /> <span>Back</span>
          </button>

          {/* Question Navigator Trigger */}
          <button
            onClick={() => setShowPalette(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded-xl font-black text-xs uppercase tracking-wider transition-all border border-blue-500/30 shadow-xs active:scale-95 shrink-0"
            title="Open Question Navigator Grid"
          >
            <Grid size={14} />
            <span>Q {currentQuestionIndex + 1} / {quiz.questions.length}</span>
          </button>
        </div>

        <div className="text-center hidden md:block flex-1 mx-2">
          <h2 className="text-xs font-black tracking-tight text-white truncate max-w-xs mx-auto">
            {quiz.title}
          </h2>
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Solutions & Explanation Mode</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Reattempt Button */}
          {onRetake && (
            <button
              onClick={onRetake}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
              title="Reattempt Test"
            >
              <RotateCcw size={14} /> <span className="hidden sm:inline">Reattempt</span>
            </button>
          )}

          {/* Status Badge */}
          {isCorrect && (
            <span className="hidden sm:flex px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider border border-emerald-500/30 items-center gap-1">
              <CheckCircle2 size={12} /> Correct
            </span>
          )}
          {isIncorrect && (
            <span className="hidden sm:flex px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-wider border border-rose-500/30 items-center gap-1">
              <XCircle size={12} /> Incorrect
            </span>
          )}
          {isSkipped && (
            <span className="hidden sm:flex px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 text-[9px] font-black uppercase tracking-wider items-center gap-1">
              Skipped
            </span>
          )}

          <button
            onClick={() => onBookmark(currentQuestion)}
            className={`p-2 rounded-xl transition-all ${
              isSaved ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-amber-400'
            }`}
            title="Bookmark Question"
          >
            <Bookmark size={15} fill={isSaved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Filter View:</span>
          <button
            onClick={() => { setFilter('ALL'); setCurrentQuestionIndex(0); }}
            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
              filter === 'ALL' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            All ({quiz.questions.length})
          </button>
          <button
            onClick={() => { setFilter('CORRECT'); const first = questionItems.findIndex(i => i.isCorrect); if(first !== -1) setCurrentQuestionIndex(first); }}
            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
              filter === 'CORRECT' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Correct ({score.correct})
          </button>
          <button
            onClick={() => { setFilter('INCORRECT'); const first = questionItems.findIndex(i => i.isIncorrect); if(first !== -1) setCurrentQuestionIndex(first); }}
            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
              filter === 'INCORRECT' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Incorrect ({score.incorrect})
          </button>
          <button
            onClick={() => { setFilter('SKIPPED'); const first = questionItems.findIndex(i => i.isSkipped); if(first !== -1) setCurrentQuestionIndex(first); }}
            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
              filter === 'SKIPPED' ? 'bg-slate-700 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Skipped ({score.skipped})
          </button>
        </div>
      </div>

      {/* Horizontal Question Circle Navigator Bar (Exactly like test taking) */}
      <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 py-2.5 px-4">
        <div className="max-w-3xl mx-auto flex items-center gap-1.5 overflow-x-auto scroll-smooth no-scrollbar">
          {quiz.questions.map((_, i) => {
            const item = questionItems[i];
            const isActive = i === currentQuestionIndex;

            let circleClass = "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700";
            if (isActive) {
              circleClass = "bg-blue-600 text-white ring-4 ring-blue-500/30 scale-105 font-black border-2 border-blue-700";
            } else if (item.isCorrect) {
              circleClass = "bg-emerald-500 text-white font-bold";
            } else if (item.isIncorrect) {
              circleClass = "bg-rose-500 text-white font-bold";
            } else if (item.isSkipped) {
              circleClass = "bg-amber-500 text-white font-bold";
            }

            return (
              <button
                key={i}
                onClick={() => {
                  setSlideDirection(i >= currentQuestionIndex ? 1 : -1);
                  setCurrentQuestionIndex(i);
                }}
                className={`w-9 h-9 rounded-full text-xs flex items-center justify-center font-black transition-all shrink-0 ${circleClass}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Card Area (Test Taking UI style) */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="popLayout" custom={slideDirection}>
          <motion.div
            key={currentQuestionIndex}
            custom={slideDirection}
            variants={{
              enter: (dir: number) => ({
                x: dir > 0 ? "100%" : "-100%",
                opacity: 0.8,
              }),
              center: {
                x: "0%",
                opacity: 1,
              },
              exit: (dir: number) => ({
                x: dir > 0 ? "-100%" : "100%",
                opacity: 0.8,
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 280, damping: 28 },
              opacity: { duration: 0.2 },
            }}
            className="w-full max-w-2xl mx-auto space-y-5"
          >
            {/* Question Text Box */}
            <div className="bg-blue-50/40 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  Question #{currentQuestionIndex + 1} of {quiz.questions.length}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-relaxed break-words">
                {highlightQuestionText(currentQuestion.question)}
              </h3>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQuestion.options.map((opt, optIdx) => {
                const isOptionCorrect = optIdx === currentQuestion.correctAnswerIndex;
                const isUserChoice = optIdx === selectedIdx;

                let optStyle = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300";
                let badge = null;

                if (isOptionCorrect) {
                  optStyle = "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold ring-1 ring-emerald-500/30";
                  badge = (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                      <Check size={11} /> Correct Answer
                    </span>
                  );
                } else if (isUserChoice && !isOptionCorrect) {
                  optStyle = "bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-950 dark:text-rose-100 font-bold ring-1 ring-rose-500/30";
                  badge = (
                    <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                      <X size={11} /> Your Choice
                    </span>
                  );
                }

                return (
                  <div 
                    key={optIdx}
                    className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center justify-between gap-3 transition-all ${optStyle}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isOptionCorrect ? 'bg-emerald-600 text-white' : isUserChoice ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="leading-snug break-words">{opt}</span>
                    </div>
                    {badge}
                  </div>
                );
              })}
            </div>

            {/* Explanation & AI Concept Deep Dive */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Brain size={16} className="text-amber-500" /> Explanation & Concept Insight
                </span>
                <button
                  onClick={() => onExplain(currentQuestion, selectedIdx)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs active:scale-95 transition-all shrink-0"
                >
                  <Sparkles size={12} className="text-amber-300" /> AI Deep Concept
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {currentQuestion.explanation || "No static explanation available. Click 'AI Deep Concept' for a complete breakdown!"}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Navigation Footer (Previous / Reattempt / Next) */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-2 shadow-lg z-20">
        <button
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
          className={`px-4 sm:px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all ${
            currentQuestionIndex === 0 
              ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400' 
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 active:scale-95'
          }`}
        >
          <ChevronLeft size={16} /> <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-2">
          {onRetake && (
            <button
              onClick={onRetake}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
              title="Reattempt Test"
            >
              <RotateCcw size={14} /> Reattempt
            </button>
          )}

          <span className="text-[11px] sm:text-xs font-black text-slate-500 dark:text-slate-400 hidden md:inline">
            Q {currentQuestionIndex + 1} of {quiz.questions.length}
          </span>
        </div>

        <button
          onClick={handleNext}
          disabled={currentQuestionIndex === quiz.questions.length - 1}
          className={`px-4 sm:px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all ${
            currentQuestionIndex === quiz.questions.length - 1 
              ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400' 
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 active:scale-95'
          }`}
        >
          <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
        </button>
      </div>

    </div>
  );
};
