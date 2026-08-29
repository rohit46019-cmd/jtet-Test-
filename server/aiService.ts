import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'crypto';

export const PRIMARY_MODEL = 'gemini-3.7-flash';
export const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest'
];

export interface QuestionData {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizData {
  id: string;
  title: string;
  questions: QuestionData[];
  createdAt: number;
  isInfinite?: boolean;
  originalPrompt?: string;
  language?: string;
}

export interface AuditFixResult {
  questions: QuestionData[];
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function randomizeQuestionOptions(question: QuestionData): QuestionData {
  const originalOptions = [...question.options];
  const correctOptionText = originalOptions[question.correctAnswerIndex];
  const shuffledOptions = shuffleArray(originalOptions);
  const newCorrectIndex = shuffledOptions.indexOf(correctOptionText);

  return {
    ...question,
    options: shuffledOptions,
    correctAnswerIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0
  };
}

function parseGeminiError(error: any): { message: string; code?: number } {
  const rawMessage = error?.message || String(error);
  try {
    const jsonStart = rawMessage.indexOf('{');
    if (jsonStart !== -1) {
      const errorObj = JSON.parse(rawMessage.substring(jsonStart));
      const code = errorObj?.error?.code;
      const msg = errorObj?.error?.message;
      if (code === 403) return { message: 'Permission Denied: Provided API key is invalid.', code: 403 };
      if (code === 429) return { message: 'Quota Exhausted: Please wait a moment.', code: 429 };
      if (code === 503) return { message: 'Service Unavailable: Model is overloaded.', code: 503 };
      if (msg) return { message: msg, code };
    }
  } catch (_) {}

  if (rawMessage.includes('permission') || rawMessage.includes('key not valid') || rawMessage.includes('invalid key')) {
    return { message: 'API Permission Error: Provided API key is invalid.', code: 403 };
  }
  if (rawMessage.includes('quota') || rawMessage.includes('limit')) return { message: 'API Quota reached.', code: 429 };
  if (rawMessage.includes('overloaded') || rawMessage.includes('high demand')) return { message: 'Service Overloaded.', code: 503 };
  return { message: rawMessage };
}

function getAvailableKeys(customKeys?: string[]): string[] {
  const userKeys = (customKeys || [])
    .flatMap(k => k.split(','))
    .map(k => k.replace(/["']/g, '').trim())
    .filter(Boolean);

  const envCandidates = [
    process.env.GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.VITE_GOOGLE_API_KEY,
    process.env.API_KEY,
    process.env.VITE_API_KEY,
    process.env.GOOGLE_GENAI_API_KEY,
    process.env.GEMINI_KEY,
    process.env.GEMINI_API_KEYS
  ];

  const envKeys = envCandidates
    .filter((k): k is string => Boolean(k))
    .flatMap(k => k.split(','))
    .map(k => k.replace(/["']/g, '').trim())
    .filter(Boolean);

  const combined = [...userKeys, ...envKeys];
  return Array.from(new Set(combined));
}

async function generateWithFallback(
  ai: GoogleGenAI,
  params: Parameters<typeof ai.models.generateContent>[0]
) {
  const modelsToTry = Array.from(new Set([PRIMARY_MODEL, ...FALLBACK_MODELS]));
  let lastErr: any = null;

  for (const model of modelsToTry) {
    try {
      return await ai.models.generateContent({
        ...params,
        model
      });
    } catch (err: any) {
      lastErr = err;
      const errMsg = String(err?.message || err);
      console.log(`[AI Backend] Model ${model} failed (${errMsg}). Trying fallback model...`);
      if (
        errMsg.includes('not found') ||
        errMsg.includes('no longer available') ||
        errMsg.includes('not supported') ||
        errMsg.includes('deprecated') ||
        errMsg.includes('404') ||
        errMsg.includes('429') ||
        errMsg.includes('quota') ||
        errMsg.includes('Quota') ||
        errMsg.includes('limit') ||
        errMsg.includes('503') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('ResourceExhausted')
      ) {
        continue;
      }
      // For permission errors or fundamental bad requests, still attempt other fallback models before escalating
      continue;
    }
  }
  throw lastErr;
}

async function executeWithRetry<T>(
  operation: (ai: GoogleGenAI) => Promise<T>,
  customKeys?: string[]
): Promise<T> {
  const keys = getAvailableKeys(customKeys);
  if (keys.length === 0) {
    throw new Error('No API Key configured on server or in request. Please configure GEMINI_API_KEY in Settings.');
  }

  const MAX_RETRIES_PER_KEY = 3;
  let lastErrorMessage = '';

  for (const key of keys) {
    for (let attempt = 0; attempt < MAX_RETRIES_PER_KEY; attempt++) {
      try {
        const ai = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
        return await operation(ai);
      } catch (error: any) {
        const { message, code } = parseGeminiError(error);
        lastErrorMessage = message;

        if (code === 429 || code === 503) {
          if (attempt < MAX_RETRIES_PER_KEY - 1) {
            const delay = Math.pow(2, attempt) * 600 + Math.random() * 400;
            console.log(`[AI Backend] Gemini API warning (${code}: ${message}). Retrying attempt ${attempt + 1}/${MAX_RETRIES_PER_KEY} in ${Math.round(delay)}ms...`);
            await sleep(delay);
            continue;
          }
        }

        // On 403 or exhausted retries, try next key
        console.log(`[AI Backend] Key failed with ${code}: ${message}. Trying fallback key if available...`);
        break;
      }
    }
  }

  throw new Error(`AI generation failed: ${lastErrorMessage}. Please check API key in Settings.`);
}

function getOfflineFallbackQuestions(prompt: string, count: number = 6): QuestionData[] {
  const samplePool = [
    {
      q: `What is a core fundamental principle associated with ${prompt}?`,
      options: [
        `Systematic analysis and standardized empirical validation`,
        `Random trial and sporadic observation`,
        `Isolated theoretical speculation without testing`,
        `Subjective intuition and unverified estimation`
      ],
      correct: 0,
      exp: `Systematic analysis and standardized empirical validation form the bedrock methodology for studying ${prompt}.`
    },
    {
      q: `Which of the following best describes the historical or practical significance of ${prompt}?`,
      options: [
        `It has no notable impact on modern practices`,
        `It serves as a foundational milestone guiding current frameworks`,
        `It was exclusively relevant in ancient theoretical models`,
        `It contradicts all established empirical principles`
      ],
      correct: 1,
      exp: `In the context of ${prompt}, historical milestones establish the conceptual frameworks utilized in contemporary applications.`
    },
    {
      q: `When analyzing advanced applications related to ${prompt}, which factor is most critical?`,
      options: [
        `Ignoring baseline metrics and historical data`,
        `Optimizing structural efficiency and accuracy`,
        `Maximizing random variability`,
        `Minimizing documentation and review`
      ],
      correct: 1,
      exp: `Optimizing structural efficiency and accuracy ensures reliable outcomes when working with ${prompt}.`
    },
    {
      q: `What is a primary challenge frequently encountered in ${prompt}?`,
      options: [
        `Complete absence of data or variables`,
        `Managing complexity and maintaining precision`,
        `Infinite computational speed`,
        `Zero operational constraints`
      ],
      correct: 1,
      exp: `Managing complexity and maintaining precision is the primary challenge addressed by experts in ${prompt}.`
    },
    {
      q: `Which methodology is widely recommended for evaluating progress in ${prompt}?`,
      options: [
        `Multi-tier assessment and milestone tracking`,
        `Unstructured guessing`,
        `Avoiding all performance reviews`,
        `Relying solely on anecdotal impressions`
      ],
      correct: 0,
      exp: `Multi-tier assessment and milestone tracking provide objective metrics for evaluating progress in ${prompt}.`
    },
    {
      q: `What is the primary objective of studying or implementing ${prompt}?`,
      options: [
        `To create intentional ambiguity`,
        `To achieve mastery, efficiency, and informed decision-making`,
        `To eliminate all structured processes`,
        `To increase operational friction`
      ],
      correct: 1,
      exp: `Mastery, efficiency, and informed decision-making are the ultimate goals of engaging with ${prompt}.`
    }
  ];

  const questions: QuestionData[] = [];
  for (let i = 0; i < count; i++) {
    const template = samplePool[i % samplePool.length];
    questions.push({
      id: crypto.randomUUID(),
      question: `${template.q} (Topic: ${prompt} - Q${i + 1})`,
      options: [...template.options],
      correctAnswerIndex: template.correct,
      explanation: `**Core Concept:** ${template.exp}\n\n**Why Correct:** Option ${String.fromCharCode(65 + template.correct)} aligns with established academic and practical principles of ${prompt}.\n\n**Key Takeaways:**\n• Always analyze underlying variables.\n• Apply standardized evaluation methods.`
    });
  }
  return questions;
}

function getOfflineFallbackExplanation(question: QuestionData, userSelectedOption?: number | null): string {
  const correctOpt = question.options[question.correctAnswerIndex] || 'Option ' + String.fromCharCode(65 + question.correctAnswerIndex);
  const selectedText = (userSelectedOption !== null && userSelectedOption !== undefined && question.options[userSelectedOption])
    ? question.options[userSelectedOption]
    : 'None / Skipped';

  return `**🎯 Verified Correct Answer:** Option ${String.fromCharCode(65 + question.correctAnswerIndex)}: "${correctOpt}"

**💡 Core Concept & Explanation:**
${question.explanation || 'This question evaluates the primary conceptual framework and key principles associated with the topic.'}

${userSelectedOption !== null && userSelectedOption !== undefined && userSelectedOption !== question.correctAnswerIndex ? `**⚠️ Mistake Analysis:**\nYour selection (${selectedText}) is incorrect because it misinterprets the primary condition or distractor pattern in this question.` : ''}

**📌 Exam Tip:** Always read all four choices carefully to spot subtle distractors before finalizing your answer.

**⚡ Quick Concept Check:** Can you recall the fundamental definition underlying this topic?`;
}

/**
 * Generates an instant pedagogical explanation.
 */
export async function generateServerDeepExplanation(
  question: QuestionData,
  userSelectedOption?: number | null,
  language: string = 'Hindi & English',
  customKeys?: string[]
): Promise<string> {
  const optionsText = question.options
    .map((opt, idx) => `${String.fromCharCode(65 + idx)}) ${opt}${idx === question.correctAnswerIndex ? ' (MARKED CORRECT)' : ''}`)
    .join('\n');

  const selectedText = (userSelectedOption !== null && userSelectedOption !== undefined && question.options[userSelectedOption])
    ? `${String.fromCharCode(65 + userSelectedOption)}) ${question.options[userSelectedOption]}`
    : 'None / Skipped';

  try {
    return await executeWithRetry(async (ai) => {
      const response = await generateWithFallback(ai, {
        model: PRIMARY_MODEL,
        contents: `You are an elite competitive exam instructor and subject matter expert. Provide an instant, crisp, and crystal-clear AI explanation for the following multiple choice question in ${language}.

QUESTION:
"${question.question}"

OPTIONS:
${optionsText}

MARKED CORRECT ANSWER:
Option ${String.fromCharCode(65 + question.correctAnswerIndex)}: "${question.options[question.correctAnswerIndex]}"

STUDENT'S SELECTION:
${selectedText}

EXISTING EXPLANATION (IF ANY):
"${question.explanation || 'None provided'}"

FORMATTING REQUIREMENTS:
1. Verify if the marked answer is 100% factually correct. If it was wrongly marked, explicitly state the correct answer and reason.
2. Structure the explanation with neat Markdown headings, bullet points, and bold keywords:
- **🎯 Sahi Uttar (Correct Answer):** State the correct option clearly.
- **💡 Core Concept & Explanation (विस्तृत व्याख्या):** Explain why this answer is correct in simple, high-impact language.
- **🚫 Option Breakdown (अन्य विकल्प क्यों गलत हैं):** Briefly point out why other options are distractors/incorrect.
${userSelectedOption !== null && userSelectedOption !== undefined && userSelectedOption !== question.correctAnswerIndex ? `- **⚠️ Mistake Analysis:** Why student's pick (${selectedText}) was wrong and how to avoid this confusion.` : ''}
- **📌 Memory Trick / Exam Tip (याद रखने की ट्रिक):** A handy shortcut, formula, mnemonic, or high-yield exam point.
- **⚡ Quick Concept Check:** One quick 1-line follow-up quiz question.

Keep tone positive, encouraging, and focused on deep understanding.`,
      });

      return response.text || getOfflineFallbackExplanation(question, userSelectedOption);
    }, customKeys);
  } catch (err) {
    console.warn('[AI Backend] Explanation API limit/quota exceeded or key error. Using resilient offline explanation fallback.');
    return getOfflineFallbackExplanation(question, userSelectedOption);
  }
}

/**
 * Audits and fixes quiz questions.
 */
export async function auditAndFixServerQuizQuestions(
  questions: QuestionData[],
  language: string = 'Hindi/English',
  customKeys?: string[]
): Promise<AuditFixResult> {
  if (!questions || questions.length === 0) {
    return { questions: [], fixedCount: 0, auditNotes: [] };
  }

  const BATCH_SIZE = 8;
  const fixedQuestions: QuestionData[] = [];
  const auditNotes: AuditFixResult['auditNotes'] = [];

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

    try {
      const auditResponse = await executeWithRetry(async (ai) => {
        const response = await generateWithFallback(ai, {
          model: PRIMARY_MODEL,
          contents: `You are an expert exam auditor and academic proofreader.
Your task is to AUDIT and VERIFY the answer keys of the following multiple choice questions.

Audit Rules:
1. Carefully analyze each question and its 4 options.
2. Verify if "currentCorrectIndex" points to the factually correct option.
3. If "currentCorrectIndex" is WRONG, identify the actual correct option index (0 to 3) and provide a concise reason for why it was changed.
4. If "currentCorrectIndex" is ALREADY CORRECT, keep it and provide a verified, high quality structured explanation.
5. If the explanation is empty or weak, write a clear structured explanation in ${language}.

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

        return JSON.parse(response.text || '{}');
      }, customKeys);

      const auditedList = auditResponse.auditedQuestions || [];

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
              oldOption: origQ.options[origQ.correctAnswerIndex] || `Option ${origQ.correctAnswerIndex}`,
              newCorrectIndex: newIdx,
              newOption: origQ.options[newIdx] || `Option ${newIdx}`,
              reason: auditInfo.auditReason || 'AI fact-check verified that this option is the correct answer.'
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
    } catch (err) {
      console.warn(`[AI Backend] Audit batch failed at index ${i}:`, err);
      batch.forEach(q => fixedQuestions.push(q));
    }
  }

  return {
    questions: fixedQuestions,
    fixedCount: auditNotes.length,
    auditNotes
  };
}

/**
 * Generates batch questions.
 */
export async function generateServerBatchQuestions(
  prompt: string,
  history: string[],
  count: number = 6,
  language: string = 'English',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  customKeys?: string[]
): Promise<QuestionData[]> {
  const difficultyPrompt =
    difficulty === 'easy' ? 'DIFFICULTY: Easy (Focus on basic recall, definitions, and direct facts).' :
    difficulty === 'hard' ? 'DIFFICULTY: Hard (Focus on deep analysis, critical thinking, complex application, and reasoning).' :
    'DIFFICULTY: Medium (Focus on comprehension, core concepts, and logical connections).';

  try {
    const data = await executeWithRetry(async (ai) => {
      const response = await generateWithFallback(ai, {
        model: PRIMARY_MODEL,
        contents: `Generate exactly ${count} unique, diverse multiple choice questions about: "${prompt}". 
      LANGUAGE: Use ${language} for everything (questions, options, and explanations).
      ${difficultyPrompt}
      DO NOT repeat topics covered in these existing questions: [${history.slice(-35).join(', ')}].
      
      IMPORTANT EXPLANATION & CORRECTION INSTRUCTIONS:
      Do NOT write long story-like or essay paragraphs.
      The "explanation" for each question MUST be structured using bold titles, italic emphasis, and bullet points so it is easy & fast to read. 
      If any answer choice represents a common misconception or incorrect trap, explicitly correct it and explain why the correct answer is right.
      Include an **AI Follow-up Concept Check** question at the end of the explanation.
      
      Follow this structure (translate headings to ${language}):
      **Core Concept:** [Clear direct explanation]
      **Why Correct & Misconception Correction:** [Reasoning with *italic emphasis* and correcting incorrect traps]
      **Key Takeaways:**
      • [Point 1 with **bold keywords**]
      • [Point 2 with **bold keywords**]
      **AI Concept Check:** [A quick interactive follow-up question to verify mastery]
      
      Return valid JSON.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      minItems: 4,
                      maxItems: 4
                    },
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
      return JSON.parse(response.text || '{}');
    }, customKeys);

    const rawQuestions = data.questions || [];
    if (rawQuestions.length === 0) {
      return getOfflineFallbackQuestions(prompt, count);
    }
    return rawQuestions
      .map((q: any) => ({ ...q, id: crypto.randomUUID() }))
      .map(randomizeQuestionOptions);
  } catch (err) {
    console.warn('[AI Backend] Batch question generation quota/key limit reached. Using resilient offline fallback questions.');
    return getOfflineFallbackQuestions(prompt, count);
  }
}

/**
 * Generates single question.
 */
export async function generateServerSingleQuestion(
  prompt: string,
  history: string[],
  language: string = 'English',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  customKeys?: string[]
): Promise<QuestionData> {
  const batch = await generateServerBatchQuestions(prompt, history, 1, language, difficulty, customKeys);
  if (batch && batch.length > 0) return batch[0];
  throw new Error('Could not generate question.');
}

/**
 * Generates quiz from text chunk (PDF/document analysis).
 */
export async function generateServerQuizFromText(
  text: string,
  totalCount: number = 10,
  language: string = 'English',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  customKeys?: string[]
): Promise<QuizData> {
  const batchSize = 10;
  const numBatches = Math.ceil(totalCount / batchSize);
  const cleanText = text.slice(0, 500000);
  const chunkSize = Math.floor(cleanText.length / numBatches);

  const difficultyPrompt =
    difficulty === 'easy' ? 'DIFFICULTY: Easy (Focus on basic recall, definitions, and direct facts).' :
    difficulty === 'hard' ? 'DIFFICULTY: Hard (Focus on deep analysis, critical thinking, complex application, and reasoning).' :
    'DIFFICULTY: Medium (Focus on comprehension, core concepts, and logical connections).';

  const chunks = Array.from({ length: numBatches }).map((_, i) => {
    const start = i * chunkSize;
    const end = (i === numBatches - 1) ? cleanText.length : (i + 1) * chunkSize;
    return cleanText.slice(start, end);
  });

  let quizTitle = 'Document Analysis Quiz';

  const batchPromises = chunks.map(async (textChunk, i) => {
    const questionsToGenerate = (i === numBatches - 1) ? (totalCount % batchSize || batchSize) : batchSize;

    const data = await executeWithRetry(async (ai) => {
      const response = await generateWithFallback(ai, {
        model: PRIMARY_MODEL,
        contents: `Extract exactly ${questionsToGenerate} diverse MCQs from this document segment. 
        LANGUAGE: Use ${language} for everything (questions, options, and explanations).
        ${difficultyPrompt}
        
        IMPORTANT EXPLANATION & CORRECTION INSTRUCTIONS:
        Do NOT write long story-like or essay paragraphs.
        The "explanation" for each question MUST be structured using bold titles, italic emphasis, and bullet points so it is easy & fast to read.
        If any answer choice represents a common misconception or incorrect trap, explicitly correct it and explain why the correct answer is right.
        Include an **AI Follow-up Concept Check** question at the end of the explanation.
        
        Follow this structure (translate headings to ${language}):
        **Core Concept:** [Clear direct explanation]
        **Why Correct & Misconception Correction:** [Reasoning with *italic emphasis* and correcting incorrect traps]
        **Key Takeaways:**
        • [Point 1 with **bold keywords**]
        • [Point 2 with **bold keywords**]
        **AI Concept Check:** [A quick interactive follow-up question to verify mastery]
        
        Return valid JSON.
        
        SEGMENT:
        ${textChunk}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      minItems: 4,
                      maxItems: 4
                    },
                    correctAnswerIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING }
                  },
                  required: ['id', 'question', 'options', 'correctAnswerIndex', 'explanation']
                }
              }
            },
            required: ['questions']
          }
        }
      });
      return JSON.parse(response.text || '{}');
    }, customKeys);

    if (data.title && i === 0) quizTitle = data.title;
    return data.questions || [];
  });

  const results = await Promise.all(batchPromises);
  const allQuestions = results.flat()
    .map(q => ({ ...q, id: crypto.randomUUID() }))
    .map(randomizeQuestionOptions);

  return {
    id: crypto.randomUUID(),
    title: quizTitle,
    questions: shuffleArray(allQuestions).slice(0, totalCount),
    createdAt: Date.now(),
    language
  };
}

/**
 * Generates quiz from a prompt.
 */
export async function generateServerQuizFromPrompt(
  prompt: string,
  count: number = 6,
  language: string = 'English',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  customKeys?: string[]
): Promise<QuizData> {
  const initialQuestions = await generateServerBatchQuestions(
    prompt,
    [],
    Math.max(count, 6),
    language,
    difficulty,
    customKeys
  );

  return {
    id: crypto.randomUUID(),
    title: `Quiz on ${prompt}`,
    questions: initialQuestions.map(q => ({ ...q, id: crypto.randomUUID() })),
    createdAt: Date.now(),
    isInfinite: true,
    originalPrompt: prompt,
    language
  };
}
