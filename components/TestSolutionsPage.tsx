import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, CheckCircle2, XCircle, Bookmark, Sparkles, 
  ChevronLeft, ChevronRight, Check, X, Brain, Grid, RotateCcw, Clock, Search, Filter
} from 'lucide-react';
import { Quiz, UserAnswer, Question, formatDuration } from '../types';

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

const FormattedExplanationBox: React.FC<{ text?: string }> = ({ text }) => {
  if (!text || !text.trim()) {
    return (
      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 italic">
        No static explanation available. Click 'AI Deep Concept' for a complete breakdown!
      </p>
    );
  }

  const blocks = text.split(/\n+/).map(b => b.trim()).filter(Boolean);

  return (
    <div className="space-y-2 text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
      {blocks.map((block, bIdx) => {
        const isBullet = block.startsWith('•') || block.startsWith('-') || block.startsWith('* ') || /^\d+[\.\)]\s+/.test(block);
        const cleanBlock = isBullet ? block.replace(/^[•\-\*\d\.\)]\s*/, '') : block;
        const parts = cleanBlock.split(/(\*\*.*?\*\*|\*.*?\*)/g);

        return (
          <div key={bIdx} className={`flex items-start gap-1.5 ${isBullet ? 'pl-2.5 my-1' : 'my-1.5'}`}>
            {isBullet && <span className="text-blue-500 dark:text-blue-400 font-extrabold text-xs select-none shrink-0">•</span>}
            <div className="flex-1 break-words">
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                  const inner = part.slice(2, -2);
                  return (
                    <strong
                      key={pIdx}
                      className="font-black text-amber-950 dark:text-amber-100 bg-amber-200/80 dark:bg-amber-900/50 px-1.5 py-0.5 mx-0.5 rounded-md border border-amber-400/50 dark:border-amber-700/50 inline-block shadow-2xs"
                    >
                      {inner}
                    </strong>
                  );
                }
                if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                  return (
                    <em key={pIdx} className="italic text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded">
                      {part.slice(1, -1)}
                    </em>
                  );
                }
                return part;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Filter & Search inside Question Navigator
  const [navFilter, setNavFilter] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'SKIPPED' | 'BOOKMARKED'>('ALL');
  const [navSearch, setNavSearch] = useState('');

  // Reattempt mode state inside Review page
  const [isReattemptMode, setIsReattemptMode] = useState(false);
  // Map of questionIndex -> user's reattempt chosen option index
  const [reattemptChoices, setReattemptChoices] = useState<Record<number, number>>({});

  const questionItems = quiz.questions.map((q, idx) => {
    const userAnswer = results.find(a => 
      a.questionIndex !== undefined ? a.questionIndex === idx : a.questionId === q.id
    );
    const selectedIdx = userAnswer ? userAnswer.selectedOptionIndex : null;
    const timeSpent = userAnswer?.timeSpent || 0;
    const isCorrect = selectedIdx === q.correctAnswerIndex;
    const isSkipped = selectedIdx === null;
    const isIncorrect = selectedIdx !== null && !isCorrect;
    const isBookmarked = savedIds.has(q.id);

    return {
      q,
      idx,
      selectedIdx,
      timeSpent,
      isCorrect,
      isSkipped,
      isIncorrect,
      isBookmarked
    };
  });

  const currentItem = questionItems[currentQuestionIndex];

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

  // Keyboard navigation support (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, quiz.questions.length]);

  if (!currentItem) return null;

  const { q: currentQuestion, selectedIdx, timeSpent, isCorrect, isSkipped, isIncorrect } = currentItem;
  const isSaved = savedIds.has(currentQuestion.id);

  // Reattempt choice for current question
  const reattemptChoice = reattemptChoices[currentQuestionIndex];
  const hasReattempted = reattemptChoice !== undefined;

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
      handleNext();
    } else if (distance < -45) {
      handlePrev();
    }
  };

  // Toggle Reattempt mode
  const handleToggleReattempt = () => {
    setIsReattemptMode(prev => !prev);
  };

  // Handle reattempt option click
  const handleReattemptSelectOption = (optIdx: number) => {
    setReattemptChoices(prev => ({
      ...prev,
      [currentQuestionIndex]: optIdx
    }));
  };

  // Filter question items for Navigator
  const filteredNavItems = questionItems.filter(item => {
    // Filter condition
    if (navFilter === 'CORRECT' && !item.isCorrect) return false;
    if (navFilter === 'WRONG' && !item.isIncorrect) return false;
    if (navFilter === 'SKIPPED' && !item.isSkipped) return false;
    if (navFilter === 'BOOKMARKED' && !item.isBookmarked) return false;

    // Search condition
    if (navSearch.trim()) {
      const query = navSearch.toLowerCase();
      const qNum = (item.idx + 1).toString();
      const qText = item.q.question.toLowerCase();
      return qNum.includes(query) || qText.includes(query);
    }
    return true;
  });

  // Reusable Question Navigator Grid Component
  const renderNavigatorContent = (onClose?: () => void) => (
    <div className="space-y-3.5">
      {/* Header Info & Stats */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Grid size={18} />
          </div>
          <div>
            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-white">Question Navigator</h3>
            <p className="text-[10px] font-bold text-slate-400">Total {quiz.questions.length} Questions</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-all"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Quick Search Bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text"
          value={navSearch}
          onChange={e => setNavSearch(e.target.value)}
          placeholder="Search Q# or text..."
          className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 rounded-xl text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        {navSearch && (
          <button 
            onClick={() => setNavSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px] font-extrabold uppercase tracking-wider">
        <button
          onClick={() => setNavFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg shrink-0 transition-all ${navFilter === 'ALL' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
        >
          All ({quiz.questions.length})
        </button>
        <button
          onClick={() => setNavFilter('CORRECT')}
          className={`px-2.5 py-1 rounded-lg shrink-0 transition-all ${navFilter === 'CORRECT' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'}`}
        >
          Correct ({score.correct})
        </button>
        <button
          onClick={() => setNavFilter('WRONG')}
          className={`px-2.5 py-1 rounded-lg shrink-0 transition-all ${navFilter === 'WRONG' ? 'bg-rose-600 text-white' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'}`}
        >
          Wrong ({score.incorrect})
        </button>
        <button
          onClick={() => setNavFilter('SKIPPED')}
          className={`px-2.5 py-1 rounded-lg shrink-0 transition-all ${navFilter === 'SKIPPED' ? 'bg-amber-600 text-white' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'}`}
        >
          Skipped ({score.skipped})
        </button>
        <button
          onClick={() => setNavFilter('BOOKMARKED')}
          className={`px-2.5 py-1 rounded-lg shrink-0 transition-all ${navFilter === 'BOOKMARKED' ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'}`}
        >
          Saved ({savedIds.size})
        </button>
      </div>

      {/* Question Grid */}
      {filteredNavItems.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs font-bold">
          No questions match your filter/search.
        </div>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 max-h-72 lg:max-h-80 overflow-y-auto p-1 scroll-smooth">
          {filteredNavItems.map((item) => {
            const i = item.idx;
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
                  if (onClose) onClose();
                }}
                className={`relative h-11 rounded-xl flex items-center justify-center font-black text-xs transition-all active:scale-95 ${bgClass}`}
              >
                {i + 1}
                {item.isBookmarked && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white dark:ring-slate-900" title="Bookmarked" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {onClose && (
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-wider"
          >
            Close Navigator
          </button>
        </div>
      )}
    </div>
  );

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
              {renderNavigatorContent(() => setShowPalette(false))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Header Navigation */}
      <div className="bg-slate-900 text-white dark:bg-slate-950 border-b border-slate-800 px-3 sm:px-4 py-2.5 shadow-md flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
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
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all border border-blue-500/30 shadow-xs active:scale-95 shrink-0"
            title="Open Question Navigator Grid"
          >
            <Grid size={13} />
            <span>Q {currentQuestionIndex + 1} / {quiz.questions.length}</span>
          </button>
        </div>

        <div className="text-center hidden md:block flex-1 mx-2">
          <h2 className="text-[11px] font-extrabold tracking-tight text-white truncate max-w-xs mx-auto">
            {quiz.title}
          </h2>
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">
            {isReattemptMode ? "Interactive Reattempt Mode" : "Solutions & Explanation Mode"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Question Spent Time Badge */}
          <div 
            className="px-2.5 py-1.5 bg-slate-800 border border-slate-700/70 rounded-xl text-slate-300 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0 shadow-xs"
            title="Time spent on this question during test"
          >
            <Clock size={12} className="text-amber-400" />
            <span>Spent: {formatDuration(timeSpent)}</span>
          </div>

          {/* Status Badge */}
          {!isReattemptMode && (
            <>
              {isCorrect && (
                <span className="hidden sm:flex px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider border border-emerald-500/30 items-center gap-1">
                  <CheckCircle2 size={11} /> Correct
                </span>
              )}
              {isIncorrect && (
                <span className="hidden sm:flex px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-wider border border-rose-500/30 items-center gap-1">
                  <XCircle size={11} /> Incorrect
                </span>
              )}
              {isSkipped && (
                <span className="hidden sm:flex px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-[9px] font-black uppercase tracking-wider items-center gap-1">
                  Skipped
                </span>
              )}
            </>
          )}

          {/* Bookmark Button */}
          <button
            onClick={() => onBookmark(currentQuestion)}
            className={`p-1.5 rounded-xl transition-all ${
              isSaved ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Bookmark Question"
          >
            <Bookmark size={14} className={isSaved ? "fill-amber-400" : ""} />
          </button>
        </div>
      </div>

      {/* Main Question Card Area & Desktop Two-Column Layout */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-4 relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Question Column */}
          <div className="lg:col-span-8 w-full min-w-0">
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
                className="w-full space-y-3.5"
              >
            {/* Question Text Box (Smaller, compact font sizes) */}
            <div className="bg-blue-50/40 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  Question #{currentQuestionIndex + 1} of {quiz.questions.length}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-relaxed break-words">
                {highlightQuestionText(currentQuestion.question)}
              </h3>
            </div>

            {/* Options List */}
            <div className="space-y-2">
              {currentQuestion.options.map((opt, optIdx) => {
                const isCorrectOption = optIdx === currentQuestion.correctAnswerIndex;
                const isFirstChoice = optIdx === selectedIdx;
                const isSecondChoice = optIdx === reattemptChoice;

                let optStyle = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300";
                let letterBg = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400";
                let badges: React.ReactNode[] = [];

                if (isReattemptMode && !hasReattempted) {
                  // In reattempt mode BEFORE selecting: hide answers, show interactive hover
                  optStyle = "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 cursor-pointer active:scale-[0.99]";
                } else if (isReattemptMode && hasReattempted) {
                  // Reattempt mode AFTER selecting:
                  // - Green box for Correct Answer
                  // - Gray box for 1st Attempt Answer
                  // - Red box for 2nd Attempt Answer if Wrong (or if same & wrong)
                  if (isSecondChoice) {
                    if (isCorrectOption) {
                      optStyle = "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold ring-1 ring-emerald-500/30";
                      letterBg = "bg-emerald-600 text-white";
                      badges.push(
                        <span key="2nd-correct" className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                          <Check size={10} /> Correct
                        </span>
                      );
                    } else {
                      optStyle = "bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-950 dark:text-rose-100 font-bold ring-1 ring-rose-500/30";
                      letterBg = "bg-rose-600 text-white";
                      badges.push(
                        <span key="2nd-wrong" className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                          <X size={10} /> Wrong
                        </span>
                      );
                    }
                  } else if (isFirstChoice && !isCorrectOption) {
                    // 1st Attempt answer when wrong -> Gray box
                    optStyle = "bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold";
                    letterBg = "bg-slate-500 dark:bg-slate-700 text-white";
                    badges.push(
                      <span key="1st-ans" className="px-2 py-0.5 rounded-full bg-slate-500 dark:bg-slate-700 text-white text-[8px] font-black uppercase tracking-wider shrink-0">
                        1st Ans
                      </span>
                    );
                  } else if (isCorrectOption) {
                    // Correct Answer box (when user's 2nd choice wasn't this correct option)
                    optStyle = "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold ring-1 ring-emerald-500/30";
                    letterBg = "bg-emerald-600 text-white";
                    badges.push(
                      <span key="right-ans" className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                        <Check size={10} /> Correct
                      </span>
                    );
                  }
                } else {
                  // Normal Review Mode (answers shown)
                  if (isCorrectOption) {
                    optStyle = "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold ring-1 ring-emerald-500/30";
                    letterBg = "bg-emerald-600 text-white";
                    badges.push(
                      <span key="normal-right" className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                        <Check size={10} /> Correct
                      </span>
                    );
                  } else if (isFirstChoice && !isCorrectOption) {
                    optStyle = "bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-950 dark:text-rose-100 font-bold ring-1 ring-rose-500/30";
                    letterBg = "bg-rose-600 text-white";
                    badges.push(
                      <span key="normal-wrong" className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                        <X size={10} /> Your Choice
                      </span>
                    );
                  }
                }

                return (
                  <div 
                    key={optIdx}
                    onClick={() => {
                      if (isReattemptMode && !hasReattempted) {
                        handleReattemptSelectOption(optIdx);
                      }
                    }}
                    className={`py-2 px-3 sm:py-2.5 sm:px-3.5 rounded-xl border text-[11px] sm:text-xs flex items-center justify-between gap-2.5 transition-all ${optStyle}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-extrabold text-[10px] shrink-0 ${letterBg}`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="leading-snug break-words">{opt}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end shrink-0">
                      {badges}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation & AI Concept Deep Dive (Hidden in Reattempt mode until question is answered) */}
            {(!isReattemptMode || hasReattempted) && (
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Brain size={14} className="text-amber-500" /> Explanation & Concept Insight
                  </span>
                  <button
                    onClick={() => onExplain(currentQuestion, reattemptChoice ?? selectedIdx)}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs active:scale-95 transition-all shrink-0"
                  >
                    <Sparkles size={11} className="text-amber-300" /> AI Deep Concept
                  </button>
                </div>
                <FormattedExplanationBox text={currentQuestion.explanation} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desktop Persistent Navigator Sidebar */}
      <div className="hidden lg:block lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm sticky top-4">
        {renderNavigatorContent()}
      </div>
    </div>
  </div>

      {/* Bottom Navigation Footer (Previous / Reattempt / Next) */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 shadow-lg z-20">
        <button
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
          className={`px-3 sm:px-4 py-2 rounded-xl font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1 transition-all ${
            currentQuestionIndex === 0 
              ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400' 
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 active:scale-95'
          }`}
        >
          <ChevronLeft size={15} /> <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Reattempt button in footer */}
          <button
            onClick={handleToggleReattempt}
            className={`px-3 py-2 rounded-xl font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs active:scale-95 ${
              isReattemptMode
                ? 'bg-amber-500 text-white'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
            }`}
            title="Reattempt Test"
          >
            <RotateCcw size={13} /> {isReattemptMode ? "Show Answers" : "Reattempt"}
          </button>

          <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 hidden md:inline">
            Q {currentQuestionIndex + 1} of {quiz.questions.length}
          </span>
        </div>

        <button
          onClick={handleNext}
          disabled={currentQuestionIndex === quiz.questions.length - 1}
          className={`px-3 sm:px-4 py-2 rounded-xl font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1 transition-all ${
            currentQuestionIndex === quiz.questions.length - 1 
              ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400' 
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 active:scale-95'
          }`}
        >
          <span className="hidden sm:inline">Next</span> <ChevronRight size={15} />
        </button>
      </div>

    </div>
  );
};
