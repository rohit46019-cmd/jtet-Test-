
import { GoogleGenAI, Type } from "@google/genai";
import { Quiz, Question } from "../types";

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Helper to wait for a specific duration
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper to shuffle an array using the Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Shuffles the answer options for a question and updates the correct answer index
 */
function randomizeQuestionOptions(question: Question): Question {
  const originalOptions = [...question.options];
  const correctOptionText = originalOptions[question.correctAnswerIndex];
  const shuffledOptions = shuffleArray(originalOptions);
  const newCorrectIndex = shuffledOptions.indexOf(correctOptionText);

  return {
    ...question,
    options: shuffledOptions,
    correctAnswerIndex: newCorrectIndex
  };
}

let userApiKeys: string[] = [];

/**
 * Sets user-provided API keys for rotation
 */
export const setUserApiKeys = (keys: string[]) => {
  userApiKeys = keys;
};

/**
 * Helper to get all available API keys from environment and user settings.
 */
const getApiKeys = (): string[] => {
  const envKeysString = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  const envKeys = envKeysString.split(',').map(k => k.trim()).filter(k => k);
  // Prioritize user keys if available
  return [...userApiKeys, ...envKeys];
};

/**
 * Extracts a human-readable message from the complex Gemini API error structure.
 */
function parseGeminiError(error: any): { message: string, code?: number } {
  const rawMessage = error?.message || String(error);
  
  try {
    const jsonStart = rawMessage.indexOf('{');
    if (jsonStart !== -1) {
      const errorObj = JSON.parse(rawMessage.substring(jsonStart));
      const code = errorObj?.error?.code;
      const msg = errorObj?.error?.message;
      
      if (code === 403) return { message: "Permission Denied: Your API key is invalid.", code: 403 };
      if (code === 429) return { message: "Quota Exhausted: Please wait a moment.", code: 429 };
      if (code === 503) return { message: "Service Unavailable: Model is overloaded.", code: 503 };
      if (msg) return { message: msg, code };
    }
  } catch (e) {}

  if (rawMessage.includes("permission") || rawMessage.includes("key not valid") || rawMessage.includes("invalid key")) return { message: "API Permission Error: The provided key is invalid.", code: 403 };
  if (rawMessage.includes("quota") || rawMessage.includes("limit")) return { message: "API Quota reached.", code: 429 };
  if (rawMessage.includes("overloaded") || rawMessage.includes("high demand")) return { message: "Service Overloaded.", code: 503 };
  
  return { message: rawMessage };
}

/**
 * Executes a Gemini API call with automatic retry using the next available key on failure.
 * Also implements exponential backoff for quota/overload errors.
 */
async function executeWithRetry<T>(operation: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  // Get all keys and shuffle them to load balance across multiple users
  const keys = shuffleArray(getApiKeys());
  if (keys.length === 0) {
    throw new Error("No API Key configured. Please go to Settings and provide a GEMINI_API_KEY.");
  }

  const MAX_RETRIES_PER_KEY = 4; // Increased retries
  let lastErrorMessage: string = "";

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
        
        // If it's a quota or overload error, wait and retry with exponential backoff
        // 503 (Overloaded) is often very transient, so we retry it more reliably
        if (code === 429 || code === 503) {
          if (attempt < MAX_RETRIES_PER_KEY - 1) {
            // Jittered exponential backoff: (2^attempt * 400ms) + random jitter
            const baseDelay = Math.pow(2, attempt) * 400;
            const jitter = Math.random() * 400;
            const delay = baseDelay + jitter;
            
            console.warn(`Gemini API error (${code}: ${message}). Retrying in ${Math.round(delay)}ms... (Attempt ${attempt + 1}/${MAX_RETRIES_PER_KEY})`);
            await sleep(delay);
            continue;
          }
        }
        
        // For other errors (like 403 invalid key) or if we've exhausted retries for this key, move to the next key
        console.error(`Key failed with error ${code}: ${message}. Trying next key if available.`);
        break; 
      }
    }
  }
  throw new Error(`AI generation failed. ${lastErrorMessage} Please verify your API key in Settings > Secrets.`);
}

/**
 * Generates a batch of unique questions (e.g. 6 backup questions) based on a prompt and previous history.
 */
export async function generateBatchQuestions(prompt: string, history: string[], count: number = 6, language: string = 'English', difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<Question[]> {
  const difficultyPrompt = 
    difficulty === 'easy' ? 'DIFFICULTY: Easy (Focus on basic recall, definitions, and direct facts).' :
    difficulty === 'hard' ? 'DIFFICULTY: Hard (Focus on deep analysis, critical thinking, complex application, and reasoning).' :
    'DIFFICULTY: Medium (Focus on comprehension, core concepts, and logical connections).';

  const data = await executeWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
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
        responseMimeType: "application/json",
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
                required: ["question", "options", "correctAnswerIndex", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });

  const rawQuestions = data.questions || [];
  return rawQuestions
    .map((q: any) => ({ ...q, id: q.id || crypto.randomUUID() }))
    .map(randomizeQuestionOptions);
}

/**
 * Generates a SINGLE unique question based on a prompt and previous history.
 */
export async function generateSingleQuestion(prompt: string, history: string[], language: string = 'English'): Promise<Question> {
  const batch = await generateBatchQuestions(prompt, history, 1, language);
  if (batch && batch.length > 0) return batch[0];

  const data = await executeWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Generate exactly ONE unique multiple choice question about: "${prompt}". 
      LANGUAGE: Use ${language} for everything (question, options, and explanation).
      DO NOT repeat topics covered in these existing questions: [${history.join(', ')}].
      
      IMPORTANT EXPLANATION FORMATTING INSTRUCTIONS:
      Do NOT write long story-like or essay paragraphs.
      The "explanation" MUST be structured using bold titles, italic emphasis, and bullet points so it is easy & fast to read.
      Follow this structure (translate headings to ${language}):
      **Core Concept:** [Clear direct explanation]
      **Why Correct:** [Reasoning with *italic emphasis* on key terms]
      **Key Takeaways:**
      • [Point 1 with **bold keywords**]
      • [Point 2 with **bold keywords**]
      
      Return valid JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: {
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
              required: ["question", "options", "correctAnswerIndex", "explanation"]
            }
          },
          required: ["question"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });

  const question = { ...data.question, id: data.question.id || crypto.randomUUID() };
  return randomizeQuestionOptions(question);
}

/**
 * Generates a quiz from text with non-linear selection (Batch Mode for PDF).
 */
export async function generateQuizFromText(text: string, totalCount: number = 10, language: string = 'English', difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<Quiz> {
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

  const shuffledChunks = shuffleArray(chunks);
  let quizTitle = "Document Analysis Quiz";

  const batchPromises = shuffledChunks.map(async (textChunk, i) => {
    const questionsToGenerate = (i === numBatches - 1) ? (totalCount % batchSize || batchSize) : batchSize;

    const data = await executeWithRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
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
          responseMimeType: "application/json",
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
                  required: ["id", "question", "options", "correctAnswerIndex", "explanation"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });
      return JSON.parse(response.text || "{}");
    });

    if (data.title && i === 0) quizTitle = data.title;
    return data.questions || [];
  });

  const results = await Promise.all(batchPromises);
  const allQuestions = results.flat()
    .map(q => ({ ...q, id: q.id || crypto.randomUUID() }))
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
 * Infinite mode initializer: pre-generates 6 backup questions right away.
 */
export async function generateQuizFromPrompt(prompt: string, count: number = 6, language: string = 'English', difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<Quiz> {
  let title = `Quiz on ${prompt}`;
  
  // Pre-generate 6 backup questions at start so user never waits
  const initialQuestions = await generateBatchQuestions(prompt, [], Math.max(count, 6), language, difficulty);

  return {
    id: crypto.randomUUID(),
    title,
    questions: initialQuestions,
    createdAt: Date.now(),
    isInfinite: true,
    originalPrompt: prompt,
    language
  };
}
