import { Quiz, Question } from "../types";

export const PRIMARY_MODEL = 'gemini-3.6-flash';
export const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];

let userApiKeys: string[] = [];

/**
 * Sets user-provided API keys for rotation
 */
export const setUserApiKeys = (keys: string[]) => {
  userApiKeys = (keys || []).map(k => k.trim()).filter(Boolean);
};

/**
 * Returns headers to send with AI requests, including custom keys if configured
 */
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userApiKeys.length > 0) {
    headers['x-gemini-api-key'] = userApiKeys.join(',');
  }
  return headers;
}

export interface AuditFixResult {
  questions: Question[];
  fixedCount: number;
  auditNotes: Array<{
    questionIndex: number;
    questionText: string;
    oldCorrectIndex: number;
    oldOption: string;
    newCorrectIndex: number;
    newOption: string;
    reason: string;
  }>;
}

/**
 * Generates a batch of unique questions based on a prompt and previous history.
 */
export async function generateBatchQuestions(
  prompt: string,
  history: string[] = [],
  count: number = 6,
  language: string = 'English',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<Question[]> {
  const res = await fetch('/api/ai/generate-batch', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prompt, history, count, language, difficulty })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate questions (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.questions || [];
}

/**
 * Generates a SINGLE unique question based on a prompt and previous history.
 */
export async function generateSingleQuestion(
  prompt: string,
  history: string[] = [],
  language: string = 'English'
): Promise<Question> {
  const res = await fetch('/api/ai/generate-single', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prompt, history, language })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate question (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.question;
}

/**
 * Generates a quiz from text with chunking (e.g. from uploaded document/PDF).
 */
export async function generateQuizFromText(
  text: string,
  totalCount: number = 10,
  language: string = 'English',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<Quiz> {
  const res = await fetch('/api/ai/generate-from-text', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ text, totalCount, language, difficulty })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate quiz from text (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.quiz;
}

/**
 * Infinite mode initializer: pre-generates backup questions right away.
 */
export async function generateQuizFromPrompt(
  prompt: string,
  count: number = 6,
  language: string = 'English',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<Quiz> {
  const res = await fetch('/api/ai/generate-from-prompt', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prompt, count, language, difficulty })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate quiz from prompt (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.quiz;
}

/**
 * Generates an instant, highly detailed, pedagogical explanation using Gemini AI.
 */
export async function generateDeepExplanation(
  question: Question,
  userSelectedOption?: number | null,
  language: string = 'Hindi & English'
): Promise<string> {
  const res = await fetch('/api/ai/explain', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ question, userSelectedOption, language })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Explanation could not be generated (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.explanation || 'Explanation could not be generated. Please try again.';
}

/**
 * Audits a batch of quiz questions with AI to detect and fix wrongly marked answer keys and improve explanations.
 */
export async function auditAndFixQuizQuestions(
  questions: Question[],
  language: string = 'Hindi/English'
): Promise<AuditFixResult> {
  const res = await fetch('/api/ai/audit', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ questions, language })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Quiz audit failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data;
}
