import React, { useState, useEffect } from 'react';
import { Quiz as QuizType, UserAnswer, BookmarkedQuestion, QuizConfig } from '../types';
import { quizSessionService } from '../services/quizSessionService';
import { 
  CheckCircle2, XCircle, Info, Bookmark, LogOut, Timer, ChevronLeft, 
  ChevronRight, Send, AlertCircle, X, Check, Maximize2, Loader2, Sparkles, MoveHorizontal,
  Flame, HelpCircle, CheckSquare, Play
} from 'lucide-react';

interface QuizProps {
  quiz: QuizType;
  quizConfig?: QuizConfig;
  onFinish: (answers: UserAnswer[]) => void;
  onAbort: (answers?: UserAnswer[]) => void;
  onSaveAndExit?: (session: { quiz: QuizType; quizConfig: QuizConfig; currentQuestionIndex: number; userAnswers: UserAnswer[]; timer: number }) => void;
  onSaveQuestion: (q: BookmarkedQuestion) => void;
  onFetchNext?: () => Promise<void>;
  savedIds: Set<string>;
  timePerQuestion?: number;
  initialQuestionIndex?: number;
  initialAnswers?: UserAnswer[];
  initialTimer?: number;
}

const renderFormattedText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-extrabold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-indigo-600 dark:text-indigo-300 font-semibold px-0.5">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
};

const DecoratedExplanation: React.FC<{ explanation: string }> = ({ explanation }) => {
  if (!explanation) return null;

  const rawLines = explanation.split(/\n+/).map(l => l.trim()).filter(Boolean);

  let lines: string[] = [];
  if (rawLines.length === 1 && rawLines[0].length > 100 && !rawLines[0].includes('•')) {
    const sentences = rawLines[0].split(/(?<=\.)\s+/);
    lines.push(`**Core Concept:** ${sentences[0]}`);
    if (sentences.length > 1) {
      lines.push(`**Why Correct:** ${sentences.slice(1, Math.min(3, sentences.length)).join(' ')}`);
    }
    if (sentences.length > 3) {
      lines.push(`• **Key Takeaway:** ${sentences.slice(3).join(' ')}`);
    }
  } else {
    lines = rawLines;
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 border border-blue-200/90 dark:border-blue-900/60 shadow-md animate-in fade-in slide-in-from-bottom-2 mb-6 text-left">
      <div className="flex items-center justify-between mb-3.5 border-b border-blue-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
            <Sparkles size={14} />
          </div>
          <span className="font-black text-[10px] uppercase tracking-widest text-blue-700 dark:text-blue-400">
            Key Insights & Explanation
          </span>
        </div>
        <span className="text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
          Smart Summary
        </span>
      </div>

      <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
        {lines.map((line, idx) => {
          const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('* ');
          const cleanLine = isBullet ? line.replace(/^[•\-*]\s*/, '') : line;

          if (isBullet) {
            return (
              <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-800 shadow-2xs transition-all">
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
                <div className="flex-1 font-medium">{renderFormattedText(cleanLine)}</div>
              </div>
            );
          }

          if (cleanLine.startsWith('**') || cleanLine.startsWith('#')) {
            return (
              <div key={idx} className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100/80 dark:border-blue-900/40">
                <div className="font-semibold">{renderFormattedText(cleanLine)}</div>
              </div>
            );
          }

          return (
            <div key={idx} className="p-2 font-medium leading-relaxed">
              {renderFormattedText(cleanLine)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Quiz: React.FC<QuizProps> = ({ 
  quiz, 
  quizConfig = { mode: 'PRACTICE', positiveMarks: 1, negativeMarks: 0.25, timePerQuestion: 0, testDurationMinutes: 0 }, 
  onFinish, 
  onAbort, 
  onSaveAndExit,
  onSaveQuestion, 
  onFetchNext, 
  savedIds, 
  timePerQuestion = 0,
  initialQuestionIndex = 0,
  initialAnswers = [],
  initialTimer = 0
}) => {
  const mode = quizConfig?.mode || 'PRACTICE';
  const effectiveTimePerQ = quizConfig?.timePerQuestion || timePerQuestion || 0;
  const testDurationMinutes = quizConfig?.testDurationMinutes || 0;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>(initialAnswers);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timer, setTimer] = useState(initialTimer); // seconds elapsed
  const [questionTimer, setQuestionTimer] = useState<number>(effectiveTimePerQ > 0 ? effectiveTimePerQ : 0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-save ongoing test session to localStorage on progress changes so closing app never loses progress
  useEffect(() => {
    if (quiz && userAnswers.length >= 0) {
      const sessionData = {
        quiz,
        quizConfig: quizConfig || { mode: 'PRACTICE' as const, positiveMarks: 1, negativeMarks: 0.25, timePerQuestion: 0, testDurationMinutes: 0 },
        currentQuestionIndex,
        userAnswers,
        timer
      };
      quizSessionService.saveSession(sessionData);
    }
  }, [quiz, quizConfig, currentQuestionIndex, userAnswers, timer]);

  // Window beforeunload & pagehide safety handlers for mobile browsers
  useEffect(() => {
    const handleSaveOnClose = () => {
      if (quiz) {
        quizSessionService.saveSession({
          quiz,
          quizConfig: quizConfig || { mode: 'PRACTICE' as const, positiveMarks: 1, negativeMarks: 0.25, timePerQuestion: 0, testDurationMinutes: 0 },
          currentQuestionIndex,
          userAnswers,
          timer
        });
      }
    };
    window.addEventListener('beforeunload', handleSaveOnClose);
    window.addEventListener('pagehide', handleSaveOnClose);
    return () => {
      window.removeEventListener('beforeunload', handleSaveOnClose);
      window.removeEventListener('pagehide', handleSaveOnClose);
    };
  }, [quiz, quizConfig, currentQuestionIndex, userAnswers, timer]);

  // Touch Swipe Gesture State
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progressPercent = quiz.isInfinite 
    ? (userAnswers.length / (userAnswers.length + 1)) * 100 
    : ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  // Total test countdown if testDurationMinutes > 0
  const totalSecondsAllowed = testDurationMinutes * 60;
  const remainingSeconds = totalSecondsAllowed > 0 ? Math.max(0, totalSecondsAllowed - timer) : 0;

  // Timer Effect
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setTimer(t => {
        const nextTime = t + 1;
        // Auto submit if overall test duration expired in TEST mode
        if (totalSecondsAllowed > 0 && nextTime >= totalSecondsAllowed) {
          clearInterval(interval);
          onFinish(userAnswers);
        }
        return nextTime;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [totalSecondsAllowed, userAnswers, onFinish, isPaused]);

  // Per-Question Countdown Timer (if timePerQuestion > 0)
  useEffect(() => {
    if (effectiveTimePerQ <= 0 || isPaused) return;
    setQuestionTimer(effectiveTimePerQ);
    const qInterval = setInterval(() => {
      setQuestionTimer(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(qInterval);
  }, [currentQuestionIndex, effectiveTimePerQ, isPaused]);

  // Sync current question's state on question change
  useEffect(() => {
    const existing = userAnswers.find(a => a.questionId === currentQuestion.id);
    if (existing) {
      setSelectedOption(existing.selectedOptionIndex);
      if (mode === 'PRACTICE' && existing.selectedOptionIndex !== null) {
        setShowFeedback(true);
      } else {
        setShowFeedback(false);
      }
    } else {
      setSelectedOption(null);
      setShowFeedback(false);
    }
  }, [currentQuestionIndex, userAnswers, currentQuestion.id, mode]);

  // Proactive Pre-fetching for Infinite Mode
  useEffect(() => {
    if (quiz.isInfinite && onFetchNext && !isFetchingNext) {
      const remainingQuestions = quiz.questions.length - (currentQuestionIndex + 1);
      if (remainingQuestions <= 4) {
        setIsFetchingNext(true);
        onFetchNext().finally(() => setIsFetchingNext(false));
      }
    }
  }, [currentQuestionIndex, quiz.questions.length, quiz.isInfinite, onFetchNext, isFetchingNext]);

  // Option selection logic
  const handleOptionClick = (optionIdx: number) => {
    if (mode === 'PRACTICE') {
      // In PRACTICE mode: Tapping an option immediately validates & reveals feedback + explanation!
      if (showFeedback) return; // already locked for practice
      const isCorrect = optionIdx === currentQuestion.correctAnswerIndex;
      const newAnswer: UserAnswer = {
        questionId: currentQuestion.id,
        selectedOptionIndex: optionIdx,
        isCorrect,
        timeSpent: timer
      };
      setSelectedOption(optionIdx);
      setUserAnswers(prev => {
        const filtered = prev.filter(a => a.questionId !== currentQuestion.id);
        return [...filtered, newAnswer];
      });
      setShowFeedback(true);
    } else {
      // In TEST mode: Tapping an option selects choice, NO immediate correct answer/explanation revealed!
      const isCorrect = optionIdx === currentQuestion.correctAnswerIndex;
      const newAnswer: UserAnswer = {
        questionId: currentQuestion.id,
        selectedOptionIndex: optionIdx,
        isCorrect,
        timeSpent: timer
      };
      setSelectedOption(optionIdx);
      setUserAnswers(prev => {
        const filtered = prev.filter(a => a.questionId !== currentQuestion.id);
        return [...filtered, newAnswer];
      });
    }
  };

  const handleNext = async () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (quiz.isInfinite && onFetchNext) {
      setIsFetchingNext(true);
      try {
        await onFetchNext();
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } catch (e) {
        console.error("Failed to fetch next question", e);
      } finally {
        setIsFetchingNext(false);
      }
    } else {
      setShowSubmitConfirm(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      if (currentQuestionIndex > 0) {
        handlePrevious();
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const getQuestionStatus = (index: number) => {
    const qId = quiz.questions[index].id;
    const answer = userAnswers.find(a => a.questionId === qId);
    if (!answer || answer.selectedOptionIndex === null) return 'unanswered';
    
    if (mode === 'PRACTICE') {
      return answer.isCorrect ? 'correct' : 'incorrect';
    } else {
      // In TEST mode palette: simply show answered vs unanswered
      return 'answered';
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#fcfdfe] dark:bg-slate-950 text-xs select-none">
      {/* Top Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-2 shadow-2xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowPalette(!showPalette)} 
              className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-blue-100 transition-all border border-blue-200/50 dark:border-blue-800/50"
            >
              Q: {currentQuestionIndex + 1}{quiz.isInfinite ? "" : `/${quiz.questions.length}`}
            </button>

            {/* Mode Badge */}
            <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
              mode === 'PRACTICE' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40' 
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40'
            }`}>
              {mode === 'PRACTICE' ? <Sparkles size={10} /> : <CheckSquare size={10} />}
              {mode === 'PRACTICE' ? 'Practice Mode' : 'Quiz Exam Mode'}
            </span>

            {/* Timer Display */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-extrabold text-[10px] border border-blue-200/50 dark:border-blue-800/50">
              <Timer size={13} className="text-blue-500 animate-pulse shrink-0" />
              <span>
                {totalSecondsAllowed > 0 
                  ? `Remaining: ${formatTime(remainingSeconds)}` 
                  : formatTime(timer)}
              </span>
              {effectiveTimePerQ > 0 && (
                <span className={`ml-1 pl-1.5 border-l border-blue-200 dark:border-blue-800 font-mono text-[9px] ${questionTimer <= 5 ? 'text-rose-500 font-black animate-pulse' : 'text-slate-500 dark:text-slate-400'}`}>
                  {questionTimer}s
                </span>
              )}
            </div>
          </div>
          
          <div className="flex-1 max-w-xs h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mx-2 hidden md:block">
            <div className={`h-full bg-blue-600 transition-all duration-500 ${quiz.isInfinite ? 'animate-pulse' : ''}`} style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className={`px-2.5 py-1 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all ${
                isPaused 
                  ? 'bg-amber-500 text-white animate-bounce shadow-md' 
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100'
              }`}
              title={isPaused ? "Resume Test" : "Pause Test"}
            >
              {isPaused ? <Play size={12} fill="currentColor" /> : <Timer size={12} />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
            <button 
              onClick={() => setShowSubmitConfirm(true)}
              className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-sm hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition-all"
            >
              Submit Test
            </button>
            <button 
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 transition-all hidden sm:block"
              title="Fullscreen"
            >
              <Maximize2 size={15} />
            </button>
            <button 
              onClick={() => onSaveQuestion({ quizTitle: quiz.title, question: currentQuestion })} 
              className={`p-1.5 rounded-lg transition-all ${savedIds.has(currentQuestion.id) ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
              title="Bookmark Question"
            >
              <Bookmark size={15} fill={savedIds.has(currentQuestion.id) ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={() => setShowExitConfirm(true)} 
              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
              title="Exit Test"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Question Body with Touch Swipe Detection */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-6 relative touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isPaused && (
          <div className="absolute inset-0 z-55 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-8 rounded-[2.5rem] shadow-2xl border border-amber-500/30 text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                <Timer size={32} className="animate-pulse" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Test Paused</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-6">
                Your timer and progress are safely frozen in <span className="font-bold text-amber-600 dark:text-amber-400">{mode === 'PRACTICE' ? 'Practice Mode' : 'Quiz Exam Mode'}</span>. Take your time!
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl mb-6 flex justify-around text-center">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">{currentQuestionIndex + 1} / {quiz.questions.length}</div>
                </div>
                <div className="w-px bg-slate-200 dark:bg-slate-700" />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Elapsed</div>
                  <div className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">{formatTime(timer)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={() => setIsPaused(false)}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Play size={16} fill="currentColor" /> Resume Test
                </button>
                {onSaveAndExit && (
                  <button 
                    onClick={() => onSaveAndExit({ quiz, quizConfig: quizConfig || {mode:'PRACTICE',positiveMarks:1,negativeMarks:0.25,timePerQuestion:0,testDurationMinutes:0}, currentQuestionIndex, userAnswers, timer })}
                    className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut size={14} /> Save & Exit for Later
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="max-w-xl mx-auto">
          <div className="mb-4 flex items-center justify-between gap-2">
             <div className="flex items-center gap-2">
               <span className={`px-2.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-full ${quiz.isInfinite ? 'animate-pulse' : ''}`}>
                  {mode === 'PRACTICE' ? 'Practice Mode (Instant Feedback)' : 'Test Mode (Submit for Score)'}
               </span>
               {quiz.isInfinite && (
                 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-900/40">
                   <Sparkles size={9} className="animate-spin" />
                   {isFetchingNext ? "Buffering Backup Qs..." : `${Math.max(0, quiz.questions.length - (currentQuestionIndex + 1))} Backup Qs`}
                 </span>
               )}
             </div>
             
             {/* Swipe Hint Badge */}
             <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[8px] font-bold">
               <MoveHorizontal size={10} />
               <span>Swipe Left/Right</span>
             </div>
          </div>

          <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-white mb-5 leading-snug">
            {currentQuestion.question}
          </h3>

          <div className="space-y-2.5 mb-6">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQuestion.correctAnswerIndex;
              let btnStyle = "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800";
              
              if (mode === 'PRACTICE' && showFeedback) {
                // Practice mode instant feedback styling
                if (isCorrect) btnStyle = "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-sm";
                else if (isSelected) btnStyle = "bg-rose-50 dark:bg-rose-900/10 border-rose-500 text-rose-700 dark:text-rose-400 shadow-sm";
                else btnStyle = "opacity-40 grayscale-[0.5]";
              } else if (isSelected) {
                // Test mode / pre-feedback selected styling
                btnStyle = "bg-blue-50 dark:bg-blue-900/30 border-blue-600 ring-2 ring-blue-500/20 text-blue-900 dark:text-blue-200 font-semibold shadow-sm";
              }

              return (
                <button 
                  key={idx} 
                  disabled={mode === 'PRACTICE' && showFeedback} 
                  onClick={() => handleOptionClick(idx)} 
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center group ${btnStyle}`}
                >
                  <div className={`w-6 h-6 rounded-xl border flex items-center justify-center mr-3 font-black text-[10px] transition-all shrink-0
                    ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-400 bg-slate-50 dark:bg-slate-800'}
                  `}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="font-medium text-xs leading-snug flex-1">{option}</span>
                  {mode === 'TEST' && isSelected && (
                    <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider ml-2">Selected</span>
                  )}
                </button>
              );
            })}
          </div>

          {mode === 'PRACTICE' && showFeedback && (
            <DecoratedExplanation explanation={currentQuestion.explanation} />
          )}
        </div>
      </div>

      {/* Navigation Palette Drawer */}
      {showPalette && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] animate-in fade-in duration-300" 
            onClick={() => setShowPalette(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[2.5rem] border-t border-slate-100 dark:border-slate-800 z-[120] animate-in slide-in-from-bottom duration-300 max-h-[60vh] flex flex-col shadow-2xl">
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto my-3 shrink-0" />
            
            <div className="px-5 pb-8 flex-1 overflow-y-auto custom-scrollbar">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Question Navigator</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {mode === 'TEST' ? 'Blue = Answered, Gray = Unanswered' : 'Green = Correct, Red = Incorrect'}
                    </p>
                  </div>
                  <button 
                    onClick={() => { setShowPalette(false); setShowSubmitConfirm(true); }} 
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all"
                  >
                    Submit Test
                  </button>
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(42px,1fr))] gap-2">
                  {quiz.questions.map((_, i) => {
                    const status = getQuestionStatus(i);
                    return (
                      <button 
                        key={i}
                        onClick={() => { setCurrentQuestionIndex(i); setShowPalette(false); }}
                        className={`aspect-square rounded-xl text-[10px] font-black border transition-all flex items-center justify-center
                          ${currentQuestionIndex === i ? 'ring-2 ring-blue-500 scale-105 shadow-sm' : 'border-transparent'}
                          ${status === 'correct' ? 'bg-emerald-500 text-white' : 
                            status === 'incorrect' ? 'bg-red-500 text-white' : 
                            status === 'answered' ? 'bg-blue-600 text-white' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-400'}
                        `}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom Footer Action Controls */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button 
            onClick={handlePrevious} 
            disabled={currentQuestionIndex === 0 || isFetchingNext}
            className={`flex items-center gap-1 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all
              ${(currentQuestionIndex === 0 || isFetchingNext) ? 'opacity-0 pointer-events-none' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800'}
            `}
          >
            <ChevronLeft size={14} /> Prev
          </button>

          <div className="flex gap-2">
             <button 
               onClick={handleNext}
               disabled={isFetchingNext}
               className="px-7 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-1.5 min-w-[120px] justify-center"
             >
                {isFetchingNext ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                   {currentQuestionIndex === quiz.questions.length - 1 && !quiz.isInfinite ? (mode === 'TEST' ? "Submit Test" : "Finish") : "Next"} <ChevronRight size={14} />
                  </>
                )}
             </button>
          </div>
        </div>
      </div>

      {/* Final Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-xs p-6 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                 <AlertCircle size={24} />
              </div>
              <h4 className="text-sm font-black mb-1 text-slate-900 dark:text-white">Submit Test & View Results?</h4>
              <p className="text-slate-400 text-[10px] mb-5">Answered {userAnswers.filter(a => a.selectedOptionIndex !== null).length} of {quiz.questions.length} questions.</p>
              
              <div className="flex flex-col gap-2">
                 <button 
                    onClick={() => onFinish(userAnswers)}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md active:scale-95 transition-all"
                 >
                    Yes, Finalize & Submit
                 </button>
                 <button 
                    onClick={() => setShowSubmitConfirm(false)}
                    className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-xl font-black text-[9px] uppercase tracking-widest hover:text-slate-700 transition-all"
                 >
                    Continue Test
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Exit Test Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-xs p-6 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                 <LogOut size={24} />
              </div>
              <h4 className="text-sm font-black mb-1 text-slate-900 dark:text-white">Exit Test Confirmation</h4>
              <p className="text-slate-400 text-[10px] mb-5">Are you sure you want to exit? Your progress will be saved in history.</p>
              
              <div className="flex flex-col gap-2">
                 <button 
                    onClick={() => onAbort(userAnswers)}
                    className="w-full py-3.5 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md active:scale-95 transition-all"
                 >
                    Exit & Save Progress
                 </button>
                 <button 
                    onClick={() => setShowExitConfirm(false)}
                    className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                 >
                    Resume Test
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;
