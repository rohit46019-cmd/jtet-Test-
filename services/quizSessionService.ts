import { SavedQuizSession, Quiz, UserAnswer, QuizConfig } from '../types';

const STORAGE_KEY_MAP = 'qf_saved_quiz_sessions_map_v1';
const STORAGE_KEY_ACTIVE = 'qf_paused_session_v1';

export const quizSessionService = {
  // Save a paused/in-progress test session
  saveSession(session: SavedQuizSession): void {
    try {
      const enriched: SavedQuizSession = {
        ...session,
        savedAt: Date.now()
      };

      // 1. Save as latest active session
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(enriched));

      // 2. Save into per-quiz lookup map
      const mapRaw = localStorage.getItem(STORAGE_KEY_MAP);
      const map: Record<string, SavedQuizSession> = mapRaw ? JSON.parse(mapRaw) : {};
      
      const key = session.quiz.id || session.quiz.title;
      if (key) {
        map[key] = enriched;
        localStorage.setItem(STORAGE_KEY_MAP, JSON.stringify(map));
      }
    } catch (e) {
      console.warn('Error saving quiz session:', e);
    }
  },

  // Get saved session for a specific quiz (by id or title)
  getSessionForQuiz(quiz: Quiz): SavedQuizSession | null {
    try {
      const mapRaw = localStorage.getItem(STORAGE_KEY_MAP);
      if (mapRaw) {
        const map: Record<string, SavedQuizSession> = JSON.parse(mapRaw);
        if (quiz.id && map[quiz.id]) return map[quiz.id];
        if (quiz.title && map[quiz.title]) return map[quiz.title];
      }

      // Fallback check against latest active session
      const activeRaw = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (activeRaw) {
        const active: SavedQuizSession = JSON.parse(activeRaw);
        if (active?.quiz?.id === quiz.id || active?.quiz?.title === quiz.title) {
          return active;
        }
      }
    } catch (e) {
      console.warn('Error reading quiz session:', e);
    }
    return null;
  },

  // Get active session if available
  getActiveSession(): SavedQuizSession | null {
    try {
      const activeRaw = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (activeRaw) {
        return JSON.parse(activeRaw);
      }
    } catch (e) {
      console.warn('Error reading active quiz session:', e);
    }
    return null;
  },

  // Remove saved session when finished or restarted fresh
  clearSessionForQuiz(quizIdOrTitle: string): void {
    try {
      const mapRaw = localStorage.getItem(STORAGE_KEY_MAP);
      if (mapRaw) {
        const map: Record<string, SavedQuizSession> = JSON.parse(mapRaw);
        delete map[quizIdOrTitle];
        localStorage.setItem(STORAGE_KEY_MAP, JSON.stringify(map));
      }

      const activeRaw = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (activeRaw) {
        const active: SavedQuizSession = JSON.parse(activeRaw);
        if (active?.quiz?.id === quizIdOrTitle || active?.quiz?.title === quizIdOrTitle) {
          localStorage.removeItem(STORAGE_KEY_ACTIVE);
        }
      }
    } catch (e) {
      console.warn('Error clearing quiz session:', e);
    }
  },

  // Clear all saved sessions
  clearAllSessions(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_MAP);
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    } catch (e) {
      console.warn('Error clearing all sessions:', e);
    }
  }
};
