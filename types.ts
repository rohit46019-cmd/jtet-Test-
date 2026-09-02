
export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  categoryId?: string;
  subCategoryId?: string;
  thumbnailUrl?: string;
  questions: Question[];
  createdAt: number;
  isInfinite?: boolean;
  originalPrompt?: string;
  language?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export function formatDuration(totalSeconds?: number): string {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '0s';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  }
  if (m > 0) {
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }
  return `${s}s`;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  thumbnailUrl?: string;
  icon?: string;
  createdAt?: number;
}

export type AppState = 'IDLE' | 'PROCESSING_PDF' | 'CONFIGURING_QUIZ' | 'GENERATING_QUIZ' | 'QUIZ_IN_PROGRESS' | 'RESULTS';
export type TabState = 'HOME' | 'LIBRARY' | 'SAVED' | 'AI_PROMPT' | 'ADMIN' | 'LEADERBOARD' | 'SETTINGS';

export interface UserAnswer {
  questionId: string;
  questionIndex?: number;
  selectedOptionIndex: number | null; // null for skipped
  isCorrect: boolean;
  timeSpent?: number; // in seconds
}

export interface StoredQuiz extends Quiz {
  lastScore?: number;
  lastPoints?: number;
}

export interface BookmarkedQuestion {
  quizTitle: string;
  question: Question;
}

export type QuizMode = 'PRACTICE' | 'TEST';

export interface QuizConfig {
  mode: QuizMode;
  positiveMarks: number;
  negativeMarks: number;
  timePerQuestion: number; // seconds, 0 = no limit
  testDurationMinutes: number; // minutes, 0 = no limit
  shuffleQuestions?: boolean;
}

export interface SavedQuizSession {
  quiz: Quiz;
  quizConfig: QuizConfig;
  currentQuestionIndex: number;
  userAnswers: UserAnswer[];
  timer: number;
  savedAt?: number;
}
