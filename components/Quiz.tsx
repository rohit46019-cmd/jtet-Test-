import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quiz as QuizType, UserAnswer, BookmarkedQuestion, QuizConfig, Question, formatDuration } from '../types';
import { quizSessionService } from '../services/quizSessionService';
import { phoneStorageService } from '../services/phoneStorageService';
import { auditAndFixQuizQuestions } from '../services/geminiService';
import { AiExplainModal } from './AiExplainModal';
import { 
  CheckCircle2, XCircle, Info, Bookmark, LogOut, Timer, ChevronLeft, 
  ChevronRight, Send, AlertCircle, X, Check, Maximize2, Loader2, Sparkles, MoveHorizontal,
  Flame, HelpCircle, CheckSquare, Play, Brain, AlertTriangle, ShieldCheck, ArrowRight
} from 'lucide-react';

interface QuizProps {
  quiz: QuizType;
  quizConfig?: QuizConfig;
  onFinish: (answers: UserAnswer[]) => void;
  onAbort: (answers?: UserAnswer[]) => void;
  onSaveAndExit?: (session: { quiz: QuizType; quizConfig: QuizConfig; currentQuestionIndex: number; userAnswers: UserAnswer[]; timer: number }) => void;
  onSaveQuestion: (q: BookmarkedQuestion) => void;
  onUpdateQuiz?: (updatedQuiz: QuizType) => void;
  onFetchNext?: () => Promise<void>;
  savedIds: Set<string>;
  timePerQuestion?: number;
  initialQuestionIndex?: number;
  initialAnswers?: UserAnswer[];
  initialTimer?: number;
}

const normalizeExplanationText = (text: string): string => {
  if (!text) return '';
  return text
    // Replace escaped newlines (e.g. "\\n" literal) with real newlines
    .replace(/\\n/g, '\n')
    // Replace literal "/n" or "/N" separators (e.g. "fact /n fact") with newlines
    .replace(/(?:\s*\/n\s*|\s*\/N\s*)+/g, '\n\n')
    // Replace HTML break tags with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    // Normalize carriage returns
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
};

const highlightQuestionText = (text: string) => {
  if (!text) return null;

  // 1. If text already has markdown asterisks (**bold** or *italic*), format them with vivid highlight styling
  if (text.includes('**') || text.includes('*')) {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <span 
            key={idx} 
            className="inline-block font-black text-amber-900 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-500/25 px-1.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-500/40 mx-0.5 shadow-2xs"
          >
            {part.slice(2, -2)}
          </span>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <span 
            key={idx} 
            className="inline-block font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/40 mx-0.5"
          >
            {part.slice(1, -1)}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  }

  // 2. Return plain text if no markdown highlights are present
  return <span>{text}</span>;
};

const renderFormattedText = (text: string) => {
  if (!text) return null;
  // Clean any remaining raw escaped newline codes or /n inside the snippet
  const cleaned = text
    .replace(/\\n/g, ' ')
    .replace(/(?:\s*\/n\s*|\s*\/N\s*)/g, ' ');

  const parts = cleaned.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/30">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50/60 dark:bg-emerald-950/30 px-1 py-0.5 rounded-md">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
};

const DecoratedExplanation: React.FC<{ 
  explanation: string; 
  onAskAi?: () => void;
}> = ({ explanation, onAskAi }) => {
  if (!explanation && !onAskAi) return null;

  // Process and unescape all newline patterns (\n, \\n, /n, <br>)
  const normalizedText = normalizeExplanationText(explanation || '');
  
  // Split the explanation by distinct paragraph blocks
  const rawSegments = normalizedText
    .split(/\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Categorize segments to structure them beautifully
  const correctOptionSegments: string[] = [];
  const incorrectOptionSegments: string[] = [];
  const bulletSegments: string[] = [];
  const conceptualSegments: string[] = [];

  rawSegments.forEach(segment => {
    const lower = segment.toLowerCase();
    
    // Check if it's already a bullet list or numbered item
    const isBullet = segment.startsWith('•') || segment.startsWith('-') || segment.startsWith('*') || /^\d+[\.\)]\s+/.test(segment);
    const cleanSegment = isBullet ? segment.replace(/^[•\-\*\d\.\)]\s*/, '') : segment;

    if (isBullet) {
      bulletSegments.push(cleanSegment);
    } else if (
      lower.includes('correct because') || 
      lower.includes('is correct') || 
      lower.includes('correct option') || 
      lower.includes('correct choice') || 
      lower.includes('right answer') ||
      lower.startsWith('correct:')
    ) {
      correctOptionSegments.push(cleanSegment);
    } else if (
      lower.includes('incorrect because') || 
      lower.includes('is incorrect') || 
      lower.includes('incorrect option') || 
      lower.includes('wrong option') || 
      lower.includes('not correct') ||
      lower.startsWith('incorrect:')
    ) {
      incorrectOptionSegments.push(cleanSegment);
    } else {
      conceptualSegments.push(cleanSegment);
    }
  });

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in fade-in slide-in-from-bottom-2 mb-6 text-left select-text relative overflow-hidden">
      {/* Decorative Top Accent Tag */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-500" />
      
      {/* Dynamic styles to ensure the scrollbar is completely invisible across all devices */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}} />

      {/* Header Section */}
      <div className="flex items-center justify-between mb-5 border-b-2 border-slate-200 dark:border-slate-800 pb-3.5 flex-wrap gap-2 mt-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md border border-black">
            <Brain size={16} className="animate-pulse" />
          </div>
          <div>
            <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white block">
              Explanation & Insights
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block">
              Concept breakdown and structured analysis
            </span>
          </div>
        </div>
        
        {onAskAi && (
          <button
            onClick={onAskAi}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-[10px] uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <Sparkles size={11} className="animate-pulse" />
            <span>Ask AI Assistant</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        
        {/* 1. Core Conceptual Takeaways (Distinct Paragraphs) */}
        {conceptualSegments.length > 0 && (
          <div className="p-4 bg-blue-50/70 dark:bg-blue-950/20 rounded-2xl border-2 border-blue-100 dark:border-blue-900/40 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              <h5 className="font-black text-[11px] uppercase tracking-wider text-blue-700 dark:text-blue-400">
                📌 Core Lesson & Concept
              </h5>
            </div>
            <div className="space-y-2.5 text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              {conceptualSegments.map((segment, idx) => (
                <p key={idx} className="p-3 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-blue-100/80 dark:border-blue-900/30 break-words shadow-2xs">
                  {renderFormattedText(segment)}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* 2. Correct Option Analysis */}
        {correctOptionSegments.length > 0 && (
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/15 rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/30 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                ✓
              </div>
              <h5 className="font-black text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                ✅ Why It Is Correct
              </h5>
            </div>
            <div className="space-y-2 text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              {correctOptionSegments.map((segment, idx) => (
                <div key={idx} className="p-3 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-emerald-100/80 dark:border-emerald-900/30 break-words shadow-2xs">
                  {renderFormattedText(segment)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Incorrect Option Breakdown */}
        {incorrectOptionSegments.length > 0 && (
          <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 rounded-2xl border-2 border-rose-100 dark:border-rose-900/20 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-[10px] shrink-0">
                ✗
              </div>
              <h5 className="font-black text-[11px] uppercase tracking-wider text-rose-700 dark:text-rose-400">
                ❌ Distractor Analysis (Why Others Are Incorrect)
              </h5>
            </div>
            <div className="space-y-2 text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              {incorrectOptionSegments.map((segment, idx) => (
                <div key={idx} className="p-3 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-rose-100/80 dark:border-rose-900/30 break-words shadow-2xs">
                  {renderFormattedText(segment)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. List Items / Key Points */}
        {bulletSegments.length > 0 && (
          <div className="p-4 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
              <h5 className="font-black text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-400">
                💡 Key Insights & Takeaways
              </h5>
            </div>
            <div className="space-y-2">
              {bulletSegments.map((segment, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-white/60 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs sm:text-[13px] font-medium leading-relaxed text-slate-800 dark:text-slate-200 select-text">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0 shadow-sm animate-pulse" />
                  <div className="flex-1 break-words">
                    {renderFormattedText(segment)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
  onUpdateQuiz, 
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

  const [currentQuiz, setCurrentQuiz] = useState<QuizType>(quiz);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(() => new Set([initialQuestionIndex]));
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
  const [showAiModal, setShowAiModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<string>('Wrong Answer Key');
  const [reportToast, setReportToast] = useState<string | null>(null);

  // Report AI Auditing State
  const [isAuditingReport, setIsAuditingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportAuditResult, setReportAuditResult] = useState<{
    wasChanged: boolean;
    oldCorrectIndex: number;
    newCorrectIndex: number;
    oldOption: string;
    newOption: string;
    reason: string;
  } | null>(null);

  useEffect(() => {
    setCurrentQuiz(quiz);
  }, [quiz]);

  const currentQuestion = currentQuiz.questions[currentQuestionIndex];

  // Track visited questions indices
  useEffect(() => {
    setVisitedIndices(prev => {
      if (prev.has(currentQuestionIndex)) return prev;
      const next = new Set(prev);
      next.add(currentQuestionIndex);
      return next;
    });
  }, [currentQuestionIndex]);

  // Centering active question navigator circle on swipe
  useEffect(() => {
    const timerId = setTimeout(() => {
      const activeCircle = document.getElementById(`circle-nav-${currentQuestionIndex}`);
      if (activeCircle) {
        activeCircle.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }, 80);
    return () => clearTimeout(timerId);
  }, [currentQuestionIndex]);

  // Auto-save ongoing test session to localStorage on progress changes so closing app never loses progress
  useEffect(() => {
    if (currentQuiz && userAnswers.length >= 0) {
      const sessionData = {
        quiz: currentQuiz,
        quizConfig: quizConfig || { mode: 'PRACTICE' as const, positiveMarks: 1, negativeMarks: 0.25, timePerQuestion: 0, testDurationMinutes: 0 },
        currentQuestionIndex,
        userAnswers,
        timer
      };
      quizSessionService.saveSession(sessionData);
    }
  }, [currentQuiz, quizConfig, currentQuestionIndex, userAnswers, timer]);

  const handleReportAndAudit = async () => {
    if (!currentQuestion) return;
    try {
      setIsAuditingReport(true);
      setReportError(null);
      setReportAuditResult(null);

      // Log report to MongoDB/local server database first
      const reportPayload = {
        id: crypto.randomUUID(),
        quizId: currentQuiz.id,
        quizTitle: currentQuiz.title || 'Untitled Quiz',
        questionId: currentQuestion.id,
        questionText: currentQuestion.question,
        options: currentQuestion.options,
        correctAnswerIndex: currentQuestion.correctAnswerIndex,
        explanation: currentQuestion.explanation,
        reason: reportReason,
        timestamp: Date.now(),
        status: 'pending'
      };

      fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportPayload)
      }).catch(err => console.warn('Failed to log report:', err));

      // Trigger Gemini AI audit on reported question
      const auditRes = await auditAndFixQuizQuestions([currentQuestion], currentQuiz.language || 'Hindi/English');

      if (auditRes && auditRes.questions && auditRes.questions.length > 0) {
        const auditedQuestion = auditRes.questions[0];
        const oldIndex = currentQuestion.correctAnswerIndex;
        const newIndex = auditedQuestion.correctAnswerIndex;
        const wasChanged = oldIndex !== newIndex || auditedQuestion.explanation !== currentQuestion.explanation;

        const updatedQuestions = [...currentQuiz.questions];
        updatedQuestions[currentQuestionIndex] = auditedQuestion;

        const updatedQuiz = {
          ...currentQuiz,
          questions: updatedQuestions
        };

        setCurrentQuiz(updatedQuiz);
        if (onUpdateQuiz) {
          onUpdateQuiz(updatedQuiz);
        }

        // Save updated session & phone storage
        quizSessionService.saveSession({
          quiz: updatedQuiz,
          quizConfig: quizConfig || { mode: 'PRACTICE', positiveMarks: 1, negativeMarks: 0.25, timePerQuestion: 0, testDurationMinutes: 0 },
          currentQuestionIndex,
          userAnswers,
          timer
        });

        try {
          const savedLib = phoneStorageService.getItem<any[]>('qf_lib_v4', []);
          if (Array.isArray(savedLib)) {
            const updatedLib = savedLib.map((q: any) => {
              if (q.id === updatedQuiz.id) {
                return { ...q, questions: updatedQuestions };
              }
              return q;
            });
            phoneStorageService.saveItem('qf_lib_v4', updatedLib);
          }
        } catch (_) {}

        const oldOpt = currentQuestion.options[oldIndex] || '';
        const newOpt = auditedQuestion.options[newIndex] || '';

        const note = auditRes.auditNotes && auditRes.auditNotes.length > 0
          ? auditRes.auditNotes[0].reason
          : (wasChanged
              ? `AI updated answer key from Option ${String.fromCharCode(65 + oldIndex)} to Option ${String.fromCharCode(65 + newIndex)} based on fact verification.`
              : `AI verified that Option ${String.fromCharCode(65 + newIndex)} is 100% correct.`);

        setReportAuditResult({
          wasChanged,
          oldCorrectIndex: oldIndex,
          newCorrectIndex: newIndex,
          oldOption: oldOpt,
          newOption: newOpt,
          reason: note
        });

        if (wasChanged) {
          setReportToast(`✓ AI Verified & Fixed Q#${currentQuestionIndex + 1}: Answer key corrected!`);
        } else {
          setReportToast(`✓ AI Verified Q#${currentQuestionIndex + 1}: Answer key is 100% accurate.`);
        }
        setTimeout(() => setReportToast(null), 5000);
      }
    } catch (err: any) {
      setReportError(err?.message || 'Failed to complete AI report audit. Please try again.');
    } finally {
      setIsAuditingReport(false);
    }
  };

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

  // System Back button interception inside active quiz
  useEffect(() => {
    window.history.pushState({ screen: 'quiz_active' }, '');

    const handleQuizPopState = () => {
      // 1. If any modal/drawer is open inside the quiz, close it first and keep user in quiz
      if (showAiModal) {
        setShowAiModal(false);
        window.history.pushState({ screen: 'quiz_active' }, '');
        return;
      }
      if (showReportModal) {
        setShowReportModal(false);
        window.history.pushState({ screen: 'quiz_active' }, '');
        return;
      }
      if (showPalette) {
        setShowPalette(false);
        window.history.pushState({ screen: 'quiz_active' }, '');
        return;
      }
      if (showSubmitConfirm) {
        setShowSubmitConfirm(false);
        window.history.pushState({ screen: 'quiz_active' }, '');
        return;
      }
      if (showExitConfirm) {
        setShowExitConfirm(false);
        window.history.pushState({ screen: 'quiz_active' }, '');
        return;
      }

      // 2. If no modal is open, show the Pause / Save & Exit confirmation modal
      setShowExitConfirm(true);
      window.history.pushState({ screen: 'quiz_active' }, '');
    };

    window.addEventListener('popstate', handleQuizPopState);
    return () => {
      window.removeEventListener('popstate', handleQuizPopState);
    };
  }, [showAiModal, showReportModal, showPalette, showSubmitConfirm, showExitConfirm]);

  // Touch Swipe Gesture & Slide Transition State
  const [slideDirection, setSlideDirection] = useState<number>(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  const progressPercent = currentQuiz.isInfinite 
    ? (userAnswers.length / (userAnswers.length + 1)) * 100 
    : ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;

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

  // Per-Question Countdown Timer Reset
  useEffect(() => {
    if (effectiveTimePerQ > 0) {
      setQuestionTimer(effectiveTimePerQ);
    }
  }, [currentQuestionIndex, effectiveTimePerQ]);

  // Per-Question Countdown Timer Interval
  useEffect(() => {
    if (effectiveTimePerQ <= 0 || isPaused) return;
    const qInterval = setInterval(() => {
      setQuestionTimer(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(qInterval);
  }, [isPaused, effectiveTimePerQ]);

  // Sync current question's state on question change
  useEffect(() => {
    if (!currentQuestion) {
      setSelectedOption(null);
      setShowFeedback(false);
      return;
    }
    // Strict match: questionIndex matches currentQuestionIndex OR both valid matching questionIds exist
    const existing = userAnswers.find(a => 
      a.questionIndex !== undefined 
        ? a.questionIndex === currentQuestionIndex 
        : (!!a.questionId && !!currentQuestion.id && a.questionId === currentQuestion.id)
    );
    if (existing && existing.selectedOptionIndex !== null && existing.selectedOptionIndex !== undefined) {
      setSelectedOption(existing.selectedOptionIndex);
      if (mode === 'PRACTICE') {
        setShowFeedback(true);
      } else {
        setShowFeedback(false);
      }
    } else {
      setSelectedOption(null);
      setShowFeedback(false);
    }
  }, [currentQuestionIndex, userAnswers, currentQuestion?.id, mode]);

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
    if (!currentQuestion) return;
    const isCorrect = optionIdx === currentQuestion.correctAnswerIndex;
    const newAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      questionIndex: currentQuestionIndex,
      selectedOptionIndex: optionIdx,
      isCorrect,
      timeSpent: timer
    };

    if (mode === 'PRACTICE') {
      // In PRACTICE mode: Tapping an option immediately validates & reveals feedback + explanation!
      if (showFeedback) return; // already locked for practice
      setSelectedOption(optionIdx);
      setUserAnswers(prev => {
        const filtered = prev.filter(a => 
          a.questionIndex !== undefined 
            ? a.questionIndex !== currentQuestionIndex 
            : a.questionId !== currentQuestion.id
        );
        return [...filtered, newAnswer];
      });
      setShowFeedback(true);
    } else {
      // In TEST mode: Tapping an option selects choice, NO immediate correct answer/explanation revealed!
      setSelectedOption(optionIdx);
      setUserAnswers(prev => {
        const filtered = prev.filter(a => 
          a.questionIndex !== undefined 
            ? a.questionIndex !== currentQuestionIndex 
            : a.questionId !== currentQuestion.id
        );
        return [...filtered, newAnswer];
      });
    }
  };

  const handleNext = async () => {
    setSlideDirection(1);
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setSelectedOption(null);
      setShowFeedback(false);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (quiz.isInfinite && onFetchNext) {
      setIsFetchingNext(true);
      try {
        await onFetchNext();
        setSelectedOption(null);
        setShowFeedback(false);
        setCurrentQuestionIndex(prev => prev + 1);
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
    setSlideDirection(-1);
    if (currentQuestionIndex > 0) {
      setSelectedOption(null);
      setShowFeedback(false);
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
    setTouchEndX(null);
    setTouchEndY(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const diffX = touchStartX - touchEndX;
    const diffY = (touchStartY !== null && touchEndY !== null) ? Math.abs(touchStartY - touchEndY) : 0;
    const minSwipeDistance = 45;

    // Only trigger horizontal slide if horizontal delta is larger than vertical movement
    if (Math.abs(diffX) > minSwipeDistance && Math.abs(diffX) > diffY * 1.1) {
      if (diffX > 0) {
        // Swiped Left -> Move forward to next question (Slide Left)
        handleNext();
      } else if (diffX < 0) {
        // Swiped Right -> Move back to previous question (Slide Right)
        if (currentQuestionIndex > 0) {
          handlePrevious();
        }
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
    setTouchEndX(null);
    setTouchEndY(null);
  };

  const getQuestionStatus = (index: number) => {
    const targetQ = quiz.questions[index];
    if (!targetQ) return 'unvisited';
    const answer = userAnswers.find(a => 
      a.questionIndex !== undefined ? a.questionIndex === index : a.questionId === targetQ.id
    );
    const hasAnswer = answer && answer.selectedOptionIndex !== null && answer.selectedOptionIndex !== undefined;
    
    if (hasAnswer) {
      if (mode === 'PRACTICE') {
        return answer.isCorrect ? 'correct' : 'incorrect';
      } else {
        return 'answered';
      }
    }
    
    if (visitedIndices.has(index)) {
      return 'skipped';
    }
    
    return 'unvisited';
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    return formatDuration(secs);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#fcfdfe] dark:bg-slate-950 text-xs select-text">
      {/* Top Navigation Bar with premium dark focus styling */}
      <div className="bg-slate-900 text-white dark:bg-slate-950 border-b border-slate-800 px-4 py-2.5 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={() => setShowPalette(!showPalette)} 
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/25 active:scale-95 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border border-blue-500/30 shadow-xs shrink-0"
              title="Open Question Navigator"
            >
              <HelpCircle size={11} className="text-blue-400 animate-pulse shrink-0" />
              <span>{currentQuestionIndex + 1}{quiz.isInfinite ? "" : ` / ${quiz.questions.length}`}</span>
            </button>

            {/* Mode Badge */}
            <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-slate-800 text-indigo-400 border border-slate-700`}>
              {mode === 'PRACTICE' ? <Sparkles size={10} /> : <CheckSquare size={10} />}
              {mode === 'PRACTICE' ? 'Practice Mode' : 'Quiz Exam Mode'}
            </span>

            {/* Timer Display */}
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800 text-emerald-400 font-extrabold text-[10px] border border-slate-750 shrink-0">
              <Timer size={12} className="text-emerald-400 animate-pulse shrink-0" />
              <span>
                {totalSecondsAllowed > 0 
                  ? formatTime(remainingSeconds)
                  : formatTime(timer)}
              </span>
              {effectiveTimePerQ > 0 && (
                <span className={`ml-1 pl-1 border-l border-slate-700 font-mono text-[9px] ${questionTimer <= 5 ? 'text-rose-500 font-black animate-pulse' : 'text-slate-400'}`}>
                  {questionTimer}s
                </span>
              )}
            </div>
          </div>
          
          <div className="flex-1 max-w-xs h-1 bg-slate-800 rounded-full overflow-hidden mx-2 hidden md:block">
            <div className={`h-full bg-blue-500 transition-all duration-500 ${quiz.isInfinite ? 'animate-pulse' : ''}`} style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className={`px-2 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all shrink-0 ${
                isPaused 
                  ? 'bg-amber-500 text-white animate-bounce shadow-md' 
                  : 'bg-slate-800 text-amber-400 border border-slate-700 hover:bg-slate-700'
              }`}
              title={isPaused ? "Resume Test" : "Pause Test"}
            >
              {isPaused ? <Play size={11} fill="currentColor" /> : <Timer size={11} />}
              <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
            <button 
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-blue-400 transition-all hidden sm:block border border-slate-700 shrink-0"
              title="Fullscreen"
            >
              <Maximize2 size={13} />
            </button>
            <button 
              onClick={() => onSaveQuestion({ quizTitle: quiz.title, question: currentQuestion })} 
              className={`p-1.5 rounded-lg transition-all shrink-0 ${savedIds.has(currentQuestion.id) ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-blue-400'}`}
              title="Bookmark Question"
            >
              <Bookmark size={13} fill={savedIds.has(currentQuestion.id) ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={() => setShowReportModal(true)} 
              className="p-1.5 rounded-lg bg-rose-950/20 text-rose-400 border border-rose-900/40 hover:bg-rose-900/40 transition-all flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider shrink-0"
              title="Report Wrong Answer / Issue"
            >
              <AlertTriangle size={13} />
              <span className="hidden sm:inline">Report</span>
            </button>
            <button 
              onClick={() => setShowSubmitConfirm(true)}
              className="px-3 sm:px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-md hover:from-emerald-600 hover:to-teal-600 active:scale-95 transition-all shrink-0"
            >
              <span>Submit<span className="hidden sm:inline"> Test</span></span>
            </button>
          </div>
        </div>
      </div>

      {/* Question Body with Touch Swipe Detection */}
      <div 
        className={`flex-1 ${isPaused || showSubmitConfirm || showExitConfirm || showReportModal || showAiModal || showPalette ? 'overflow-hidden' : 'overflow-y-auto'} px-0 sm:px-4 pt-1.5 pb-6 relative touch-pan-y`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isPaused && (
          <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
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

        {/* Quiz Name Box (moved slightly up as requested) */}
        <div className="w-full max-w-2xl mx-auto mb-2 px-4 sm:px-0">
          <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
              <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                {quiz.title}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[8px] font-black uppercase tracking-widest rounded-md ${quiz.isInfinite ? 'animate-pulse' : ''}`}>
                {mode === 'PRACTICE' ? 'Practice Mode' : 'Quiz Exam Mode'}
              </span>
              {quiz.isInfinite && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-widest border border-emerald-200 dark:border-emerald-900/40">
                  <Sparkles size={8} className="animate-spin" />
                  {isFetchingNext ? "Buffering..." : `${Math.max(0, quiz.questions.length - (currentQuestionIndex + 1))} Backup`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Premium Horizontal Question Circle Navigator Bar */}
        <div className="w-full max-w-2xl mx-auto mb-3 px-4 sm:px-0">
          <div 
            className={`flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 w-full flex-nowrap scroll-smooth no-scrollbar ${
              currentQuiz.questions.length > 6 ? 'justify-start' : 'justify-start sm:justify-center'
            }`}
            style={{
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {currentQuiz.questions.map((_, i) => {
              const status = getQuestionStatus(i);
              const isActive = i === currentQuestionIndex;
              
              // Color mapping matches the gorgeous exam layout in user's reference image
              let circleStyle = "";
              if (isActive) {
                if (status === 'correct') {
                  circleStyle = "bg-emerald-500 text-white ring-4 ring-emerald-500/35 scale-105 z-10 font-black border-2 border-emerald-600 dark:border-emerald-400";
                } else if (status === 'incorrect') {
                  circleStyle = "bg-rose-500 text-white ring-4 ring-rose-500/35 scale-105 z-10 font-black border-2 border-rose-600 dark:border-rose-400";
                } else if (status === 'answered') {
                  circleStyle = "bg-emerald-600 text-white ring-4 ring-emerald-600/35 scale-105 z-10 font-black border-2 border-emerald-700 dark:border-emerald-400";
                } else if (status === 'skipped') {
                  circleStyle = "bg-amber-500 text-white ring-4 ring-amber-500/35 scale-105 z-10 font-black border-2 border-amber-600 dark:border-amber-400";
                } else {
                  circleStyle = "bg-blue-600 text-white ring-4 ring-blue-500/35 scale-105 z-10 font-black border-2 border-blue-700 dark:border-blue-400";
                }
              } else {
                if (status === 'correct') {
                  circleStyle = "bg-emerald-500 text-white hover:bg-emerald-600 border border-transparent";
                } else if (status === 'incorrect') {
                  circleStyle = "bg-rose-500 text-white hover:bg-rose-600 border border-transparent";
                } else if (status === 'answered') {
                  circleStyle = "bg-emerald-600 text-white hover:bg-emerald-700 border border-transparent";
                } else if (status === 'skipped') {
                  circleStyle = "bg-amber-500 text-white hover:bg-amber-600 border border-transparent";
                } else {
                  // Not visited yet
                  circleStyle = "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-200/80 dark:hover:bg-slate-750";
                }
              }

              return (
                <button
                  key={i}
                  id={`circle-nav-${i}`}
                  onClick={() => {
                    setSlideDirection(i >= currentQuestionIndex ? 1 : -1);
                    setSelectedOption(null);
                    setShowFeedback(false);
                    setCurrentQuestionIndex(i);
                  }}
                  className={`w-full max-w-[36px] sm:max-w-[40px] aspect-square text-xs sm:text-sm rounded-full flex items-center justify-center font-black transition-all active:scale-95 shrink-0 shadow-xs ${circleStyle}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait" custom={slideDirection}>
          <motion.div
            key={currentQuestionIndex}
            custom={slideDirection}
            variants={{
              enter: (direction: number) => ({
                x: direction > 0 ? 65 : -65,
                opacity: 0,
              }),
              center: {
                x: 0,
                opacity: 1,
              },
              exit: (direction: number) => ({
                x: direction > 0 ? -65 : 65,
                opacity: 0,
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 360, damping: 32 },
              opacity: { duration: 0.18 },
            }}
            className="w-full max-w-2xl mx-auto px-4 sm:px-0 space-y-4"
          >
            {/* Question Text with distinct background area and smart highlight */}
            <div className="bg-blue-50/45 dark:bg-slate-900 border border-blue-100/50 dark:border-slate-850 px-4 sm:px-5 py-4 rounded-2xl shadow-3xs whitespace-pre-wrap break-words">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-relaxed">
                {highlightQuestionText(currentQuestion.question)}
              </h3>
            </div>

            <div className="space-y-2.5">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQuestion.correctAnswerIndex;
                let btnStyle = "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-850";
                
                if (mode === 'PRACTICE' && showFeedback) {
                  // Practice mode instant feedback styling
                  if (isCorrect) btnStyle = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-2xs font-semibold";
                  else if (isSelected) btnStyle = "bg-rose-50 dark:bg-rose-900/20 border-rose-500 text-rose-700 dark:text-rose-400 shadow-2xs font-semibold";
                  else btnStyle = "opacity-40 grayscale-[0.5]";
                } else if (isSelected) {
                  // Test mode / pre-feedback selected styling
                  btnStyle = "bg-blue-50 dark:bg-blue-900/30 border-blue-600 ring-2 ring-blue-500/20 text-blue-900 dark:text-blue-200 font-semibold shadow-2xs";
                }

                return (
                  <button 
                    key={idx} 
                    disabled={mode === 'PRACTICE' && showFeedback} 
                    onClick={() => handleOptionClick(idx)} 
                    className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center group ${btnStyle}`}
                  >
                    <div className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full border flex items-center justify-center mr-3 font-black text-xs transition-all shrink-0 aspect-square
                      ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-850'}
                    `}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="font-semibold text-xs sm:text-sm leading-snug flex-1 text-slate-800 dark:text-slate-200">{option}</span>
                    {mode === 'TEST' && isSelected && (
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider ml-2">Selected</span>
                    )}
                  </button>
                );
              })}
            </div>

            {mode === 'PRACTICE' && showFeedback && (
              <DecoratedExplanation 
                explanation={currentQuestion.explanation} 
                onAskAi={() => setShowAiModal(true)}
              />
            )}
          </motion.div>
        </AnimatePresence>
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
                      {mode === 'TEST' ? 'Green = Answered, Amber = Skipped, Gray = Not Visited' : 'Green = Correct, Red = Incorrect, Amber = Skipped, Gray = Not Visited'}
                    </p>
                    {mode === 'PRACTICE' && (
                      <div className="flex gap-4 mt-2">
                        <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Correct: {quiz.questions.reduce((acc, _, i) => getQuestionStatus(i) === 'correct' ? acc + 1 : acc, 0)}</div>
                        <div className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase">Wrong: {quiz.questions.reduce((acc, _, i) => getQuestionStatus(i) === 'incorrect' ? acc + 1 : acc, 0)}</div>
                      </div>
                    )}
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
                        onClick={() => { 
                          setSlideDirection(i >= currentQuestionIndex ? 1 : -1);
                          setSelectedOption(null); 
                          setShowFeedback(false); 
                          setCurrentQuestionIndex(i); 
                          setShowPalette(false); 
                        }}
                        className={`aspect-square rounded-xl text-[10px] font-black border transition-all flex items-center justify-center
                          ${currentQuestionIndex === i ? 'ring-2 ring-blue-500 scale-105 shadow-sm' : 'border-transparent'}
                          ${status === 'correct' ? 'bg-emerald-500 text-white' : 
                            status === 'incorrect' ? 'bg-rose-500 text-white' : 
                            status === 'answered' ? 'bg-emerald-600 text-white' :
                            status === 'skipped' ? 'bg-amber-500 text-white border border-amber-600/30' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-slate-700/60'}
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
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 px-4 py-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <button 
            onClick={handlePrevious} 
            disabled={currentQuestionIndex === 0 || isFetchingNext}
            className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all active:scale-95
              ${(currentQuestionIndex === 0 || isFetchingNext) ? 'opacity-0 pointer-events-none' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800'}
            `}
          >
            <ChevronLeft size={16} /> Prev
          </button>

          <div className="flex gap-2 flex-1 justify-end">
             <button 
               onClick={handleNext}
               disabled={isFetchingNext}
               className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 min-w-[130px] justify-center"
             >
                {isFetchingNext ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                   {currentQuestionIndex === quiz.questions.length - 1 && !quiz.isInfinite ? (mode === 'TEST' ? "Submit Test" : "Finish") : "Next"} <ChevronRight size={16} />
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

      {/* AI Instant Explanation Modal */}
      {showAiModal && currentQuestion && (
        <AiExplainModal
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          question={currentQuestion}
          userSelectedOption={selectedOption}
        />
      )}

      {/* Report Wrong Answer & AI Auto-Fix Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[250] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm uppercase tracking-wider">
                <AlertTriangle size={18} /> Report & AI Auto-Fix
              </div>
              <button 
                onClick={() => {
                  setShowReportModal(false);
                  setReportAuditResult(null);
                  setReportError(null);
                }} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            {isAuditingReport ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
                  <Sparkles size={20} className="absolute inset-0 m-auto text-indigo-600 dark:text-indigo-400 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">AI Fact-Checking Question #{currentQuestionIndex + 1}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Verifying factual accuracy, options, and answer keys...</p>
                </div>
              </div>
            ) : reportAuditResult ? (
              <div className="space-y-4">
                {reportAuditResult.wasChanged ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black text-xs uppercase tracking-wider">
                      <Sparkles size={16} className="text-amber-600" /> AI Corrected Wrong Answer Key!
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 line-through font-medium">
                        <span className="font-bold">Previous Key:</span> Option {String.fromCharCode(65 + reportAuditResult.oldCorrectIndex)} ({reportAuditResult.oldOption})
                      </div>
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                        <ArrowRight size={14} className="text-emerald-600" />
                        <span>Verified Correct:</span> Option {String.fromCharCode(65 + reportAuditResult.newCorrectIndex)} ({reportAuditResult.newOption})
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
                      <span className="font-bold text-amber-900 dark:text-amber-200">AI Reason: </span>{reportAuditResult.reason}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-xs uppercase tracking-wider">
                      <ShieldCheck size={18} className="text-emerald-600" /> Fact-Check Verified: Answer Key is 100% Correct!
                    </div>
                    <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                      Option {String.fromCharCode(65 + reportAuditResult.newCorrectIndex)} ("{reportAuditResult.newOption}") is factually correct.
                    </p>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                      <span className="font-bold text-emerald-900 dark:text-emerald-200">AI Explanation: </span>{reportAuditResult.reason}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportAuditResult(null);
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95"
                >
                  Done & Continue Test
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Report an error or issue for <span className="font-bold text-slate-900 dark:text-white">Question #{currentQuestionIndex + 1}</span>. AI will verify facts and automatically correct mistakes across the app & JSON file:
                </p>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 line-clamp-3">
                  "{currentQuestion?.question}"
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Select Issue Type</label>
                  <select 
                    value={reportReason} 
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Wrong Answer Key">Wrong Answer Key</option>
                    <option value="Typo or Formatting Error">Typo or Formatting Error</option>
                    <option value="Incorrect Explanation">Incorrect Explanation</option>
                    <option value="Confusing Options">Confusing Options</option>
                    <option value="Other Issue">Other Issue</option>
                  </select>
                </div>

                {reportError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    {reportError}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => {
                      setShowReportModal(false);
                      setReportError(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleReportAndAudit}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={14} /> Submit & AI Fix
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Toast Alert */}
      {reportToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white border-2 border-black px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{reportToast}</span>
        </div>
      )}
    </div>
  );
};

export default Quiz;
