import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import {
  generateServerDeepExplanation,
  auditAndFixServerQuizQuestions,
  generateServerBatchQuestions,
  generateServerSingleQuestion,
  generateServerQuizFromText,
  generateServerQuizFromPrompt
} from './server/aiService.ts';

dotenv.config();

const app = express();
const PORT = 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- LOCAL DATA PERSISTENCE FALLBACK ---
const DATA_DIR = process.env.VERCEL === '1' ? '/tmp/data' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');

interface LocalData {
  quizzes: any[];
  categories: any[];
  users: any[];
  reports?: any[];
  settings: { [key: string]: any };
}

function loadLocalData(): LocalData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.reports) parsed.reports = [];
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to read local DB file, using in-memory defaults:', e);
  }
  return {
    quizzes: [],
    categories: [],
    users: [],
    reports: [],
    settings: {
      quiz_config: {
        positiveMarks: 1,
        negativeMarks: 0.25,
        timePerQuestion: 0
      }
    }
  };
}

let localStore: LocalData = loadLocalData();

function saveLocalData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(localStore, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to write local DB file:', e);
  }
}

// --- MONGODB CONNECTION WITH AUTO-FALLBACK ---
let client: MongoClient | null = null;
let db: any = null;
let mongoAttemptDone = false;

async function connectToMongoDB() {
  if (!MONGODB_URI || (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://'))) {
    return null;
  }
  if (mongoAttemptDone && !db) return null;
  if (db) return db;

  try {
    const newClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    await newClient.connect();
    client = newClient;
    db = client.db('quizflash');
    console.log('[Storage] Connected to MongoDB Atlas cluster.');
    return db;
  } catch (err: any) {
    mongoAttemptDone = true;
    if (client) {
      try {
        await client.close();
      } catch (_) {}
      client = null;
    }
    db = null;
    console.log('[Storage] MongoDB cloud disabled or offline. Operating smoothly on resilient local file persistence.');
    return null;
  }
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    storageMode: db ? 'mongodb' : 'local_file_cache',
    dbConnected: !!db
  });
});

// --- QUIZZES API ---
app.get('/api/quizzes', async (req, res) => {
  try {
    const database = await connectToMongoDB();
    if (database) {
      const quizzes = await database.collection('quizzes').find({}).sort({ createdAt: -1 }).toArray();
      const formatted = quizzes.map((q: any) => ({
        ...q,
        id: q.id || q._id.toString(),
        _id: q._id.toString()
      }));
      // Keep local store in sync
      localStore.quizzes = formatted;
      saveLocalData();
      return res.json(formatted);
    }
  } catch (err) {
    console.warn('Mongo fetch quizzes error, falling back to local:', err);
  }

  // Fallback to local store
  res.json(localStore.quizzes);
});

app.post('/api/quizzes', async (req, res) => {
  const quiz = req.body;
  const quizId = quiz.id || new ObjectId().toString();
  const docToSave = {
    ...quiz,
    id: quizId,
    createdAt: quiz.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  try {
    const database = await connectToMongoDB();
    if (database) {
      await database.collection('quizzes').updateOne(
        { id: quizId },
        { $set: docToSave },
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn('Mongo save quiz error:', err);
  }

  // Always update local store
  const existingIdx = localStore.quizzes.findIndex(q => q.id === quizId);
  if (existingIdx >= 0) {
    localStore.quizzes[existingIdx] = docToSave;
  } else {
    localStore.quizzes.unshift(docToSave);
  }
  saveLocalData();

  res.json(docToSave);
});

app.put('/api/quizzes/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  delete updates._id;

  const existingIdx = localStore.quizzes.findIndex(q => q.id === id);
  if (existingIdx >= 0) {
    localStore.quizzes[existingIdx] = {
      ...localStore.quizzes[existingIdx],
      ...updates,
      updatedAt: Date.now()
    };
    saveLocalData();
  }

  try {
    const database = await connectToMongoDB();
    if (database) {
      let filter: any = { id };
      if (ObjectId.isValid(id)) {
        filter = { $or: [{ id }, { _id: new ObjectId(id) }] };
      }
      await database.collection('quizzes').updateOne(filter, { $set: { ...updates, updatedAt: Date.now() } });
    }
  } catch (err) {
    console.warn('Mongo quiz update delayed:', err);
  }

  res.json({ success: true });
});

app.delete('/api/quizzes/:id', async (req, res) => {
  const { id } = req.params;

  localStore.quizzes = localStore.quizzes.filter(q => q.id !== id);
  saveLocalData();

  try {
    const database = await connectToMongoDB();
    if (database) {
      let filter: any = { id };
      if (ObjectId.isValid(id)) {
        filter = { $or: [{ id }, { _id: new ObjectId(id) }] };
      }
      await database.collection('quizzes').deleteOne(filter);
    }
  } catch (err) {
    console.warn('Mongo quiz delete delayed:', err);
  }

  res.json({ success: true });
});

// --- REPORTS API ---
app.get('/api/reports', async (req, res) => {
  try {
    const database = await connectToMongoDB();
    if (database) {
      const reports = await database.collection('reports').find({}).sort({ timestamp: -1 }).toArray();
      const formatted = reports.map((r: any) => ({
        ...r,
        id: r.id || r._id.toString(),
        _id: r._id.toString()
      }));
      localStore.reports = formatted;
      saveLocalData();
      return res.json(formatted);
    }
  } catch (err) {
    console.warn('Mongo fetch reports error, falling back to local:', err);
  }
  res.json(localStore.reports || []);
});

app.post('/api/reports', async (req, res) => {
  const report = req.body;
  const reportId = report.id || new ObjectId().toString();
  const docToSave = {
    ...report,
    id: reportId,
    timestamp: report.timestamp || Date.now(),
    status: report.status || 'pending'
  };

  try {
    const database = await connectToMongoDB();
    if (database) {
      await database.collection('reports').updateOne(
        { id: reportId },
        { $set: docToSave },
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn('Mongo save report error:', err);
  }

  if (!localStore.reports) localStore.reports = [];
  const existingIdx = localStore.reports.findIndex(r => r.id === reportId);
  if (existingIdx >= 0) {
    localStore.reports[existingIdx] = docToSave;
  } else {
    localStore.reports.unshift(docToSave);
  }
  saveLocalData();

  res.json(docToSave);
});

app.delete('/api/reports/:id', async (req, res) => {
  const { id } = req.params;
  if (localStore.reports) {
    localStore.reports = localStore.reports.filter(r => r.id !== id);
    saveLocalData();
  }

  try {
    const database = await connectToMongoDB();
    if (database) {
      let filter: any = { id };
      if (ObjectId.isValid(id)) {
        filter = { $or: [{ id }, { _id: new ObjectId(id) }] };
      }
      await database.collection('reports').deleteOne(filter);
    }
  } catch (err) {
    console.warn('Mongo report delete delayed:', err);
  }

  res.json({ success: true });
});

// --- CATEGORIES API ---
app.get('/api/categories', async (req, res) => {
  try {
    const database = await connectToMongoDB();
    if (database) {
      const categories = await database.collection('categories').find({}).toArray();
      const formatted = categories.map((c: any) => ({
        ...c,
        id: c.id || c._id.toString(),
        _id: c._id.toString()
      }));
      localStore.categories = formatted;
      saveLocalData();
      return res.json(formatted);
    }
  } catch (err) {
    console.warn('Mongo fetch categories fallback to local:', err);
  }

  res.json(localStore.categories);
});

app.post('/api/categories', async (req, res) => {
  const category = req.body;
  const catId = category.id || new ObjectId().toString();
  const docToSave = {
    ...category,
    id: catId,
    createdAt: category.createdAt || Date.now()
  };

  const existingIdx = localStore.categories.findIndex(c => c.id === catId);
  if (existingIdx >= 0) {
    localStore.categories[existingIdx] = docToSave;
  } else {
    localStore.categories.push(docToSave);
  }
  saveLocalData();

  try {
    const database = await connectToMongoDB();
    if (database) {
      await database.collection('categories').updateOne(
        { id: catId },
        { $set: docToSave },
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn('Mongo category save delayed:', err);
  }

  res.json(docToSave);
});

app.put('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  delete updates._id;

  const existingIdx = localStore.categories.findIndex(c => c.id === id);
  if (existingIdx >= 0) {
    localStore.categories[existingIdx] = {
      ...localStore.categories[existingIdx],
      ...updates
    };
    saveLocalData();
  }

  try {
    const database = await connectToMongoDB();
    if (database) {
      let filter: any = { id };
      if (ObjectId.isValid(id)) {
        filter = { $or: [{ id }, { _id: new ObjectId(id) }] };
      }
      await database.collection('categories').updateOne(filter, { $set: updates });
    }
  } catch (err) {
    console.warn('Mongo category update delayed:', err);
  }

  res.json({ success: true });
});

app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;

  localStore.categories = localStore.categories.filter(c => c.id !== id);
  saveLocalData();

  try {
    const database = await connectToMongoDB();
    if (database) {
      let filter: any = { id };
      if (ObjectId.isValid(id)) {
        filter = { $or: [{ id }, { _id: new ObjectId(id) }] };
      }
      await database.collection('categories').deleteOne(filter);
    }
  } catch (err) {
    console.warn('Mongo category delete delayed:', err);
  }

  res.json({ success: true });
});

// --- USERS & LEADERBOARD API ---
app.get('/api/users', async (req, res) => {
  try {
    const database = await connectToMongoDB();
    if (database) {
      const users = await database.collection('users').find({}).sort({ totalPoints: -1 }).limit(100).toArray();
      const formatted = users.map((u: any) => ({
        ...u,
        id: u.id || u._id.toString(),
        _id: u._id.toString()
      }));
      localStore.users = formatted;
      saveLocalData();
      return res.json(formatted);
    }
  } catch (err) {
    console.warn('Mongo fetch users fallback:', err);
  }

  // Sort descending by totalPoints
  const sorted = [...localStore.users].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  res.json(sorted);
});

app.post('/api/users/sync', async (req, res) => {
  const { id, email, name, pointsEarned, questionsAttempted, correctAnswers, totalTimeSpent, role } = req.body;
  if (!id) return res.status(400).json({ error: 'User ID required' });

  const existingIdx = localStore.users.findIndex(u => u.id === id);
  let updatedUser: any;

  if (existingIdx >= 0) {
    const existing = localStore.users[existingIdx];
    updatedUser = {
      ...existing,
      name: name || existing.name,
      email: email || existing.email,
      role: role || existing.role || 'user',
      lastActive: Date.now(),
      totalPoints: (existing.totalPoints || 0) + (pointsEarned || 0),
      questionsAttempted: (existing.questionsAttempted || 0) + (questionsAttempted || 0),
      correctAnswers: (existing.correctAnswers || 0) + (correctAnswers || 0),
      totalTimeSpent: (existing.totalTimeSpent || 0) + (totalTimeSpent || 0)
    };
    localStore.users[existingIdx] = updatedUser;
  } else {
    updatedUser = {
      id,
      name: name || email?.split('@')[0] || 'User',
      email: email || '',
      totalPoints: pointsEarned || 0,
      questionsAttempted: questionsAttempted || 0,
      correctAnswers: correctAnswers || 0,
      totalTimeSpent: totalTimeSpent || 0,
      role: role || 'user',
      createdAt: Date.now(),
      lastActive: Date.now()
    };
    localStore.users.push(updatedUser);
  }
  saveLocalData();

  try {
    const database = await connectToMongoDB();
    if (database) {
      await database.collection('users').updateOne(
        { id },
        {
          $set: {
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            lastActive: Date.now()
          },
          $inc: {
            totalPoints: pointsEarned || 0,
            questionsAttempted: questionsAttempted || 0,
            correctAnswers: correctAnswers || 0,
            totalTimeSpent: totalTimeSpent || 0
          }
        },
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn('Mongo user sync delayed:', err);
  }

  res.json(updatedUser);
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  delete updates._id;

  const existingIdx = localStore.users.findIndex(u => u.id === id);
  if (existingIdx >= 0) {
    localStore.users[existingIdx] = {
      ...localStore.users[existingIdx],
      ...updates
    };
    saveLocalData();
  }

  try {
    const database = await connectToMongoDB();
    if (database) {
      let filter: any = { id };
      if (ObjectId.isValid(id)) {
        filter = { $or: [{ id }, { _id: new ObjectId(id) }] };
      }
      await database.collection('users').updateOne(filter, { $set: updates });
    }
  } catch (err) {
    console.warn('Mongo user update delayed:', err);
  }

  res.json({ success: true });
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;

  localStore.users = localStore.users.filter(u => u.id !== id);
  saveLocalData();

  try {
    const database = await connectToMongoDB();
    if (database) {
      let filter: any = { id };
      if (ObjectId.isValid(id)) {
        filter = { $or: [{ id }, { _id: new ObjectId(id) }] };
      }
      await database.collection('users').deleteOne(filter);
    }
  } catch (err) {
    console.warn('Mongo user delete delayed:', err);
  }

  res.json({ success: true });
});

// --- SETTINGS / QUIZ CONFIG API ---
app.get('/api/settings/quiz_config', async (req, res) => {
  try {
    const database = await connectToMongoDB();
    if (database) {
      const config = await database.collection('settings').findOne({ key: 'quiz_config' });
      if (config) {
        localStore.settings.quiz_config = config;
        saveLocalData();
        return res.json(config);
      }
    }
  } catch (err) {
    console.warn('Mongo settings fetch fallback:', err);
  }

  res.json(localStore.settings.quiz_config || {
    positiveMarks: 1,
    negativeMarks: 0.25,
    timePerQuestion: 0
  });
});

app.post('/api/settings/quiz_config', async (req, res) => {
  const configData = req.body;
  const toSave = {
    key: 'quiz_config',
    positiveMarks: Number(configData.positiveMarks ?? 1),
    negativeMarks: Number(configData.negativeMarks ?? 0.25),
    timePerQuestion: Number(configData.timePerQuestion ?? 0),
    updatedAt: Date.now()
  };

  localStore.settings.quiz_config = toSave;
  saveLocalData();

  try {
    const database = await connectToMongoDB();
    if (database) {
      await database.collection('settings').updateOne(
        { key: 'quiz_config' },
        { $set: toSave },
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn('Mongo settings save delayed:', err);
  }

  res.json({ success: true });
});

// Helper to extract custom keys from request
function extractCustomKeys(req: express.Request): string[] | undefined {
  const headerKey = req.headers['x-gemini-api-key'];
  const bodyKeys = req.body?.customKeys;
  const list: string[] = [];
  if (typeof headerKey === 'string') {
    list.push(...headerKey.split(',').map(s => s.trim()).filter(Boolean));
  } else if (Array.isArray(headerKey)) {
    list.push(...headerKey.map(s => s.trim()).filter(Boolean));
  }
  if (Array.isArray(bodyKeys)) {
    list.push(...bodyKeys.map(s => String(s).trim()).filter(Boolean));
  }
  return list.length > 0 ? list : undefined;
}

// --- AI SERVICES API ROUTES ---
app.post('/api/ai/explain', async (req, res) => {
  try {
    const { question, userSelectedOption, language } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question data is required' });
    }
    const customKeys = extractCustomKeys(req);
    const explanation = await generateServerDeepExplanation(
      question,
      userSelectedOption,
      language || 'Hindi & English',
      customKeys
    );
    res.json({ explanation });
  } catch (err: any) {
    console.error('[AI Route /api/ai/explain error]:', err);
    res.status(500).json({ error: err.message || 'Failed to generate explanation' });
  }
});

app.post('/api/ai/audit', async (req, res) => {
  try {
    const { questions, language } = req.body;
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions array is required' });
    }
    const customKeys = extractCustomKeys(req);
    const result = await auditAndFixServerQuizQuestions(
      questions,
      language || 'Hindi/English',
      customKeys
    );
    res.json(result);
  } catch (err: any) {
    console.error('[AI Route /api/ai/audit error]:', err);
    res.status(500).json({ error: err.message || 'Failed to audit questions' });
  }
});

app.post('/api/ai/generate-batch', async (req, res) => {
  try {
    const { prompt, history = [], count = 6, language = 'English', difficulty = 'medium' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    const customKeys = extractCustomKeys(req);
    const questions = await generateServerBatchQuestions(
      prompt,
      history,
      Number(count) || 6,
      language,
      difficulty,
      customKeys
    );
    res.json({ questions });
  } catch (err: any) {
    console.error('[AI Route /api/ai/generate-batch error]:', err);
    res.status(500).json({ error: err.message || 'Failed to generate batch questions' });
  }
});

app.post('/api/ai/generate-single', async (req, res) => {
  try {
    const { prompt, history = [], language = 'English', difficulty = 'medium' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    const customKeys = extractCustomKeys(req);
    const question = await generateServerSingleQuestion(
      prompt,
      history,
      language,
      difficulty,
      customKeys
    );
    res.json({ question });
  } catch (err: any) {
    console.error('[AI Route /api/ai/generate-single error]:', err);
    res.status(500).json({ error: err.message || 'Failed to generate question' });
  }
});

app.post('/api/ai/generate-from-text', async (req, res) => {
  try {
    const { text, totalCount = 10, language = 'English', difficulty = 'medium' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }
    const customKeys = extractCustomKeys(req);
    const quiz = await generateServerQuizFromText(
      text,
      Number(totalCount) || 10,
      language,
      difficulty,
      customKeys
    );
    res.json({ quiz });
  } catch (err: any) {
    console.error('[AI Route /api/ai/generate-from-text error]:', err);
    res.status(500).json({ error: err.message || 'Failed to generate quiz from text' });
  }
});

app.post('/api/ai/generate-from-prompt', async (req, res) => {
  try {
    const { prompt, count = 6, language = 'English', difficulty = 'medium' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    const customKeys = extractCustomKeys(req);
    const quiz = await generateServerQuizFromPrompt(
      prompt,
      Number(count) || 6,
      language,
      difficulty,
      customKeys
    );
    res.json({ quiz });
  } catch (err: any) {
    console.error('[AI Route /api/ai/generate-from-prompt error]:', err);
    res.status(500).json({ error: err.message || 'Failed to generate quiz' });
  }
});

// --- VITE MIDDLEWARE SETUP ---
async function startServer() {
  // Connect to MongoDB in background without blocking server startup
  connectToMongoDB().catch(() => {});

  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Quiz Flash server running on port ${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer();
} else {
  // When running on Vercel, connect to MongoDB when the module loads
  connectToMongoDB().catch(() => {});
}

export default app;
