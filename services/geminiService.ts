import { Quiz, Question } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

export const PRIMARY_MODEL = 'gemini-3.7-flash';
export const GEMINI_MODELS = [
  'gemini-3.7-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash-8b'
];

let userApiKeys: string[] = [];

/**
 * Sets user-provided API keys for rotation
 */
export const setUserApiKeys = (keys: string[]) => {
  userApiKeys = (keys || []).map(k => k.trim()).filter(Boolean);
};

/**
 * Returns user or environment keys available on client side
 */
function getClientGenAIKeys(): string[] {
  let keys = [...userApiKeys];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('qf_user_api_keys') || localStorage.getItem('gemini_api_key');
      if (stored) {
        if (stored.startsWith('[')) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) keys.push(...parsed.map(k => String(k).trim()).filter(Boolean));
        } else {
          keys.push(...stored.split(',').map(k => k.trim()).filter(Boolean));
        }
      }
    } catch (_) {}
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) {
    keys.push((import.meta as any).env.VITE_GEMINI_API_KEY);
  }
  return Array.from(new Set(keys)).filter(Boolean);
}

/**
 * Returns headers to send with AI requests, including custom keys if configured
 */
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const keys = getClientGenAIKeys();
  if (keys.length > 0) {
    headers['x-gemini-api-key'] = keys.join(',');
  }
  return headers;
}

async function handleResponseError(res: Response, fallbackPrefix: string): Promise<never> {
  let errorMsg = `HTTP ${res.status}`;
  try {
    const text = await res.text();
    try {
      const errorData = JSON.parse(text);
      if (errorData.error) errorMsg = errorData.error;
    } catch (_) {
      if (text && text.length < 300 && !text.includes('<!DOCTYPE') && !text.includes('<html')) {
        errorMsg = text;
      }
    }
  } catch (_) {}

  if (res.status === 500 && errorMsg.includes('HTTP 500')) {
    errorMsg = 'Server error or missing GEMINI_API_KEY environment variable on Vercel. Please add GEMINI_API_KEY in Vercel settings or enter your API key in app Settings.';
  }

  throw new Error(`${fallbackPrefix}: ${errorMsg}`);
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
  try {
    const res = await fetch('/api/ai/generate-batch', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ prompt, history, count, language, difficulty })
    });

    if (res.ok) {
      const data = await res.json();
      return data.questions || [];
    }
  } catch (_) {}

  // Client-side fallback if backend fails or on Vercel
  const clientKeys = getClientGenAIKeys();
  if (clientKeys.length > 0) {
    const ai = new GoogleGenAI({ apiKey: clientKeys[0] });
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: `Generate exactly ${count} unique MCQ questions on topic: "${prompt}". Return valid JSON with questions array.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ['question', 'options', 'correctAnswerIndex', 'explanation']
              }
            }
          },
          required: ['questions']
        }
      }
    });
    const parsed = JSON.parse(response.text || '{}');
    return (parsed.questions || []).map((q: any) => ({ ...q, id: crypto.randomUUID() }));
  }

  throw new Error('Failed to generate batch questions. Please check API key in Settings.');
}

/**
 * Generates a SINGLE unique question based on a prompt and previous history.
 */
export async function generateSingleQuestion(
  prompt: string,
  history: string[] = [],
  language: string = 'English'
): Promise<Question> {
  const batch = await generateBatchQuestions(prompt, history, 1, language, 'medium');
  if (batch && batch.length > 0) return batch[0];
  throw new Error('Could not generate single question.');
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
    await handleResponseError(res, 'Failed to generate quiz from text');
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
  const initialQuestions = await generateBatchQuestions(prompt, [], Math.max(count, 6), language, difficulty);
  return {
    id: crypto.randomUUID(),
    title: `Quiz on ${prompt}`,
    questions: initialQuestions,
    createdAt: Date.now(),
    isInfinite: true,
    originalPrompt: prompt,
    language
  };
}

/**
 * Client-side direct generation of deep explanation using @google/genai
 */
export async function generateClientDeepExplanation(
  question: Question,
  userSelectedOption?: number | null,
  language: string = 'Hindi & English',
  customKeys?: string[]
): Promise<string> {
  const keys = customKeys && customKeys.length > 0 ? customKeys : getClientGenAIKeys();
  if (keys.length === 0) {
    throw new Error('No Gemini API key configured. Please add GEMINI_API_KEY in Vercel settings or enter your API key in app Settings.');
  }

  const selectedText = (userSelectedOption !== null && userSelectedOption !== undefined && question.options[userSelectedOption])
    ? question.options[userSelectedOption]
    : 'None selected';
  const correctText = question.options[question.correctAnswerIndex] || 'Unknown';

  const models = GEMINI_MODELS;
  let lastErr: any = null;

  for (const key of keys) {
    const ai = new GoogleGenAI({ apiKey: key });
    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: `You are an elite exam mentor specializing in high-yield competitive exam prep.
Analyze this MCQ and write a crystal-clear, deep pedagogical explanation.

QUESTION DETAILS:
- Question: "${question.question}"
- Options:
${question.options.map((opt, i) => `  ${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}
- Factually Correct Answer: Option ${String.fromCharCode(65 + question.correctAnswerIndex)} ("${correctText}")
- Student's Choice: ${userSelectedOption !== null && userSelectedOption !== undefined ? `Option ${String.fromCharCode(65 + userSelectedOption)} ("${selectedText}")` : 'None'}

FORMAT REQUIREMENTS:
Use clean markdown with emojis and bold headers:
- **🎯 Verified Correct Answer:** [Option & short direct summary]
- **💡 Core Concept Breakdown:** Deep, intuitive explanation of the concept in ${language}.
${userSelectedOption !== null && userSelectedOption !== undefined && userSelectedOption !== question.correctAnswerIndex ? `- **⚠️ Mistake Analysis:** Why student's pick (${selectedText}) was wrong.` : ''}
- **📌 Memory Trick / Exam Tip:** Handy shortcut, mnemonic, or high-yield exam point.
- **⚡ Quick Concept Check:** One quick 1-line follow-up quiz question.`,
        });
        if (response.text) return response.text;
      } catch (err: any) {
        lastErr = err;
        continue;
      }
    }
  }
  throw lastErr || new Error('Failed to generate explanation. Please check API key in Settings.');
}

/**
 * Generates an instant, highly detailed, pedagogical explanation using Gemini AI.
 */
export async function generateDeepExplanation(
  question: Question,
  userSelectedOption?: number | null,
  language: string = 'Hindi & English'
): Promise<string> {
  try {
    const res = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ question, userSelectedOption, language })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.explanation) return data.explanation;
    }
  } catch (_) {}

  // Seamless client fallback if server route is offline or returning Vercel error
  return generateClientDeepExplanation(question, userSelectedOption, language);
}

/**
 * Client-side direct audit of quiz questions using @google/genai
 */
export async function auditAndFixClientQuizQuestions(
  questions: Question[],
  language: string = 'Hindi/English',
  customKeys?: string[]
): Promise<AuditFixResult> {
  const keys = customKeys && customKeys.length > 0 ? customKeys : getClientGenAIKeys();
  if (keys.length === 0) {
    throw new Error('No Gemini API key configured. Please add GEMINI_API_KEY in Vercel settings or enter your API key in app Settings.');
  }

  const BATCH_SIZE = 8;
  const fixedQuestions: Question[] = [];
  const auditNotes: AuditFixResult['auditNotes'] = [];
  const models = GEMINI_MODELS;

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    const questionsPayload = batch.map((q, idx) => ({
      index: i + idx,
      id: q.id,
      question: q.question,
      options: q.options,
      currentCorrectIndex: q.correctAnswerIndex,
      currentCorrectOption: q.options[q.correctAnswerIndex] || '',
      currentExplanation: q.explanation || ''
    }));

    let batchSuccess = false;
    for (const key of keys) {
      if (batchSuccess) break;
      const ai = new GoogleGenAI({ apiKey: key });

      for (const model of models) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: `You are an expert exam auditor and academic proofreader.
Audit and verify the answer keys of the following multiple choice questions.

Audit Rules:
1. Carefully analyze each question and its 4 options.
2. Verify if "currentCorrectIndex" points to the factually correct option.
3. If "currentCorrectIndex" is WRONG, identify the actual correct option index (0 to 3) and provide a concise reason for why it was changed.
4. If "currentCorrectIndex" is ALREADY CORRECT, keep it and provide a verified explanation.
5. Write explanation in ${language}.

QUESTIONS TO AUDIT:
${JSON.stringify(questionsPayload, null, 2)}

Return strict JSON adhering to the schema.`,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  auditedQuestions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        index: { type: Type.INTEGER },
                        id: { type: Type.STRING },
                        isCorrectKeyValid: { type: Type.BOOLEAN },
                        correctedAnswerIndex: { type: Type.INTEGER },
                        explanation: { type: Type.STRING },
                        auditReason: { type: Type.STRING }
                      },
                      required: ['index', 'isCorrectKeyValid', 'correctedAnswerIndex', 'explanation']
                    }
                  }
                },
                required: ['auditedQuestions']
              }
            }
          });

          const data = JSON.parse(response.text || '{}');
          const auditedList = data.auditedQuestions || [];

          batch.forEach((origQ, bIdx) => {
            const globalIdx = i + bIdx;
            const auditInfo = auditedList.find((a: any) => a.index === globalIdx || a.id === origQ.id);

            if (auditInfo) {
              const newIdx = (typeof auditInfo.correctedAnswerIndex === 'number' && auditInfo.correctedAnswerIndex >= 0 && auditInfo.correctedAnswerIndex < origQ.options.length)
                ? auditInfo.correctedAnswerIndex
                : origQ.correctAnswerIndex;

              const wasChanged = newIdx !== origQ.correctAnswerIndex;

              if (wasChanged) {
                auditNotes.push({
                  questionIndex: globalIdx + 1,
                  questionText: origQ.question,
                  oldCorrectIndex: origQ.correctAnswerIndex,
                  oldOption: origQ.options[origQ.correctAnswerIndex] || '',
                  newCorrectIndex: newIdx,
                  newOption: origQ.options[newIdx] || '',
                  reason: auditInfo.auditReason || 'Corrected wrongly marked answer key based on fact verification.'
                });
              }

              fixedQuestions.push({
                ...origQ,
                correctAnswerIndex: newIdx,
                explanation: auditInfo.explanation || origQ.explanation
              });
            } else {
              fixedQuestions.push(origQ);
            }
          });

          batchSuccess = true;
          break;
        } catch (err) {
          continue;
        }
      }
    }

    if (!batchSuccess) {
      fixedQuestions.push(...batch);
    }
  }

  return {
    questions: fixedQuestions,
    fixedCount: auditNotes.length,
    auditNotes
  };
}

/**
 * Audits a batch of quiz questions with AI to detect and fix wrongly marked answer keys and improve explanations.
 */
export async function auditAndFixQuizQuestions(
  questions: Question[],
  language: string = 'Hindi/English'
): Promise<AuditFixResult> {
  try {
    const res = await fetch('/api/ai/audit', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ questions, language })
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (_) {}

  // Seamless client fallback
  return auditAndFixClientQuizQuestions(questions, language);
}

