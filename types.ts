
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
}

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  thumbnailUrl?: string;
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
