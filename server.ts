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

const DEFAULT_STARTER_CATEGORIES = [
  {
    id: 'cat_gk',
    name: 'General Knowledge & Current Affairs',
    parentId: null,
    thumbnailUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80',
    color: '#3b82f6',
    createdAt: 1700000000000
  },
  {
    id: 'sub_gk_history',
    name: 'Indian & World History',
    parentId: 'cat_gk',
    thumbnailUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600&auto=format&fit=crop&q=80',
    color: '#2563eb',
    createdAt: 1700000000001
  },
  {
    id: 'sub_gk_polity',
    name: 'Indian Polity & Constitution',
    parentId: 'cat_gk',
    thumbnailUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    color: '#1d4ed8',
    createdAt: 1700000000002
  },
  {
    id: 'sub_gk_geography',
    name: 'Geography & Environment',
    parentId: 'cat_gk',
    thumbnailUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&auto=format&fit=crop&q=80',
    color: '#1e40af',
    createdAt: 1700000000003
  },
  {
    id: 'cat_science',
    name: 'Science & Technology',
    parentId: null,
    thumbnailUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80',
    color: '#10b981',
    createdAt: 1700000000010
  },
  {
    id: 'sub_sci_physics',
    name: 'Physics',
    parentId: 'cat_science',
    thumbnailUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=600&auto=format&fit=crop&q=80',
    color: '#059669',
    createdAt: 1700000000011
  },
  {
    id: 'sub_sci_chemistry',
    name: 'Chemistry',
    parentId: 'cat_science',
    thumbnailUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&auto=format&fit=crop&q=80',
    color: '#047857',
    createdAt: 1700000000012
  },
  {
    id: 'sub_sci_biology',
    name: 'Biology & Health',
    parentId: 'cat_science',
    thumbnailUrl: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=600&auto=format&fit=crop&q=80',
    color: '#065f46',
    createdAt: 1700000000013
  },
  {
    id: 'sub_sci_cs',
    name: 'Computer Science & AI',
    parentId: 'cat_science',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    color: '#0f766e',
    createdAt: 1700000000014
  },
  {
    id: 'cat_aptitude',
    name: 'Mathematics & Reasoning',
    parentId: null,
    thumbnailUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80',
    color: '#8b5cf6',
    createdAt: 1700000000020
  },
  {
    id: 'sub_apt_quant',
    name: 'Quantitative Aptitude',
    parentId: 'cat_aptitude',
    thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80',
    color: '#7c3aed',
    createdAt: 1700000000021
  },
  {
    id: 'sub_apt_reasoning',
    name: 'Logical Reasoning',
    parentId: 'cat_aptitude',
    thumbnailUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop&q=80',
    color: '#6d28d9',
    createdAt: 1700000000022
  },
  {
    id: 'cat_exams',
    name: 'Competitive Exams Prep',
    parentId: null,
    thumbnailUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80',
    color: '#f59e0b',
    createdAt: 1700000000030
  },
  {
    id: 'sub_exam_upsc',
    name: 'UPSC & Civil Services',
    parentId: 'cat_exams',
    thumbnailUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&auto=format&fit=crop&q=80',
    color: '#d97706',
    createdAt: 1700000000031
  },
  {
    id: 'sub_exam_ssc',
    name: 'SSC CGL / CHSL',
    parentId: 'cat_exams',
    thumbnailUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80',
    color: '#b45309',
    createdAt: 1700000000032
  },
  {
    id: 'sub_exam_banking',
    name: 'Banking & IBPS / SBI',
    parentId: 'cat_exams',
    thumbnailUrl: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=600&auto=format&fit=crop&q=80',
    color: '#92400e',
    createdAt: 1700000000033
  }
];

function loadLocalData(): LocalData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.reports) parsed.reports = [];
      if (!parsed.categories || parsed.categories.length === 0) {
        parsed.categories = [...DEFAULT_STARTER_CATEGORIES];
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to read local DB file, using in-memory defaults:', e);
  }
  return {
    quizzes: [],
    categories: [...DEFAULT_STARTER_CATEGORIES],
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
const MONGO_CONFIG_FILE = path.join(DATA_DIR, 'mongodb_config.json');

function getActiveMongoUri(): string {
  const envUris = [
    process.env.MONGODB_URI,
    process.env.MONGO_URI,
    process.env.MONGODB_URL,
    process.env.DATABASE_URL
  ];
  for (const uri of envUris) {
    if (uri && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'))) {
      return uri;
    }
  }
  try {
    if (fs.existsSync(MONGO_CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(MONGO_CONFIG_FILE, 'utf-8'));
      if (cfg.uri && (cfg.uri.startsWith('mongodb://') || cfg.uri.startsWith('mongodb+srv://'))) {
        return cfg.uri;
      }
    }
  } catch (e) {}
  return '';
}

let activeMongoUri = getActiveMongoUri();
let client: MongoClient | null = null;
let db: any = null;
let isConnectingMongo = false;
let lastMongoError: string | null = null;
const failedAuthUris = new Set<string>();

function cleanForMongo(obj: any) {
  if (!obj || typeof obj !== 'object') return obj;
  const { _id, ...rest } = obj;
  return rest;
}

async function connectToMongoDB(customUri?: string, forceRetry = false) {
  const uriToUse = customUri || activeMongoUri || getActiveMongoUri();
  if (!uriToUse || (!uriToUse.startsWith('mongodb://') && !uriToUse.startsWith('mongodb+srv://'))) {
    return null;
  }

  // If already connected with the same URI, return existing database
  if (db && !customUri) return db;

  // If this URI already failed auth and forceRetry is false, skip repeated failed connections
  if (!forceRetry && !customUri && failedAuthUris.has(uriToUse)) {
    return null;
  }

  if (isConnectingMongo) return db;

  isConnectingMongo = true;
  try {
    if (client) {
      try { await client.close(); } catch (_) {}
      client = null;
      db = null;
    }

    const newClient = new MongoClient(uriToUse, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });
    await newClient.connect();
    client = newClient;
    db = client.db('quizflash');
    activeMongoUri = uriToUse;
    lastMongoError = null;
    failedAuthUris.delete(uriToUse);

    // Save URI if customUri succeeded
    if (customUri) {
      try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(MONGO_CONFIG_FILE, JSON.stringify({ uri: customUri, updatedAt: Date.now() }, null, 2));

        // Also update .env file for robust persistence across server restarts
        const envPath = path.join(process.cwd(), '.env');
        let envContent = '';
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf-8');
        }
        if (envContent.includes('MONGODB_URI=')) {
          envContent = envContent.replace(/^MONGODB_URI=.*$/gm, `MONGODB_URI=${customUri}`);
        } else {
          envContent += `\nMONGODB_URI=${customUri}\n`;
        }
        fs.writeFileSync(envPath, envContent);
        process.env.MONGODB_URI = customUri;
      } catch (e) {
        console.error('Failed to save MongoDB URI to persistent storage:', e);
      }
    }

    console.log('[Storage] Connected successfully to MongoDB database (quizflash).');
    isConnectingMongo = false;
    return db;
  } catch (err: any) {
    isConnectingMongo = false;
    const errMsg = err.message || String(err);
    lastMongoError = errMsg;

    if (errMsg.includes('auth') || errMsg.includes('Authentication') || errMsg.includes('bad auth')) {
      failedAuthUris.add(uriToUse);
    }

    if (client) {
      try {
        await client.close();
      } catch (_) {}
      client = null;
    }
    db = null;

    if (!failedAuthUris.has(uriToUse) || customUri) {
      console.log('[Storage] MongoDB connection notice: Continuing on local storage cache:', errMsg);
    }
    return null;
  }
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    storageMode: db ? 'mongodb' : 'local_file_cache',
    dbConnected: !!db,
    mongoError: lastMongoError
  });
});

// MongoDB Status endpoint
app.get('/api/mongodb/status', async (req, res) => {
  try {
    const database = await connectToMongoDB();
    if (database) {
      const [quizCount, catCount, userCount, fileCount] = await Promise.all([
        database.collection('quizzes').countDocuments().catch(() => 0),
        database.collection('categories').countDocuments().catch(() => 0),
        database.collection('users').countDocuments().catch(() => 0),
        database.collection('quiz_files').countDocuments().catch(() => 0),
      ]);

      const maskedUri = activeMongoUri
        ? activeMongoUri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/, '$1******$3')
        : 'mongodb://cluster...';

      return res.json({
        connected: true,
        databaseName: 'quizflash',
        uriMasked: maskedUri,
        storageType: 'MongoDB Cloud Atlas Database',
        error: null,
        counts: {
          quizzes: quizCount,
          categories: catCount,
          users: userCount,
          uploadedFiles: fileCount
        }
      });
    }
  } catch (err) {}

  res.json({
    connected: false,
    databaseName: 'Local Storage & Memory Cache',
    uriMasked: '',
    storageType: 'Local File Persistence',
    error: lastMongoError,
    counts: {
      quizzes: localStore.quizzes.length,
      categories: localStore.categories.length,
      users: localStore.users.length,
      uploadedFiles: 0
    }
  });
});

// MongoDB Connect / Save URI endpoint
app.post('/api/mongodb/connect', async (req, res) => {
  const { uri } = req.body;
  if (!uri || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'))) {
    return res.status(400).json({ error: 'Valid MongoDB Connection URI starting with mongodb:// or mongodb+srv:// is required' });
  }

  try {
    failedAuthUris.delete(uri);
    const database = await connectToMongoDB(uri, true);
    if (!database) {
      return res.status(400).json({ 
        error: lastMongoError || 'Could not authenticate with provided MongoDB URI. Please verify username, password, and database cluster permissions.' 
      });
    }

    // Auto-sync existing local quizzes to MongoDB
    if (localStore.quizzes.length > 0) {
      for (const q of localStore.quizzes) {
        await database.collection('quizzes').updateOne({ id: q.id }, { $set: cleanForMongo(q) }, { upsert: true });
      }
    }

    if (localStore.categories.length > 0) {
      for (const c of localStore.categories) {
        await database.collection('categories').updateOne({ id: c.id }, { $set: cleanForMongo(c) }, { upsert: true });
      }
    }

    res.json({
      success: true,
      message: 'Successfully connected to MongoDB and synchronized database collections!',
      databaseName: 'quizflash'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to establish MongoDB connection' });
  }
});

// MongoDB Disconnect endpoint
app.post('/api/mongodb/disconnect', async (req, res) => {
  try {
    if (client) {
      try { await client.close(); } catch (_) {}
      client = null;
    }
    db = null;
    activeMongoUri = '';
    lastMongoError = null;

    if (fs.existsSync(MONGO_CONFIG_FILE)) {
      try { fs.unlinkSync(MONGO_CONFIG_FILE); } catch (_) {}
    }

    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      try {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        envContent = envContent.replace(/^MONGODB_URI=.*$/gm, '');
        fs.writeFileSync(envPath, envContent);
      } catch (_) {}
    }
    process.env.MONGODB_URI = '';

    res.json({
      success: true,
      message: 'Disconnected from MongoDB. Operating smoothly on Local Storage mode.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to disconnect MongoDB' });
  }
});

// MongoDB Sync All endpoint
app.post('/api/mongodb/sync', async (req, res) => {
  const { quizzes, categories, users } = req.body;
  const targetQuizzes = Array.isArray(quizzes) && quizzes.length > 0 ? quizzes : localStore.quizzes;
  const targetCategories = Array.isArray(categories) && categories.length > 0 ? categories : localStore.categories;
  const targetUsers = Array.isArray(users) && users.length > 0 ? users : localStore.users;

  let syncedQuizCount = 0;
  try {
    const database = await connectToMongoDB();
    if (database) {
      for (const q of targetQuizzes) {
        if (q && q.id) {
          await database.collection('quizzes').updateOne({ id: q.id }, { $set: { ...cleanForMongo(q), updatedAt: Date.now() } }, { upsert: true });
          syncedQuizCount++;
        }
      }

      for (const c of targetCategories) {
        if (c && c.id) {
          await database.collection('categories').updateOne({ id: c.id }, { $set: cleanForMongo(c) }, { upsert: true });
        }
      }

      for (const u of targetUsers) {
        if (u && u.id) {
          await database.collection('users').updateOne({ id: u.id }, { $set: cleanForMongo(u) }, { upsert: true });
        }
      }
    }
  } catch (err: any) {
    console.warn('MongoDB sync error:', err);
  }

  // Always update local store
  if (Array.isArray(quizzes) && quizzes.length > 0) localStore.quizzes = quizzes;
  if (Array.isArray(categories) && categories.length > 0) localStore.categories = categories;
  if (Array.isArray(users) && users.length > 0) localStore.users = users;
  saveLocalData();

  res.json({
    success: true,
    storageMode: db ? 'mongodb' : 'local_file_cache',
    syncedQuizzes: syncedQuizCount,
    totalQuizzes: localStore.quizzes.length
  });
});

// File Upload & MongoDB Storage Endpoint
app.post('/api/upload', async (req, res) => {
  try {
    const { fileName, fileType, rawContent, quizData, categoryId, subCategoryId } = req.body;
    const fileId = new ObjectId().toString();
    const timestamp = Date.now();

    const fileDoc = {
      id: fileId,
      fileName: fileName || 'Uploaded File',
      fileType: fileType || 'application/json',
      uploadedAt: timestamp,
      rawContentSnippet: typeof rawContent === 'string' ? rawContent.slice(0, 5000) : '',
      categoryId: categoryId || null,
      subCategoryId: subCategoryId || null
    };

    let savedQuizDoc: any = null;
    if (quizData && Array.isArray(quizData.questions)) {
      const quizId = quizData.id || new ObjectId().toString();
      savedQuizDoc = {
        ...quizData,
        id: quizId,
        sourceFileId: fileId,
        sourceFileName: fileName,
        createdAt: quizData.createdAt || timestamp,
        updatedAt: timestamp
      };

      // Update local store
      const existingIdx = localStore.quizzes.findIndex(q => q.id === quizId);
      if (existingIdx >= 0) {
        localStore.quizzes[existingIdx] = savedQuizDoc;
      } else {
        localStore.quizzes.unshift(savedQuizDoc);
      }
      saveLocalData();
    }

    // Persist to MongoDB
    try {
      const database = await connectToMongoDB();
      if (database) {
        await database.collection('quiz_files').insertOne(fileDoc);
        if (savedQuizDoc) {
          await database.collection('quizzes').updateOne(
            { id: savedQuizDoc.id },
            { $set: cleanForMongo(savedQuizDoc) },
            { upsert: true }
          );
        }
      }
    } catch (dbErr) {
      console.warn('MongoDB file storage delayed:', dbErr);
    }

    res.json({
      success: true,
      file: fileDoc,
      quiz: savedQuizDoc,
      storage: db ? 'mongodb' : 'local_cache'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'File upload processing failed' });
  }
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
        { $set: cleanForMongo(docToSave) },
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
        { $set: cleanForMongo(docToSave) },
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
      let formatted = categories.map((c: any) => ({
        ...c,
        id: c.id || c._id.toString(),
        _id: c._id.toString()
      }));
      if (formatted.length === 0) {
        // Seed default categories into MongoDB
        await database.collection('categories').insertMany(DEFAULT_STARTER_CATEGORIES.map(c => ({ ...c })));
        formatted = [...DEFAULT_STARTER_CATEGORIES];
      }
      localStore.categories = formatted;
      saveLocalData();
      return res.json(formatted);
    }
  } catch (err) {
    console.warn('Mongo fetch categories fallback to local:', err);
  }

  if (!localStore.categories || localStore.categories.length === 0) {
    localStore.categories = [...DEFAULT_STARTER_CATEGORIES];
    saveLocalData();
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
        { $set: cleanForMongo(docToSave) },
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
        { $set: cleanForMongo(toSave) },
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

// --- STATIC & VITE MIDDLEWARE SETUP ---
const distPath = path.join(process.cwd(), 'dist');

if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
  app.use(express.static(distPath));
  app.get('*all', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

async function startServer() {
  connectToMongoDB().catch(() => {});

  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
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
  // When running on Vercel, connect to MongoDB when module loads
  connectToMongoDB().catch(() => {});
}

export default app;
