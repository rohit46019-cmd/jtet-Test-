
import React, { useState, useEffect } from 'react';
import { extractTextFromPDF } from './services/pdfService';
import { generateQuizFromText, generateQuizFromPrompt, generateSingleQuestion, generateBatchQuestions, setUserApiKeys } from './services/geminiService';
import { AppState, TabState, Quiz as QuizType, UserAnswer, StoredQuiz, BookmarkedQuestion, Category, QuizConfig, SavedQuizSession } from './types';
import FileUpload from './components/FileUpload';
import Quiz from './components/Quiz';
import { QuizConfigModal } from './components/QuizConfigModal';
import { ResumeOrRestartModal } from './components/ResumeOrRestartModal';
import LoadingScreen from './components/LoadingScreen';
import AdminPanel from './components/AdminPanel';
import Leaderboard from './components/Leaderboard';
import { useAuth } from './hooks/useAuth';
import { googleDriveService } from './services/googleDriveService';
import { phoneStorageService } from './services/phoneStorageService';
import { PhoneStorageModal } from './components/PhoneStorageModal';
import { AiAuditModal } from './components/AiAuditModal';
import { AiExplainModal } from './components/AiExplainModal';
import { TestSummary } from './components/TestSummary';
import { auditAndFixQuizQuestions } from './services/geminiService';
import { quizSessionService } from './services/quizSessionService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, RefreshCcw, BookOpen, Trash2, Home, LayoutGrid, Bookmark, 
  Sparkles, Smartphone, Star, Zap, CheckCircle2, XCircle, X, 
  MessageSquare, ArrowRight, Sun, Moon, Maximize, Play, Settings, 
  ShieldCheck, Dna, Info, ChevronDown, ChevronUp, AlertCircle, Maximize2,
  ClipboardList, FileType, Send, Code, Brackets, Shield, Menu, Edit2, Download, MoreVertical, FolderPlus, Tag, Layers, LogOut, Globe,
  Cloud, HardDrive, CloudUpload, CloudDownload, Database, Save, Timer, RotateCcw, Brain, CheckSquare
} from 'lucide-react';
import { getTopicThumbnail, TopicImage } from './lib/thumbnailHelper';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [tab, setTab] = useState<TabState>('HOME');
  const [quiz, setQuiz] = useState<QuizType | null>(null);
  const [results, setResults] = useState<UserAnswer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDownloadAppModal, setShowDownloadAppModal] = useState(false);
  const [showPhoneStorageModal, setShowPhoneStorageModal] = useState(false);
  const [showStoragePromptBanner, setShowStoragePromptBanner] = useState(false);
  const [storagePermissionGranted, setStoragePermissionGranted] = useState(phoneStorageService.getPermissionStatus() === 'granted');
  
  // AI Audit and AI Explanation Modals
  const [auditTargetQuiz, setAuditTargetQuiz] = useState<QuizType | null>(null);
  const [showAiAuditModal, setShowAiAuditModal] = useState(false);
  const [explainModalQuestion, setExplainModalQuestion] = useState<any | null>(null);
  const [explainModalUserSelected, setExplainModalUserSelected] = useState<number | null | undefined>(null);
  const [showAiExplainModal, setShowAiExplainModal] = useState(false);
  const [isAuditingPastedJson, setIsAuditingPastedJson] = useState(false);

  const [library, setLibrary] = useState<StoredQuiz[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkedQuestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [scanInfo, setScanInfo] = useState<{ pages: number, words: number } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullBrowser, setIsFullBrowser] = useState(false);
  const [showJsonInfo, setShowJsonInfo] = useState(false);
  const [showTopMenu, setShowTopMenu] = useState(false);
  
  const [tempText, setTempText] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [userApiKeys, setUserApiKeysState] = useState<string[]>([]);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [pdfQuestionCount, setPdfQuestionCount] = useState(20);
  const [showPasteArea, setShowPasteArea] = useState(false);

  // New features: category filter & quiz renaming & offline local storage
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedSubCategoryFilter, setSelectedSubCategoryFilter] = useState<string>('ALL');
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState<string>('');
  const [activeMenuQuizId, setActiveMenuQuizId] = useState<string | null>(null);
  const [transferModalQuiz, setTransferModalQuiz] = useState<StoredQuiz | null>(null);
  const [transferCatId, setTransferCatId] = useState<string>('');
  const [transferSubCatId, setTransferSubCatId] = useState<string>('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
  const [aiLanguage, setAiLanguage] = useState<string>('English');
  const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Google Drive Sync states
  const [isDriveConnected, setIsDriveConnected] = useState(googleDriveService.isAuthenticated());
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [driveSyncMessage, setDriveSyncMessage] = useState<string | null>(null);

  const handleConnectDrive = async () => {
    try {
      setDriveSyncMessage(null);
      setIsDriveSyncing(true);
      await googleDriveService.authenticate();
      setIsDriveConnected(true);
      setDriveSyncMessage('Successfully connected to Google Drive!');
      setIsDriveSyncing(false);
    } catch (err: any) {
      setIsDriveSyncing(false);
      setDriveSyncMessage(err.message || 'Google Drive connection failed.');
    }
  };

  const handleBackupToDrive = async () => {
    try {
      setIsDriveSyncing(true);
      setDriveSyncMessage(null);
      const dataToBackup = {
        library,
        bookmarks,
        categories,
        quizConfig,
        userApiKeys,
        version: 1,
        updatedAt: Date.now()
      };
      const success = await googleDriveService.backupData(dataToBackup);
      if (success) {
        setDriveSyncMessage('Successfully backed up all tests & data to Google Drive! Available offline anytime.');
      } else {
        setDriveSyncMessage('Backup completed with warnings.');
      }
      setIsDriveSyncing(false);
    } catch (err: any) {
      setIsDriveSyncing(false);
      setDriveSyncMessage(err.message || 'Backup failed.');
    }
  };

  const handleRestoreFromDrive = async () => {
    try {
      setIsDriveSyncing(true);
      setDriveSyncMessage(null);
      const data = await googleDriveService.restoreData();
      if (data) {
        if (data.library) {
          setLibrary(data.library);
          localStorage.setItem('qf_lib_v4', JSON.stringify(data.library));
        }
        if (data.bookmarks) {
          setBookmarks(data.bookmarks);
          localStorage.setItem('qf_bookmarks_v4', JSON.stringify(data.bookmarks));
        }
        if (data.categories) {
          setCategories(data.categories);
          localStorage.setItem('qf_categories', JSON.stringify(data.categories));
        }
        if (data.quizConfig) {
          setQuizConfig(data.quizConfig);
          localStorage.setItem('qf_quiz_config', JSON.stringify(data.quizConfig));
        }
        if (data.userApiKeys) {
          setUserApiKeysState(data.userApiKeys);
          setUserApiKeys(data.userApiKeys);
          localStorage.setItem('qf_user_api_keys', JSON.stringify(data.userApiKeys));
        }
        setDriveSyncMessage('Successfully restored & synced data from Google Drive! All tests are now available offline.');
      }
      setIsDriveSyncing(false);
    } catch (err: any) {
      setIsDriveSyncing(false);
      setDriveSyncMessage(err.message || 'Restore failed.');
    }
  };
  
  // Admin config
  const [adminQuizTitle, setAdminQuizTitle] = useState('');
  const [adminCategoryId, setAdminCategoryId] = useState('');
  const [adminSubCategoryId, setAdminSubCategoryId] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [pendingQuizToStart, setPendingQuizToStart] = useState<QuizType | null>(null);
  const [resumeModalSession, setResumeModalSession] = useState<SavedQuizSession | null>(null);

  const [pausedSession, setPausedSession] = useState<SavedQuizSession | null>(() => {
    return quizSessionService.getActiveSession();
  });

  const [pausedQuizState, setPausedQuizState] = useState<{
    index: number;
    answers: UserAnswer[];
    timer: number;
  } | null>(null);

  // Checks if a quiz already has paused progress; if yes, shows Resume or Start Fresh modal
  const handleInitiateQuiz = (targetQuiz: QuizType) => {
    // Sanitize question IDs to ensure they are strictly unique
    const seenIds = new Set<string>();
    const sanitizedQuestions = targetQuiz.questions.map(q => {
      let id = q.id;
      if (!id || seenIds.has(id)) {
        id = crypto.randomUUID();
      }
      seenIds.add(id);
      return { ...q, id };
    });
    const sanitizedQuiz = { ...targetQuiz, questions: sanitizedQuestions };

    const saved = quizSessionService.getSessionForQuiz(sanitizedQuiz);
    if (saved && (saved.currentQuestionIndex > 0 || (saved.userAnswers && saved.userAnswers.length > 0) || (saved.timer && saved.timer > 0))) {
      setResumeModalSession(saved);
    } else {
      setPausedQuizState(null);
      setPendingQuizToStart(sanitizedQuiz);
    }
  };

  const handleSaveAndExit = (session: SavedQuizSession) => {
    quizSessionService.saveSession(session);
    setPausedSession(session);
    restart();
    setSuccessMessage(`✓ Test paused at Question ${session.currentQuestionIndex + 1}. You can resume anytime!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const resumePausedSession = (session: SavedQuizSession) => {
    setQuiz(session.quiz);
    setQuizConfig(session.quizConfig);
    setPausedQuizState({
      index: session.currentQuestionIndex,
      answers: session.userAnswers,
      timer: session.timer
    });
    setAppState('QUIZ_IN_PROGRESS');
    setResumeModalSession(null);
    setPausedSession(null);
  };

  const startFreshFromPausedSession = (session: SavedQuizSession) => {
    quizSessionService.clearSessionForQuiz(session.quiz.id || session.quiz.title);
    setPausedSession(quizSessionService.getActiveSession());
    setPausedQuizState(null);
    setResumeModalSession(null);
    setPendingQuizToStart(session.quiz);
  };

  const discardPausedSession = () => {
    if (pausedSession) {
      quizSessionService.clearSessionForQuiz(pausedSession.quiz.id || pausedSession.quiz.title);
    }
    setPausedSession(null);
  };

  // Quiz Marking and Timer Rules (Synced from Firestore)
  const [quizConfig, setQuizConfig] = useState<QuizConfig>({
    mode: 'TEST',
    positiveMarks: 1,
    negativeMarks: 0.25,
    timePerQuestion: 0,
    testDurationMinutes: 0
  });

  useEffect(() => {
    // Load User API Keys
    const savedKeys = localStorage.getItem('qf_user_api_keys');
    if (savedKeys) {
      try {
        const keys = JSON.parse(savedKeys);
        setUserApiKeysState(keys);
        setUserApiKeys(keys);
      } catch (e) {
        console.error("Failed to parse user API keys", e);
      }
    }

    // Load Quiz Config from local storage then backend
    const savedConfig = localStorage.getItem('qf_quiz_config');
    if (savedConfig) {
      try {
        setQuizConfig(JSON.parse(savedConfig));
      } catch (e) {}
    }
    fetchQuizConfig();
  }, []);

  const fetchQuizConfig = async () => {
    try {
      const res = await fetch('/api/settings/quiz_config');
      if (res.ok) {
        const data = await res.json();
        const cfg = {
          mode: 'TEST' as const,
          positiveMarks: Number(data.positiveMarks ?? 1),
          negativeMarks: Number(data.negativeMarks ?? 0.25),
          timePerQuestion: Number(data.timePerQuestion ?? 0),
          testDurationMinutes: Number(data.testDurationMinutes ?? 0)
        };
        setQuizConfig(cfg);
        localStorage.setItem('qf_quiz_config', JSON.stringify(cfg));
      }
    } catch (e) {
      console.warn("Could not fetch quiz config from backend, using local defaults:", e);
    }
  };

  const saveUserApiKeys = (keys: string[]) => {
    setUserApiKeysState(keys);
    setUserApiKeys(keys);
    localStorage.setItem('qf_user_api_keys', JSON.stringify(keys));
  };

  const addApiKey = () => {
    if (!newKeyInput.trim()) return;
    const updated = [...userApiKeys, newKeyInput.trim()];
    saveUserApiKeys(updated);
    setNewKeyInput('');
  };

  const removeApiKey = (index: number) => {
    const updated = userApiKeys.filter((_, i) => i !== index);
    saveUserApiKeys(updated);
  };

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Phone Storage Permission & Sync prompt
  useEffect(() => {
    const perm = phoneStorageService.getPermissionStatus();
    if (perm === 'prompt') {
      const timer = setTimeout(() => {
        setShowStoragePromptBanner(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleGrantPhoneStorage = async () => {
    await phoneStorageService.requestPermission();
    setStoragePermissionGranted(true);
    setShowStoragePromptBanner(false);
    setSuccessMessage("✓ Phone Storage Permission Granted! Tests are saved in device memory.");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDismissStoragePrompt = () => {
    phoneStorageService.denyPermission();
    setShowStoragePromptBanner(false);
  };

  const handleDataImported = (data: { library?: StoredQuiz[]; bookmarks?: BookmarkedQuestion[]; categories?: Category[]; pausedSession?: SavedQuizSession; savedSessions?: Record<string, SavedQuizSession> }) => {
    if (data.library && Array.isArray(data.library)) {
      setLibrary(data.library);
      localStorage.setItem('qf_lib_v4', JSON.stringify(data.library));
      // Sync imported quizzes to MongoDB in background
      data.library.forEach(q => {
        fetch('/api/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(q)
        }).catch(() => {});
      });
    }
    if (data.bookmarks && Array.isArray(data.bookmarks)) {
      setBookmarks(data.bookmarks);
      localStorage.setItem('qf_bookmarks_v4', JSON.stringify(data.bookmarks));
    }
    if (data.categories && Array.isArray(data.categories)) {
      setCategories(data.categories);
      localStorage.setItem('qf_categories', JSON.stringify(data.categories));
    }
    if (data.pausedSession) {
      setPausedSession(data.pausedSession);
    } else {
      const act = quizSessionService.getActiveSession();
      if (act) setPausedSession(act);
    }
    setSuccessMessage("✓ All Saved Tests, Bookmarks, and Paused Progress restored successfully!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Just show the modal instructions without redirecting
      setShowDownloadAppModal(true);
    }
  };

  const { user, isAdmin, loading: authLoading, login, loginAsGuest, logout, authError } = useAuth();

  const loadDemoJson = () => {
    const demoObj = JSON.parse(jsonTemplate);
    processJsonQuiz(demoObj, "Demo JSON Quiz");
  };

  const startRenameQuiz = (q: StoredQuiz, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingQuizId(q.id);
    setEditingTitleText(q.title);
  };

  const saveRenameQuiz = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingTitleText.trim()) return;
    const savedLib = localStorage.getItem('qf_lib_v4');
    if (savedLib) {
      const lib = JSON.parse(savedLib);
      const updated = lib.map((q: StoredQuiz) => q.id === id ? { ...q, title: editingTitleText.trim() } : q);
      localStorage.setItem('qf_lib_v4', JSON.stringify(updated));
    }
    setLibrary(prev => prev.map(q => q.id === id ? { ...q, title: editingTitleText.trim() } : q));
    setEditingQuizId(null);
    setEditingTitleText('');
  };

  const transferQuizCategory = async (id: string, newCategoryId: string, newSubCategoryId: string = '') => {
    try {
      if (isAdmin) {
        await fetch(`/api/quizzes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryId: newCategoryId || '', subCategoryId: newSubCategoryId || '' })
        });
      }
    } catch(err) {
      console.error(err);
    }

    const savedLib = localStorage.getItem('qf_lib_v4');
    if (savedLib) {
      const lib = JSON.parse(savedLib);
      const updated = lib.map((q: StoredQuiz) => q.id === id ? { ...q, categoryId: newCategoryId, subCategoryId: newSubCategoryId } : q);
      localStorage.setItem('qf_lib_v4', JSON.stringify(updated));
    }
    setLibrary(prev => prev.map(q => q.id === id ? { ...q, categoryId: newCategoryId, subCategoryId: newSubCategoryId } : q));
    setTransferModalQuiz(null);
  };

  const navigateTo = (newTab: TabState, newState: AppState = 'IDLE') => {
    window.history.pushState({ tab: newTab, appState: newState }, "");
    setTab(newTab);
    setAppState(newState);
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state) {
        setTab(e.state.tab);
        setAppState(e.state.appState);
      } else {
        setTab('HOME');
        setAppState('IDLE');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const savedBookmarks = localStorage.getItem('qf_bookmarks_v4');
    const savedTheme = localStorage.getItem('qf_theme');
    if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
    if (savedTheme === 'dark') setIsDarkMode(true);

    const handleFullscreenChange = () => {
      setIsFullBrowser(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    // 1. Immediate Local Load (for low internet/offline speed)
    const savedLib = localStorage.getItem('qf_lib_v4');
    const savedCats = localStorage.getItem('qf_categories');
    if (savedLib) setLibrary(JSON.parse(savedLib));
    if (savedCats) setCategories(JSON.parse(savedCats));

    // 2. Fetch fresh data from Cloud
    fetchQuizzes();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const dbCats = await res.json();
        setCategories(dbCats);
        localStorage.setItem('qf_categories', JSON.stringify(dbCats));
      }
    } catch (e) {
      console.warn("Categories fetch failed, using local cache", e);
    }
  };

  useEffect(() => {
    localStorage.setItem('qf_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes');
      if (res.ok) {
        const dbQuizzes = await res.json();
        // Update local storage with latest cloud data
        localStorage.setItem('qf_lib_v4', JSON.stringify(dbQuizzes));
        setLibrary(dbQuizzes);
      }
    } catch (e) {
      console.warn("Quizzes fetch failed, using local cache", e);
      const savedLib = localStorage.getItem('qf_lib_v4');
      if (savedLib) setLibrary(JSON.parse(savedLib));
    }
  };

  const saveToLibrary = async (newQuiz: QuizType) => {
    try {
      setAppState('PROCESSING_PDF');
      if (isAdmin && adminCategoryId) {
        newQuiz.categoryId = adminCategoryId;
        if (adminSubCategoryId) newQuiz.subCategoryId = adminSubCategoryId;
        if (adminQuizTitle) newQuiz.title = adminQuizTitle;
      }
      
      const quizId = newQuiz.id || crypto.randomUUID();
      const localStoredQuiz: StoredQuiz = { ...newQuiz, id: quizId, createdAt: Date.now() };

      // Save locally immediately
      const savedLib = localStorage.getItem('qf_lib_v4');
      const lib = savedLib ? JSON.parse(savedLib) : [];
      const filteredLib = lib.filter((q: StoredQuiz) => q.id !== quizId);
      const updatedLib = [localStoredQuiz, ...filteredLib].slice(0, 100);
      localStorage.setItem('qf_lib_v4', JSON.stringify(updatedLib));
      setLibrary(updatedLib);

      // Upload to MongoDB backend and wait for response
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localStoredQuiz)
      });

      if (res.ok) {
        const savedDoc = await res.json();
        const currentLib = localStorage.getItem('qf_lib_v4');
        const curLibArr = currentLib ? JSON.parse(currentLib) : [];
        const filt = curLibArr.filter((q: StoredQuiz) => q.id !== savedDoc.id);
        const finalUpd = [savedDoc, ...filt].slice(0, 100);
        localStorage.setItem('qf_lib_v4', JSON.stringify(finalUpd));
        setLibrary(finalUpd);
        setSuccessMessage("Quiz successfully uploaded and sent to database!");
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setSuccessMessage("Quiz successfully uploaded & synced locally!");
        setTimeout(() => setSuccessMessage(null), 5000);
      }
      setAppState('IDLE');
    } catch (e) {
      console.error("Error saving quiz to library", e);
      setAppState('IDLE');
      setSuccessMessage("Quiz successfully uploaded!");
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleUpdateQuiz = (updatedQuiz: Quiz) => {
    setQuiz(updatedQuiz);
    setLibrary(prev => {
      const exists = prev.some(q => q.id === updatedQuiz.id);
      let updatedLib: StoredQuiz[];
      if (exists) {
        updatedLib = prev.map(q => q.id === updatedQuiz.id ? { ...q, ...updatedQuiz, questions: updatedQuiz.questions } : q);
      } else {
        const newStored: StoredQuiz = {
          ...updatedQuiz,
          createdAt: updatedQuiz.createdAt || Date.now()
        };
        updatedLib = [newStored, ...prev];
      }
      localStorage.setItem('qf_lib_v4', JSON.stringify(updatedLib));
      localStorage.setItem('quizzly_library', JSON.stringify(updatedLib));
      return updatedLib;
    });

    // Sync updated quiz to backend if online
    fetch(`/api/quizzes/${updatedQuiz.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedQuiz)
    }).catch(() => {});
  };

  const handleBookmark = (bq: BookmarkedQuestion) => {
    const exists = bookmarks.some(b => b.question.id === bq.question.id);
    let updated = exists 
      ? bookmarks.filter(b => b.question.id !== bq.question.id)
      : [bq, ...bookmarks];
    setBookmarks(updated);
    localStorage.setItem('qf_bookmarks_v4', JSON.stringify(updated));
  };

  const deleteQuiz = async (id: string) => {
    // update local state and localStorage IMMEDIATELY for instant feedback
    const savedLib = localStorage.getItem('qf_lib_v4');
    if (savedLib) {
      const lib = JSON.parse(savedLib);
      const updated = lib.filter((q: StoredQuiz) => q.id !== id);
      localStorage.setItem('qf_lib_v4', JSON.stringify(updated));
    }
    setLibrary(prev => prev.filter(q => q.id !== id));
    setQuizToDelete(null);

    try {
      if (isAdmin) {
        await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
      }
    } catch(err) {
      console.error("Error deleting from backend:", err);
    }
  };

  const processJsonQuiz = (jsonData: any, sourceName: string) => {
    if (jsonData.questions && Array.isArray(jsonData.questions)) {
      const finalQuiz: QuizType = {
        id: jsonData.id || crypto.randomUUID(),
        title: jsonData.title || sourceName,
        questions: jsonData.questions.map((q: any) => ({
          ...q,
          id: q.id || crypto.randomUUID()
        })),
        createdAt: Date.now()
      };
      saveToLibrary(finalQuiz);
      setAppState('IDLE');
      return true;
    }
    return false;
  };

  const handleAuditAndFixPastedJson = async () => {
    const trimmed = pastedText.trim();
    if (!trimmed) {
      setError("Please paste your Quiz JSON first.");
      return;
    }

    try {
      setIsAuditingPastedJson(true);
      setError(null);
      const parsed = JSON.parse(trimmed);
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("Invalid Quiz JSON format. Missing 'questions' array.");
      }

      const tempQuiz: QuizType = {
        id: parsed.id || crypto.randomUUID(),
        title: parsed.title || "Audited Quiz",
        questions: parsed.questions.map((q: any) => ({
          ...q,
          id: q.id || crypto.randomUUID()
        })),
        createdAt: Date.now()
      };

      // Open AI Audit Modal for visual feedback and confirmation
      setAuditTargetQuiz(tempQuiz);
      setShowAiAuditModal(true);
      setPastedText('');
      setShowPasteArea(false);
    } catch (err: any) {
      setError(err.message || "Failed to parse JSON. Please check formatting.");
    } finally {
      setIsAuditingPastedJson(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    try {
      setError(null);
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (!processJsonQuiz(imported, file.name.replace('.json', ''))) {
          throw new Error("Invalid Quiz JSON format. Missing 'questions' array.");
        }
      } else {
        setAppState('PROCESSING_PDF');
        const text = await extractTextFromPDF(file);
        if (!text || text.length < 50) throw new Error("File content too short to analyze.");
        processExtractedText(text);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process file.");
      setAppState('IDLE');
    }
  };

  const processExtractedText = (text: string) => {
    setTempText(text);
    setScanInfo({ pages: Math.ceil(text.length / 2500), words: text.split(/\s+/).length });
    setAppState('CONFIGURING_QUIZ');
  };

  const handlePasteProcess = () => {
    const trimmed = pastedText.trim();
    if (!trimmed) {
      setError("Please paste some content first.");
      return;
    }

    // Try to detect if it's a JSON quiz first (No API Call)
    try {
      const maybeJson = JSON.parse(trimmed);
      if (processJsonQuiz(maybeJson, "Pasted JSON Quiz")) {
        setPastedText('');
        setShowPasteArea(false);
        return;
      }
    } catch (e) {
      // Not JSON, continue to AI processing
    }

    // If not JSON, process as raw text for AI (API Call)
    if (trimmed.length < 50) {
      setError("Please paste a more substantial amount of text (at least 50 chars) for AI analysis.");
      return;
    }
    processExtractedText(trimmed);
    setPastedText('');
    setShowPasteArea(false);
  };

  const startPdfGeneration = async () => {
    try {
      setError(null);
      setAppState('GENERATING_QUIZ');
      const generatedQuiz = await generateQuizFromText(tempText, pdfQuestionCount, aiLanguage, quizDifficulty);
      saveToLibrary(generatedQuiz);
      setTempText('');
      setAppState('IDLE');
      handleInitiateQuiz(generatedQuiz);
    } catch (err: any) {
      setError(err.message || "Generation failed.");
      setAppState('IDLE');
    }
  };

  const handleAiQuizGenerate = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setError(null);
      setAppState('GENERATING_QUIZ');
      const generatedQuiz = await generateQuizFromPrompt(aiPrompt, 6, aiLanguage, quizDifficulty); 
      // Ensure all questions have unique UUIDs
      const seenIds = new Set<string>();
      const sanitizedQuiz: QuizType = {
        ...generatedQuiz,
        questions: generatedQuiz.questions.map(q => {
          let id = q.id;
          if (!id || seenIds.has(id)) {
            id = crypto.randomUUID();
          }
          seenIds.add(id);
          return { ...q, id };
        })
      };
      saveToLibrary(sanitizedQuiz);
      setAppState('IDLE');
      handleInitiateQuiz(sanitizedQuiz);
    } catch (err: any) {
      setError(err.message || "AI Prompt failed.");
      setAppState('IDLE');
    }
  };

  const handleFetchNextQuestion = async () => {
    if (!quiz || !quiz.isInfinite || !quiz.originalPrompt) return;
    try {
      const history = quiz.questions.map(q => q.question);
      const newQuestions = await generateBatchQuestions(quiz.originalPrompt, history, 6, quiz.language || 'English');
      if (newQuestions && newQuestions.length > 0) {
        setQuiz(prev => {
          if (!prev) return null;
          const existingIds = new Set(prev.questions.map(q => q.id));
          const uniqueNewQuestions = newQuestions.map(q => {
            let id = q.id;
            if (!id || existingIds.has(id)) {
              id = crypto.randomUUID();
            }
            existingIds.add(id);
            return { ...q, id };
          });
          return {
            ...prev,
            questions: [...prev.questions, ...uniqueNewQuestions]
          };
        });
      }
    } catch (err: any) {
      console.error("Failed to generate backup questions", err);
    }
  };

  const startBookmarkPractice = () => {
    if (bookmarks.length === 0) return;
    const practiceQuiz: QuizType = {
      id: 'practice-' + Date.now(),
      title: 'Practice: Bookmarked Questions',
      questions: bookmarks.map(b => b.question),
      createdAt: Date.now()
    };
    handleInitiateQuiz(practiceQuiz);
  };

  const calculateScoreData = (currentResults?: UserAnswer[]) => {
    const res = currentResults || results;
    if (!res) return { 
      points: 0, 
      accuracy: 0, 
      correct: 0, 
      incorrect: 0, 
      attempted: 0, 
      skipped: 0,
      totalQuestions: 0,
      totalTime: 0, 
      positiveEarned: 0, 
      negativeDeducted: 0, 
      finalMarks: 0, 
      totalPossibleMarks: 0,
      posMarks: 1,
      negMarks: 0.25
    };

    const attempted = res.length;
    const correct = res.filter(a => a.isCorrect).length;
    const incorrect = res.filter(a => a.selectedOptionIndex !== null && !a.isCorrect).length;
    const skipped = res.filter(a => a.selectedOptionIndex === null).length;
    const totalQuestions = quiz?.questions.length || attempted;
    const totalTime = res.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0);

    const posMarks = quizConfig.positiveMarks ?? 1;
    const negMarks = quizConfig.negativeMarks ?? 0.25;

    const positiveEarned = correct * posMarks;
    const negativeDeducted = incorrect * negMarks;
    const finalMarks = Math.max(0, positiveEarned - negativeDeducted);
    const totalPossibleMarks = totalQuestions * posMarks;

    // Points rule: 1 mark (+1 PTS) per correct answer for rank calculation
    const points = correct * 1;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

    return { 
      points, 
      accuracy: Math.round(accuracy), 
      correct, 
      incorrect, 
      attempted, 
      skipped,
      totalQuestions,
      totalTime,
      posMarks,
      negMarks,
      positiveEarned: Number(positiveEarned.toFixed(2)),
      negativeDeducted: Number(negativeDeducted.toFixed(2)),
      finalMarks: Number(finalMarks.toFixed(2)),
      totalPossibleMarks: Number(totalPossibleMarks.toFixed(2))
    };
  };

  const syncPointsToDatabase = async (ans: UserAnswer[]) => {
    if (!ans || ans.length === 0 || !user) return;
    const attemptedCount = ans.length;
    const correctCount = ans.filter(a => a.isCorrect).length;
    const totalTime = ans.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0);
    // 1 mark per correct answer for rank points
    const pointsEarned = correctCount * 1;

    // Update local cache first
    try {
      const savedCache = localStorage.getItem('qf_cached_leaderboard');
      let cachedUsers: any[] = savedCache ? JSON.parse(savedCache) : [];
      const userIdx = cachedUsers.findIndex(u => u.id === user.uid || u.email === user.email);
      const userName = user.displayName || user.email?.split('@')[0] || 'User';
      
      if (userIdx >= 0) {
        cachedUsers[userIdx] = {
          ...cachedUsers[userIdx],
          totalPoints: (cachedUsers[userIdx].totalPoints || 0) + pointsEarned,
          questionsAttempted: (cachedUsers[userIdx].questionsAttempted || 0) + attemptedCount,
          correctAnswers: (cachedUsers[userIdx].correctAnswers || 0) + correctCount,
          totalTimeSpent: (cachedUsers[userIdx].totalTimeSpent || 0) + totalTime,
          name: userName
        };
      } else {
        cachedUsers.push({
          id: user.uid,
          email: user.email || '',
          name: userName,
          totalPoints: pointsEarned,
          questionsAttempted: attemptedCount,
          correctAnswers: correctCount,
          totalTimeSpent: totalTime,
          role: isAdmin ? 'admin' : 'user'
        });
      }
      cachedUsers.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
      localStorage.setItem('qf_cached_leaderboard', JSON.stringify(cachedUsers));
    } catch (cacheErr) {
      console.warn("Failed updating local leaderboard cache:", cacheErr);
    }

    try {
      await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          pointsEarned,
          questionsAttempted: attemptedCount,
          correctAnswers: correctCount,
          totalTimeSpent: totalTime,
          role: isAdmin ? 'admin' : 'user'
        })
      });
    } catch (e) {
      console.warn("Server sync PTS offline fallback used:", e);
    }
  };

  const handleFinishQuiz = async (ans: UserAnswer[]) => {
    setResults(ans);
    setAppState('RESULTS');
    if (quiz) {
      quizSessionService.clearSessionForQuiz(quiz.id || quiz.title);
      setPausedSession(quizSessionService.getActiveSession());
    }
    await syncPointsToDatabase(ans);
  };

  const handleAbortQuiz = async (ans?: UserAnswer[]) => {
    if (quiz) {
      quizSessionService.clearSessionForQuiz(quiz.id || quiz.title);
      setPausedSession(quizSessionService.getActiveSession());
    }
    if (ans && ans.length > 0) {
      await syncPointsToDatabase(ans);
    }
    restart();
  };

  const restart = () => {
    setAppState('IDLE');
    setQuiz(null);
    setResults(null);
    setPausedQuizState(null);
    setError(null);
    setScanInfo(null);
    setAiPrompt('');
    setTempText('');
    setPastedText('');
  };

  const jsonTemplate = `{
  "title": "My Custom Quiz",
  "questions": [
    {
      "question": "What is the capital of Japan?",
      "options": ["Osaka", "Kyoto", "Tokyo", "Nara"],
      "correctAnswerIndex": 2,
      "explanation": "Tokyo is the political and economic center of Japan."
    }
  ]
}`;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#fcfdfe] text-slate-900'} antialiased overflow-x-hidden ${appState !== 'QUIZ_IN_PROGRESS' ? 'pt-14 sm:pt-16' : ''}`}>
      {appState !== 'QUIZ_IN_PROGRESS' && (
        <header className="fixed top-0 left-0 right-0 z-[60] bg-slate-900 border-b-2 border-black px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2 text-white shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer shrink-0" onClick={restart}>
              <button onClick={() => setShowTopMenu(!showTopMenu)} className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all border border-slate-700" title="Menu">
                <Menu size={18} />
              </button>
              <img src="/icon.jpg" alt="Quiz Flash Logo" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm object-cover border border-slate-700" referrerPolicy="no-referrer" />
             <h1 className="text-sm sm:text-base font-black uppercase tracking-tighter whitespace-nowrap text-white">Quiz <span className="text-blue-400">Flash</span></h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
             {authLoading ? (
               <div className="h-4 w-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin mr-1"></div>
             ) : user ? (
               <div className="flex items-center gap-1">
                 <div className="hidden sm:block px-2.5 py-1 rounded-xl bg-blue-900/60 text-blue-300 font-black text-[9.5px] uppercase tracking-wider border border-blue-700">
                   {user.displayName || 'Learner'}
                 </div>
                 <button onClick={logout} className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white font-bold text-[8px] uppercase">Logout</button>
               </div>
             ) : (
               <div className="flex items-center gap-1">
                 <button onClick={login} className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-black text-[9.5px] uppercase tracking-wider hover:bg-blue-500 transition-all shrink-0 border border-blue-500">Google Login</button>
                 <button onClick={loginAsGuest} className="px-2 py-1 rounded-xl bg-slate-800 text-slate-300 font-bold text-[8.5px] uppercase hover:bg-slate-700 transition-all">Guest</button>
               </div>
             )}
             <button onClick={toggleFullscreen} className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-all border border-slate-700" title="Full Screen">
               <Maximize2 size={16} />
             </button>
             <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-yellow-400 hover:bg-slate-700 transition-all border border-slate-700" title="Theme Toggle">
               {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
             </button>
          </div>
        </header>
      )}

      {/* Vercel Login Warning/Notification Banner if any */}
      {authError && (
        <div className="max-w-4xl mx-auto px-3 py-1.5 mt-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[9.5px] rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
          <span>{authError}</span>
          <button onClick={loginAsGuest} className="px-2 py-0.5 bg-amber-500 text-white font-black text-[8px] uppercase rounded-lg shrink-0">Continue as Guest</button>
        </div>
      )}

      {/* 3-Line Dropdown Menu Modal - Half Screen Slide-in */}
      {showTopMenu && (
        <div className="fixed inset-0 z-[300] flex animate-in fade-in duration-300">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowTopMenu(false)}></div>
          
          {/* Half screen slide-in panel */}
          <div className={`relative w-1/2 min-w-[260px] max-w-sm h-full shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-left duration-300 ${isDarkMode ? 'bg-slate-900 border-r border-slate-800 text-white' : 'bg-white border-r border-slate-100 text-slate-900'}`}>
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex items-center gap-3">
                  <img src="/logo.jpg" alt="Quiz Flash Logo" className="w-8 h-8 rounded-lg shadow-sm object-cover border border-slate-200 dark:border-slate-800" />
                  <h3 className="text-sm font-black uppercase tracking-tighter">Quiz <span className="text-blue-600">Flash</span></h3>
                </div>
                <button onClick={() => setShowTopMenu(false)} className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"><X size={18} /></button>
              </div>

              <div className="space-y-2">
                <button onClick={() => { navigateTo('HOME'); setShowTopMenu(false); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${tab === 'HOME' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <Home size={18} /> Hub
                </button>
                <button onClick={() => { navigateTo('AI_PROMPT'); setShowTopMenu(false); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${tab === 'AI_PROMPT' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <Sparkles size={18} /> Forge
                </button>
                <button onClick={() => { navigateTo('LIBRARY'); setShowTopMenu(false); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${tab === 'LIBRARY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <LayoutGrid size={18} /> Library
                </button>
                <button onClick={() => { navigateTo('SAVED'); setShowTopMenu(false); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${tab === 'SAVED' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <Bookmark size={18} /> Vault
                </button>
                <button onClick={() => { navigateTo('LEADERBOARD'); setShowTopMenu(false); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${tab === 'LEADERBOARD' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <Trophy size={18} /> Rank
                </button>
                <button onClick={() => { setShowPhoneStorageModal(true); setShowTopMenu(false); }} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  <Smartphone size={18} className="text-blue-500" /> Phone Storage & Sync
                </button>
                <button onClick={() => { setShowJsonInfo(true); setShowTopMenu(false); }} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  <Brackets size={18} className="text-indigo-500" /> JSON Format Guide
                </button>
                <button onClick={() => { navigateTo('SETTINGS'); setShowTopMenu(false); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${tab === 'SETTINGS' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <Settings size={18} /> Settings
                </button>
                <button onClick={() => { navigateTo('ADMIN'); setShowTopMenu(false); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${tab === 'ADMIN' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  <Shield size={18} /> Admin Panel
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
                <button 
                  onClick={() => { handleInstallApp(); setShowTopMenu(false); }} 
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 transition-all group"
                >
                  <div className="p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                    <Download size={16} />
                  </div>
                  <div className="text-left">
                    <div className="font-black text-[11px]">Install / Download App</div>
                    <div className="text-[9px] text-blue-400 font-bold lowercase opacity-70">Direct APK & Web-App</div>
                  </div>
                </button>
                {user && (
                  <button onClick={() => { setShowLogoutConfirm(true); setShowTopMenu(false); }} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition-all">
                    <LogOut size={18} /> Logout Session
                  </button>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quiz Flash v2.4 • Offline Ready</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4">
           <div className="bg-red-600 text-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4">
              <AlertCircle size={22} className="shrink-0" />
              <p className="text-xs font-bold flex-1 leading-relaxed">{error}</p>
              <button onClick={() => setError(null)} className="p-1 hover:bg-white/20 rounded-lg"><X size={18} /></button>
           </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4">
           <div className="bg-emerald-600 text-white p-5 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4">
              <CheckCircle2 size={22} className="shrink-0" />
              <p className="text-xs font-bold flex-1 leading-relaxed">{successMessage}</p>
              <button onClick={() => setSuccessMessage(null)} className="p-1 hover:bg-white/20 rounded-lg"><X size={18} /></button>
           </div>
        </div>
      )}

      <main className={`flex-1 container mx-auto px-4 max-w-4xl ${appState === 'QUIZ_IN_PROGRESS' ? 'p-0' : 'pb-28 pt-6'}`}>
         {/* Logout Confirmation Modal */}
       {showLogoutConfirm && (
         <div className="fixed inset-0 z-[350] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xs p-6 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-300">
               <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield size={24} />
               </div>
               <h4 className="text-sm font-black mb-1 text-slate-900 dark:text-white">Log Out Confirmation</h4>
               <p className="text-slate-400 text-[10px] mb-6">Are you sure you want to log out of your account?</p>
               
               <div className="flex flex-col gap-2">
                  <button 
                     onClick={() => {
                       logout();
                       setShowLogoutConfirm(false);
                     }}
                     className="w-full py-3 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md active:scale-95 transition-all"
                  >
                     Yes, Log Out
                  </button>
                  <button 
                     onClick={() => setShowLogoutConfirm(false)}
                     className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                     Cancel
                  </button>
               </div>
            </div>
         </div>
       )}

       {/* Quiz Delete Confirmation Modal */}
       {quizToDelete && (
         <div className="fixed inset-0 z-[350] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xs p-6 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 text-center animate-in zoom-in-95 duration-300">
               <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={24} />
               </div>
               <h4 className="text-sm font-black mb-1 text-slate-900 dark:text-white">Delete Quiz?</h4>
               <p className="text-slate-400 text-[10px] mb-6">Are you sure you want to delete this quiz? This action cannot be undone.</p>
               
               <div className="flex flex-col gap-2">
                  <button 
                     onClick={() => deleteQuiz(quizToDelete)}
                     className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md active:scale-95 transition-all"
                  >
                     Yes, Delete
                  </button>
                  <button 
                     onClick={() => setQuizToDelete(null)}
                     className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                     Cancel
                  </button>
               </div>
            </div>
         </div>
       )}

       {/* Download / Install App Modal */}
       {showDownloadAppModal && (
         <div className="fixed inset-0 z-[350] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md p-6 sm:p-7 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300 text-left">
               <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                        <Smartphone size={22} />
                     </div>
                     <div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white">Download & Install App</h4>
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Mobile App & APK Options</p>
                     </div>
                  </div>
                  <button onClick={() => setShowDownloadAppModal(false)} className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-all">
                     <X size={18} />
                  </button>
               </div>

               <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-slate-900 border border-blue-200 dark:border-blue-900/60">
                     <div className="font-bold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                        <Zap size={15} /> Native Mobile App Experience
                     </div>
                     <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                        Aap is app ko apne Android ya iPhone me <strong>Mobile App</strong> ki tarah install kar sakte hain. Isse Home screen par app icon ban jaati hai aur full screen me bina browser bar ke chalta hai!
                     </p>
                  </div>

                  {deferredPrompt ? (
                    <button 
                      onClick={handleInstallApp}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={18} /> Install App Now (1-Click PWA)
                    </button>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                       <a 
                         href={`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(window.location.href)}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all"
                       >
                         <Download size={16} /> Generate & Download APK Package (.apk)
                       </a>
                    </div>
                  )}

                  <div className="space-y-2.5 pt-1">
                     <h5 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Chrome / Mobile me Kaise Install karein:</h5>
                     
                     <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs shrink-0">1</span>
                        <div>
                           <div className="font-bold text-slate-800 dark:text-white">Android Chrome</div>
                           <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Top-right menu <strong>(3 dots ⋮)</strong> par click karein &rarr; Select <strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong>.</p>
                        </div>
                     </div>

                     <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg bg-pink-100 dark:bg-pink-900/60 text-pink-600 dark:text-pink-400 font-bold flex items-center justify-center text-xs shrink-0">2</span>
                        <div>
                           <div className="font-bold text-slate-800 dark:text-white">iPhone Safari</div>
                           <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Share button <strong>[&#x2191;]</strong> dabayein &rarr; Select <strong>"Add to Home Screen"</strong>.</p>
                        </div>
                     </div>
                  </div>

                  <button 
                     onClick={() => setShowDownloadAppModal(false)}
                     className="w-full mt-2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all text-center"
                  >
                     Close
                  </button>
               </div>
            </div>
         </div>
       )}

       {appState === 'IDLE' && (
          <div className="animate-in fade-in duration-500">
            {tab === 'HOME' && (
              <div className="space-y-8 max-w-3xl mx-auto pt-2">
                {/* Unified Hero Banner - STICKY / FIXED AT TOP */}
                <div className="sticky top-0 z-30 pt-2 pb-4 -mx-4 px-4 bg-white dark:bg-slate-950/80 backdrop-blur-md">
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-5 sm:p-6 shadow-2xl shadow-blue-500/20 animate-in fade-in zoom-in duration-700">
                    {/* Floating Bubble Effect */}
                    <motion.div 
                      animate={{ 
                        y: [0, -20, 0],
                        x: [0, 10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" 
                    />
                    <motion.div 
                      animate={{ 
                        y: [0, 15, 0],
                        x: [0, -10, 0],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                      className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-8 -mb-8 blur-xl" 
                    />
                    <motion.div 
                      animate={{ 
                        opacity: [0.1, 0.3, 0.1],
                        scale: [1, 1.5, 1]
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                      className="absolute top-1/2 left-1/3 w-12 h-12 bg-white/5 rounded-full blur-md" 
                    />
                    
                    <div className="relative flex flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md p-2.5 border border-white/30 shadow-inner flex items-center justify-center shrink-0">
                          <img src="/icon.jpg" alt="Logo" className="w-full h-full object-contain brightness-0 invert" referrerPolicy="no-referrer" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-xs font-black tracking-tight text-white truncate">
                            Hello, {user?.displayName || 'Learner'} 👋
                          </h2>
                          <p className="text-blue-100/80 text-[8px] font-medium tracking-wide truncate">Ready to evolve today?</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-[6.5px] uppercase tracking-widest shadow-sm">
                          <Sparkles size={7} className="text-amber-300" /> Quiz Flash 2.4
                        </div>
                        <h3 className="text-xs font-black text-white italic tracking-tight">
                          Evolve.
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>



                {/* Phone Storage Permission Request Banner */}
                {showStoragePromptBanner && !storagePermissionGranted && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-lg animate-in fade-in slide-in-from-top-4 duration-500 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                        <Smartphone size={18} className="text-white" />
                      </div>
                      <div>
                        <span className="text-[7.5px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">Device Permission</span>
                        <h4 className="font-black text-xs tracking-tight mt-0.5">Phone Storage & Offline Cache</h4>
                        <p className="text-[9px] text-blue-100 font-medium leading-tight mt-0.5">
                          Quizzes aur test data ko aapke phone storage me save karne ki permission chahiye taki bina internet bhi sab chalta rahe.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <button 
                        onClick={handleGrantPhoneStorage}
                        className="flex-1 sm:flex-none px-3 py-2 bg-white text-blue-700 hover:bg-blue-50 font-black text-[8px] uppercase tracking-widest rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck size={12} /> Allow Permission
                      </button>
                      <button 
                        onClick={handleDismissStoragePrompt}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                        title="Dismiss"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Paused Session Resume Banner */}
                {pausedSession && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg animate-in fade-in zoom-in-95 duration-500 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/25 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                        <Timer size={18} className="animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[7.5px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">Paused Test Session</span>
                        <h4 className="font-black text-xs tracking-tight mt-0.5 truncate max-w-xs">{pausedSession.quiz.title}</h4>
                        <p className="text-[9px] text-amber-100 font-medium">Question {pausedSession.currentQuestionIndex + 1} of {pausedSession.quiz.questions.length} • Elapsed: {Math.floor(pausedSession.timer / 60).toString().padStart(2, '0')}:{(pausedSession.timer % 60).toString().padStart(2, '0')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => resumePausedSession(pausedSession)}
                        className="flex-1 sm:flex-none px-3.5 py-2 bg-white text-amber-600 hover:bg-amber-50 font-black text-[8px] uppercase tracking-widest rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"
                      >
                        <Play size={12} fill="currentColor" /> Resume (Q {pausedSession.currentQuestionIndex + 1})
                      </button>
                      <button 
                        onClick={() => startFreshFromPausedSession(pausedSession)}
                        className="px-3 py-2 bg-amber-700/60 hover:bg-amber-700 text-white font-black text-[8px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1"
                        title="Start this test from beginning"
                      >
                        <RotateCcw size={11} /> Start Fresh
                      </button>
                      <button 
                        onClick={discardPausedSession}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
                        title="Discard Paused Session"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* 1. TOP CATEGORIES & SUB-CATEGORIES SECTION (SHOWN AT VERY TOP OF HOME) */}
                <div className="text-left">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="text-[8.5px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <LayoutGrid size={12} className="text-blue-600" /> Categories & Sub-Categories
                    </h3>
                    <button 
                      onClick={() => navigateTo('LIBRARY')} 
                      className="text-[8.5px] font-black uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-1"
                    >
                      View All Vault Tests <ArrowRight size={10} />
                    </button>
                  </div>

                  {/* Main Categories Grid with AI Generated Thumbnails & Subcategories */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {categories.filter(c => !c.parentId).map(cat => {
                      const subCats = categories.filter(c => c.parentId === cat.id);
                      const catQuizCount = library.filter(q => q.categoryId === cat.id).length;

                      return (
                        <div 
                          key={cat.id}
                          className={`p-2 rounded-xl border transition-all hover:border-blue-500/80 hover:shadow-xs flex flex-col justify-between ${
                            isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-100 shadow-2xs'
                          }`}
                        >
                          <div 
                            onClick={() => {
                              setSelectedCategoryFilter(cat.id);
                              setSelectedSubCategoryFilter('ALL');
                              navigateTo('LIBRARY');
                            }}
                            className="flex items-center gap-2 cursor-pointer group"
                          >
                            <TopicImage 
                              title={cat.name}
                              customUrl={cat.thumbnailUrl}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0 group-hover:scale-105 transition-transform"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-[10.5px] text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{cat.name}</h4>
                              <span className="inline-block px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[7px] font-black uppercase tracking-widest mt-0.5">
                                {catQuizCount} {catQuizCount === 1 ? 'Test' : 'Tests'}
                              </span>
                            </div>
                            <ArrowRight size={12} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
                          </div>

                          {/* Sub-categories row if present */}
                          {subCats.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1">
                              {subCats.map(sub => {
                                const subCount = library.filter(q => q.subCategoryId === sub.id).length;
                                return (
                                  <button
                                    key={sub.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCategoryFilter(cat.id);
                                      setSelectedSubCategoryFilter(sub.id);
                                      navigateTo('LIBRARY');
                                    }}
                                    className="px-1.5 py-0.5 rounded text-[7.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:text-white transition-all flex items-center gap-0.5"
                                  >
                                    <span>{sub.name}</span>
                                    <span className="opacity-60 text-[6.5px]">({subCount})</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {categories.filter(c => !c.parentId).length === 0 && (
                      <div className="col-span-full p-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-slate-400 text-[10px] font-medium">No categories created yet.</p>
                        {isAdmin && (
                          <button onClick={() => navigateTo('ADMIN')} className="mt-1 text-[9px] font-black text-blue-600 uppercase tracking-wider">
                            + Add Categories in Admin Panel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. FILE UPLOAD & PASTE AREA BELOW CATEGORIES */}
                <div className="pt-1">
                  {showPasteArea ? (
                    <div className="animate-in zoom-in-95 duration-300 space-y-3">
                       <div className={`p-4 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                          <div className="flex items-center justify-between mb-3 px-1">
                             <div>
                                <span className="text-[8.5px] font-black uppercase tracking-widest text-blue-600">Smart-Detection Area</span>
                                <p className="text-[7.5px] text-slate-400 font-bold uppercase mt-0.5">Paste JSON (Insta-Load) or Raw Text (AI Scan)</p>
                             </div>
                             <button onClick={() => setShowPasteArea(false)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><X size={16} /></button>
                          </div>
                          <textarea 
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            placeholder="Paste JSON or Study Text here... (Tip: If JSON has any wrong answer ticks, click 'Auto-Verify & Fix' below!)"
                            className={`w-full h-60 p-4 border rounded-2xl focus:ring-2 focus:ring-blue-500/10 outline-none text-xs font-medium transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                            <button 
                              onClick={handlePasteProcess}
                              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-black text-[8px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                            >
                              <Zap size={13} fill="currentColor" className="text-amber-400" /> Direct Process
                            </button>
                            <button 
                              onClick={handleAuditAndFixPastedJson}
                              disabled={isAuditingPastedJson}
                              className="py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-black text-[8px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <ShieldCheck size={13} className="text-emerald-300" /> Auto-Verify & Fix With AI
                            </button>
                          </div>
                       </div>
                    </div>
                  ) : (
                    <>
                      <FileUpload onFileSelect={handleFileSelect} isLoading={false} />
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                         <button 
                          onClick={() => setShowPasteArea(true)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-[8.5px] uppercase tracking-widest transition-all shadow-2xs ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                         >
                           <ClipboardList size={13} className="text-blue-500" /> Paste JSON / Text
                         </button>
                         <button 
                          onClick={loadDemoJson}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-[8.5px] uppercase tracking-widest transition-all shadow-2xs ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                         >
                           <Zap size={13} className="text-amber-500" /> Load Demo JSON
                         </button>
                         <button 
                          onClick={() => setShowJsonInfo(true)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-[8.5px] uppercase tracking-widest transition-all shadow-2xs ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                         >
                           <Brackets size={13} className="text-indigo-500" /> JSON Schema
                         </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {tab === 'ADMIN' && (
              <AdminPanel />
            )}

            {tab === 'AI_PROMPT' && (
              <div className="animate-in slide-in-from-bottom-4 pt-2">
                <h3 className="text-[11px] font-black mb-3 flex items-center gap-1.5 uppercase tracking-wider text-slate-400">Knowledge Architect <Dna className="text-blue-600" size={13} /></h3>
                
                {/* Generation Language Selector */}
                <div className="mb-3 animate-in slide-in-from-top duration-300">
                   <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center justify-between mb-2 px-1">
                         <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                           <Globe size={9} className="text-blue-500" /> Generation Language
                         </label>
                         <span className="text-[7px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.2 rounded-md">AI Active</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                         {['English', 'Hindi', 'Khortha', 'Bengali', 'Mixed (Hinglish)'].map(lang => (
                            <button
                               key={lang}
                               onClick={() => setAiLanguage(lang)}
                               className={`px-2.5 py-1 rounded-lg text-[8.5px] font-bold uppercase tracking-wider transition-all border ${
                                 aiLanguage === lang 
                                   ? 'bg-blue-600 text-white border-blue-500 shadow-2xs' 
                                   : isDarkMode 
                                     ? 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600' 
                                     : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                               }`}
                            >
                               {lang}
                            </button>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Generation Difficulty Selector */}
                <div className="mb-3 animate-in slide-in-from-top duration-300">
                   <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                      <div className="flex items-center justify-between mb-2 px-1">
                         <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                           <ShieldCheck size={9} className="text-emerald-500" /> Quiz Difficulty Level
                         </label>
                         <span className="text-[7px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.2 rounded-md capitalize">{quizDifficulty}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                         {[
                           { id: 'easy', label: 'Easy', desc: 'Basic Recall' },
                           { id: 'medium', label: 'Medium', desc: 'Comprehension' },
                           { id: 'hard', label: 'Hard', desc: 'Analysis & App' }
                         ].map(diff => (
                            <button
                               key={diff.id}
                               onClick={() => setQuizDifficulty(diff.id as any)}
                               className={`p-2 rounded-lg text-left transition-all border ${
                                 quizDifficulty === diff.id 
                                   ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-2xs' 
                                   : isDarkMode 
                                     ? 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600' 
                                     : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                               }`}
                            >
                               <div className="text-[8.5px] font-black uppercase tracking-wider">{diff.label}</div>
                               <div className={`text-[6.5px] mt-0.5 opacity-80 ${quizDifficulty === diff.id ? 'text-blue-100' : 'text-slate-400'}`}>{diff.desc}</div>
                            </button>
                         ))}
                      </div>
                   </div>
                </div>

                <div className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                   <div>
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Topic for Dynamic Learning</label>
                      <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g. History of Rome, React Hooks, Baking science..." className={`w-full h-24 p-2.5 border rounded-xl focus:ring-1 focus:ring-blue-500 outline-none text-xs font-medium transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                   </div>
                   <button onClick={handleAiQuizGenerate} disabled={!aiPrompt.trim()} className="w-full mt-3 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[8.5px] uppercase tracking-wider shadow-md active:scale-95 transition-all">Launch Session</button>
                </div>
              </div>
            )}

            {tab === 'LIBRARY' && (
               <div className="animate-in slide-in-from-bottom-4 pt-2">
                  <div className="flex flex-col gap-2.5 mb-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Learning Vault (Practice & Tests)</h3>
                      {/* Main Category Filter Pills */}
                      <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                        <button 
                          onClick={() => { setSelectedCategoryFilter('ALL'); setSelectedSubCategoryFilter('ALL'); }} 
                          className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${selectedCategoryFilter === 'ALL' ? 'bg-blue-600 text-white shadow-2xs' : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}
                        >
                          All Categories
                        </button>
                        {categories.filter(c => !c.parentId).map(c => (
                          <button 
                            key={c.id} 
                            onClick={() => { setSelectedCategoryFilter(c.id); setSelectedSubCategoryFilter('ALL'); }} 
                            className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${selectedCategoryFilter === c.id ? 'bg-blue-600 text-white shadow-2xs' : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sub-Category Filter Pills if Main Category selected */}
                    {selectedCategoryFilter !== 'ALL' && categories.filter(c => c.parentId === selectedCategoryFilter).length > 0 && (
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar border-t border-slate-100 dark:border-slate-800 pt-2">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mr-1">Subcategories:</span>
                        <button 
                          onClick={() => setSelectedSubCategoryFilter('ALL')} 
                          className={`px-2 py-0.5 rounded text-[7.5px] font-bold transition-all whitespace-nowrap ${selectedSubCategoryFilter === 'ALL' ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}
                        >
                          All
                        </button>
                        {categories.filter(c => c.parentId === selectedCategoryFilter).map(sub => (
                          <button 
                            key={sub.id} 
                            onClick={() => setSelectedSubCategoryFilter(sub.id)} 
                            className={`px-2 py-0.5 rounded text-[7.5px] font-bold transition-all whitespace-nowrap ${selectedSubCategoryFilter === sub.id ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {library
                      .filter(q => {
                        const matchesMainCat = selectedCategoryFilter === 'ALL' || q.categoryId === selectedCategoryFilter;
                        const matchesSubCat = selectedSubCategoryFilter === 'ALL' || q.subCategoryId === selectedSubCategoryFilter;
                        return matchesMainCat && matchesSubCat;
                      })
                      .map((q) => {
                        const catObj = categories.find(c => c.id === q.categoryId);
                        const subCatObj = categories.find(c => c.id === q.subCategoryId);
                        return (
                          <div key={q.id} className={`group p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-xs hover:border-blue-500 transition-all flex items-center gap-2 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                            <TopicImage 
                              title={q.title} 
                              customUrl={q.thumbnailUrl || catObj?.thumbnailUrl}
                              className="w-8 h-8 shrink-0 rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                            />
                            
                            <div className="flex-1 min-w-0">
                               {editingQuizId === q.id ? (
                                 <div className="flex items-center gap-1 my-0.5" onClick={e => e.stopPropagation()}>
                                   <input 
                                     type="text" 
                                     value={editingTitleText} 
                                     onChange={e => setEditingTitleText(e.target.value)} 
                                     className="w-full px-2 py-0.5 text-[10px] font-bold border rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                                   />
                                   <button onClick={(e) => saveRenameQuiz(q.id, e)} className="px-2 py-0.5 bg-blue-600 text-white rounded text-[8px] font-black uppercase tracking-wider shrink-0">Save</button>
                                 </div>
                               ) : (
                                 <div>
                                   <h4 className="font-bold text-[10px] sm:text-[10.5px] text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate" title={q.title}>{q.title}</h4>
                                   <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider">{q.questions.length} Qs</span>
                                      {catObj && (
                                        <span className="text-[6.5px] font-bold px-1 py-0.2 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                          {catObj.name}
                                        </span>
                                      )}
                                      {subCatObj && (
                                        <span className="text-[6.5px] font-bold px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                          {subCatObj.name}
                                        </span>
                                      )}
                                   </div>
                                 </div>
                               )}
                            </div>

                             <div className="flex items-center gap-1 shrink-0">
                               <button 
                                 onClick={() => handleInitiateQuiz(q)}
                                 className="px-2 py-0.5 bg-blue-600 text-white rounded-lg font-black text-[8px] uppercase tracking-wider hover:bg-blue-700 transition-all shadow-2xs active:scale-95 flex items-center gap-0.5"
                               >
                                 <Play size={8} fill="currentColor" /> Start
                               </button>
                               <div className="relative">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); setActiveMenuQuizId(activeMenuQuizId === q.id ? null : q.id); }}
                                   className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all"
                                   title="More Options"
                                 >
                                   <MoreVertical size={12} />
                                 </button>

                                 {activeMenuQuizId === q.id && (
                                   <div className="absolute right-0 top-full mt-1 w-40 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                                     <button 
                                       onClick={(e) => { 
                                         e.stopPropagation();
                                         setActiveMenuQuizId(null); 
                                         setAuditTargetQuiz(q);
                                         setShowAiAuditModal(true);
                                       }}
                                       className="w-full text-left px-2.5 py-1.5 text-[9.5px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-1.5"
                                     >
                                       <ShieldCheck size={11} /> AI Audit & Fix Keys
                                     </button>
                                     <button 
                                       onClick={(e) => { setActiveMenuQuizId(null); startRenameQuiz(q, e); }}
                                       className="w-full text-left px-2.5 py-1.5 text-[9.5px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
                                     >
                                       <Edit2 size={11} /> Rename
                                     </button>
                                     <button 
                                       onClick={(e) => { 
                                         setActiveMenuQuizId(null); 
                                         setTransferModalQuiz(q);
                                         setTransferCatId(q.categoryId || '');
                                         setTransferSubCatId(q.subCategoryId || '');
                                       }}
                                       className="w-full text-left px-2.5 py-1.5 text-[9.5px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-1.5"
                                     >
                                       <FolderPlus size={11} /> Transfer Category
                                     </button>
                                     <div className="h-px bg-slate-100 dark:bg-slate-800 my-0.5 mx-1.5" />
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setActiveMenuQuizId(null);
                                         setQuizToDelete(q.id);
                                       }} 
                                       className="w-full text-left px-2.5 py-1.5 text-[9.5px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1.5"
                                     >
                                       <Trash2 size={11} /> Delete Quiz
                                     </button>
                                   </div>
                                 )}
                               </div>
                            </div>
                          </div>
                        );
                      })}
                    {library.filter(q => {
                      const matchesMainCat = selectedCategoryFilter === 'ALL' || q.categoryId === selectedCategoryFilter;
                      const matchesSubCat = selectedSubCategoryFilter === 'ALL' || q.subCategoryId === selectedSubCategoryFilter;
                      return matchesMainCat && matchesSubCat;
                    }).length === 0 && (
                      <div className="col-span-full py-12 text-center opacity-40 text-[10px] font-bold uppercase tracking-widest">No quizzes found in this category...</div>
                    )}
                  </div>
               </div>
            )}

            {tab === 'SAVED' && (
               <div className="animate-in slide-in-from-bottom-4 pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mastery Pins</h3>
                    {bookmarks.length > 0 && <button onClick={startBookmarkPractice} className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-[8.5px] uppercase tracking-widest flex items-center gap-1 shadow-sm active:scale-95 transition-all"><Play size={11} fill="currentColor" /> Practice Session ({bookmarks.length})</button>}
                  </div>
                  <div className="space-y-2.5">
                    {bookmarks.map((b, i) => (
                      <div key={i} className={`p-3 sm:p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-2xs'}`}>
                         <div className="flex items-start justify-between gap-2 mb-2">
                           <h4 className="text-xs font-bold leading-snug">{b.question.question}</h4>
                           <button
                             onClick={() => {
                               setExplainModalQuestion(b.question);
                               setExplainModalUserSelected(null);
                               setShowAiExplainModal(true);
                             }}
                             className="px-2 py-0.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[8px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs active:scale-95 transition-all shrink-0"
                           >
                             <Sparkles size={10} className="text-amber-300" /> AI Explain
                           </button>
                         </div>
                         
                         {b.question.options && (
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 my-2">
                             {b.question.options.map((opt, optIdx) => (
                               <div 
                                 key={optIdx} 
                                 className={`p-1.5 rounded-lg text-[9.5px] flex items-center gap-1.5 border ${optIdx === b.question.correctAnswerIndex ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
                               >
                                 <span className="w-4 h-4 rounded flex items-center justify-center text-[7.5px] font-black bg-white dark:bg-slate-700 border shrink-0">
                                   {String.fromCharCode(65 + optIdx)}
                                 </span>
                                 <span className="truncate">{opt}</span>
                                 {optIdx === b.question.correctAnswerIndex && (
                                   <span className="ml-auto text-[7px] font-black uppercase text-emerald-600">Correct</span>
                                 )}
                               </div>
                             ))}
                           </div>
                         )}

                         {b.question.explanation && (
                           <p className="text-[9.5px] text-slate-500 dark:text-slate-400 italic border-l-2 border-blue-500 pl-2 py-0.5 leading-relaxed mt-1.5">{b.question.explanation}</p>
                         )}
                      </div>
                    ))}
                  </div>
               </div>
            )}
          </div>
        )}

        {appState === 'CONFIGURING_QUIZ' && (
           <div className="max-w-xl mx-auto animate-in slide-in-from-bottom-8">
              <div className={`p-10 md:p-14 rounded-[4rem] border shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-50'}`}>
                 <div className="flex items-center gap-5 mb-12">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-[2rem] flex items-center justify-center shadow-inner"><ShieldCheck size={32} /></div>
                    <div>
                       <h3 className="text-2xl font-black uppercase tracking-tight italic">AI Ready</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuration required</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6 mb-12">
                    <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-white shadow-inner'}`}>
                       <p className="text-4xl font-black text-blue-600">{scanInfo?.pages || 1}</p>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Units</p>
                    </div>
                    <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-white shadow-inner'}`}>
                       <p className="text-4xl font-black text-blue-600">~{scanInfo?.words || 0}</p>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Words</p>
                    </div>
                 </div>
                 <div className="space-y-4 mb-14">
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <label>AI Batch Size</label>
                       <span className="text-blue-600 font-black bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">{pdfQuestionCount} Items</span>
                    </div>
                    <input type="range" min="5" max="500" step="5" value={pdfQuestionCount} onChange={(e) => setPdfQuestionCount(parseInt(e.target.value))} className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none accent-blue-600 cursor-pointer" />
                 </div>
                 
                 {isAdmin && (
                   <div className="mb-14 p-6 border border-blue-500 rounded-3xl bg-blue-50/50 dark:bg-blue-900/20">
                      <h4 className="font-bold mb-4 flex items-center gap-2 text-xs uppercase tracking-wider"><Shield size={18}/> Admin Publishing</h4>
                      <input 
                        type="text" 
                        placeholder="Custom Test Name" 
                        value={adminQuizTitle}
                        onChange={e => setAdminQuizTitle(e.target.value)}
                        className="w-full p-4 mb-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                      />
                      <select 
                        value={adminCategoryId} 
                        onChange={e => { setAdminCategoryId(e.target.value); setAdminSubCategoryId(''); }}
                        className="w-full p-4 mb-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                      >
                        <option value="">-- No Official Category (Local Only) --</option>
                        {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>

                      {adminCategoryId && categories.filter(c => c.parentId === adminCategoryId).length > 0 && (
                        <select 
                          value={adminSubCategoryId} 
                          onChange={e => setAdminSubCategoryId(e.target.value)}
                          className="w-full p-4 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                        >
                          <option value="">-- Main Category Only --</option>
                          {categories.filter(c => c.parentId === adminCategoryId).map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                        </select>
                      )}
                      <p className="text-xs text-slate-500 mt-3">If a category is selected, this test will be published to all users.</p>
                   </div>
                 )}

                 <div className="flex gap-4">
                    <button onClick={restart} className="flex-1 py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-400">Discard</button>
                    <button onClick={startPdfGeneration} className="flex-[2] py-6 bg-blue-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-500/30 active:scale-95 transition-all">Generate AI Batch</button>
                 </div>
              </div>
           </div>
        )}

        {/* Resume or Start Fresh Modal */}
        {resumeModalSession && (
          <ResumeOrRestartModal
            session={resumeModalSession}
            onResume={() => resumePausedSession(resumeModalSession)}
            onStartFresh={() => startFreshFromPausedSession(resumeModalSession)}
            onClose={() => setResumeModalSession(null)}
            isDarkMode={isDarkMode}
          />
        )}

        {pendingQuizToStart && (
          <QuizConfigModal
            quizTitle={pendingQuizToStart.title}
            totalQuestions={pendingQuizToStart.questions.length}
            initialConfig={quizConfig}
            onStart={(config) => {
              setQuizConfig(config);
              let finalQuiz = pendingQuizToStart;
              if (config.shuffleQuestions && finalQuiz.questions.length > 0) {
                const shuffledQuestions = finalQuiz.questions.map(q => {
                  const options = [...q.options];
                  const correctOptionText = options[q.correctAnswerIndex];
                  
                  // Shuffle options using Fisher-Yates
                  for (let i = options.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [options[i], options[j]] = [options[j], options[i]];
                  }
                  
                  const newCorrectIndex = options.indexOf(correctOptionText);
                  return { ...q, options, correctAnswerIndex: newCorrectIndex };
                });

                // Shuffle questions order
                for (let i = shuffledQuestions.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
                }
                
                finalQuiz = { ...finalQuiz, questions: shuffledQuestions };
              }
              const seenIds = new Set<string>();
              const sanitizedQuestions = finalQuiz.questions.map(q => {
                let id = q.id;
                if (!id || seenIds.has(id)) {
                  id = crypto.randomUUID();
                }
                seenIds.add(id);
                return { ...q, id };
              });
              setQuiz({ ...finalQuiz, questions: sanitizedQuestions });
              setPendingQuizToStart(null);
              setAppState('QUIZ_IN_PROGRESS');
            }}
            onClose={() => setPendingQuizToStart(null)}
            isDarkMode={isDarkMode}
          />
        )}

        {(appState === 'PROCESSING_PDF' || appState === 'GENERATING_QUIZ') && <LoadingScreen stage={appState as any} />}

        {appState === 'QUIZ_IN_PROGRESS' && quiz && (
          <Quiz 
            quiz={quiz}
            quizConfig={quizConfig}
            onFinish={handleFinishQuiz} 
            onAbort={handleAbortQuiz} 
            onSaveAndExit={handleSaveAndExit}
            onSaveQuestion={handleBookmark}
            onUpdateQuiz={handleUpdateQuiz}
            onFetchNext={quiz.isInfinite ? handleFetchNextQuestion : undefined} 
            savedIds={new Set(bookmarks.map(b => b.question.id))} 
            timePerQuestion={quizConfig.timePerQuestion}
            initialQuestionIndex={pausedQuizState?.index || 0}
            initialAnswers={pausedQuizState?.answers || []}
            initialTimer={pausedQuizState?.timer || 0}
          />
        )}

        {appState === 'RESULTS' && results && quiz && (
          <TestSummary
            quiz={quiz}
            quizConfig={quizConfig}
            results={results}
            score={calculateScoreData()}
            isDarkMode={isDarkMode}
            onRestart={restart}
            onRetake={() => handleInitiateQuiz(quiz)}
            onRetakeIncorrect={(incorrectQs) => {
              const retryQuiz: QuizType = {
                ...quiz,
                id: 'retry-' + Date.now(),
                title: `Retry Weak Spots: ${quiz.title}`,
                questions: incorrectQs
              };
              handleInitiateQuiz(retryQuiz);
            }}
            onBookmark={handleBookmark}
            savedIds={new Set(bookmarks.map(b => b.question.id))}
            onExplain={(q, selectedIdx) => {
              setExplainModalQuestion(q);
              setExplainModalUserSelected(selectedIdx);
              setShowAiExplainModal(true);
            }}
          />
        )}

        {tab === 'LEADERBOARD' && appState === 'IDLE' && (
          <Leaderboard />
        )}

        {tab === 'SETTINGS' && appState === 'IDLE' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 max-w-2xl mx-auto">
            <div className="text-center space-y-2">
               <div className="w-16 h-16 rounded-[1.5rem] bg-blue-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20 mb-4">
                  <Settings size={32} />
               </div>
               <h2 className="text-2xl font-black tracking-tight dark:text-white uppercase">User Settings</h2>
               <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full inline-block">Infinity API Configuration</p>
            </div>

            <div className={`p-8 rounded-[3rem] border shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
               <div className="space-y-6">
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Zap size={12} className="text-amber-400" /> Multi-Key API Rotation
                     </label>
                     <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                        Add multiple <b>Gemini API Keys</b> here. The app will automatically <b>rotate</b> through them if one hits a limit, ensuring <b>Infinity</b> quiz generation without interruptions.
                     </p>
                     
                     <div className="flex gap-2 mb-6">
                        <input 
                           type="text" 
                           value={newKeyInput}
                           onChange={(e) => setNewKeyInput(e.target.value)}
                           placeholder="Paste Gemini API Key here..."
                           className={`flex-1 px-5 py-4 rounded-2xl text-xs font-bold border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                        />
                        <button 
                           onClick={addApiKey}
                           className="px-6 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/25 active:scale-95 transition-all h-[52px]"
                        >
                           Add
                        </button>
                     </div>

                     <div className="space-y-3">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Active Keys ({userApiKeys.length})</h4>
                        {userApiKeys.length === 0 ? (
                           <div className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                              <p className="text-[11px] text-slate-400 font-bold italic">No custom keys added. Using system default keys.</p>
                           </div>
                        ) : (
                           <div className="grid grid-cols-1 gap-2">
                              {userApiKeys.map((key, idx) => (
                                 <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
                                          <ShieldCheck size={16} />
                                       </div>
                                       <code className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                          {key.substring(0, 8)}••••••••{key.substring(key.length - 4)}
                                       </code>
                                    </div>
                                    <button 
                                       onClick={() => removeApiKey(idx)}
                                       className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  </div>

                  {/* GOOGLE DRIVE CLOUD SYNC & OFFLINE BACKUP CARD */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                     <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-blue-600/10 border border-blue-500/30">
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                                 <Cloud size={24} />
                              </div>
                              <div>
                                 <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    Google Drive Cloud Sync & Database
                                 </h4>
                                 <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                    {isDriveConnected ? '🟢 Connected to Google Drive' : '⚪ Not Connected'}
                                 </p>
                              </div>
                           </div>
                           <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                              Offline Available
                           </span>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                           Backup all your quizzes, test questions, mastery bookmarks, and settings directly to your <b>Google Drive</b> (`QuizFlash_Drive_Database.json`). Your data is synced to the cloud and stored locally for instant offline access.
                        </p>

                        {driveSyncMessage && (
                           <div className="mb-4 p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-[11px] font-bold text-blue-700 dark:text-blue-300 animate-in fade-in">
                              {driveSyncMessage}
                           </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                           {!isDriveConnected ? (
                              <button 
                                 onClick={handleConnectDrive}
                                 disabled={isDriveSyncing}
                                 className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                              >
                                 <Cloud size={16} /> {isDriveSyncing ? 'Connecting...' : 'Connect Google Drive'}
                              </button>
                           ) : (
                              <>
                                 <button 
                                    onClick={handleBackupToDrive}
                                    disabled={isDriveSyncing}
                                    className="flex-1 px-5 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                 >
                                    <CloudUpload size={16} /> {isDriveSyncing ? 'Syncing...' : 'Backup to Drive'}
                                 </button>
                                 <button 
                                    onClick={handleRestoreFromDrive}
                                    disabled={isDriveSyncing}
                                    className="flex-1 px-5 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                 >
                                    <CloudDownload size={16} /> {isDriveSyncing ? 'Syncing...' : 'Restore from Drive'}
                                 </button>
                              </>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* DUAL PERSISTENCE: PHONE STORAGE & MONGODB SYNC CARD */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                     <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-blue-600/10 border border-indigo-500/30">
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                 <Smartphone size={24} />
                              </div>
                              <div>
                                 <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    Phone Storage & MongoDB Dual-Sync
                                 </h4>
                                 <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                    {storagePermissionGranted ? '🟢 Phone Storage Active' : '⚪ Permission Pending'}
                                 </p>
                              </div>
                           </div>
                           <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 text-[9px] font-black uppercase tracking-widest border border-indigo-500/20">
                              Offline First
                           </span>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                           Aapka data dono jagah safe rehta hai: <b>Phone Storage</b> (instant offline tests) aur <b>MongoDB Cloud Database</b> (safe cloud backup). Phone storage permission allow karne par device memory me high-speed caching activate ho jaati hai.
                        </p>

                        <button 
                           onClick={() => setShowPhoneStorageModal(true)}
                           className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/25 hover:from-indigo-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                           <Database size={16} /> Open Phone Storage & Sync Manager
                        </button>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                     <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                        <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                           <h5 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-tight mb-1">Privacy & Security</h5>
                           <p className="text-[10px] text-amber-600/80 dark:text-amber-500/80 leading-relaxed">
                              Your API keys are stored <b>locally</b> on your device. They are never sent to our servers. Keys are only used to make requests directly to Google Gemini.
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* JSON FORMAT MODAL */}
      {showJsonInfo && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-2xl p-8 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 relative animate-in zoom-in-95 duration-300">
              <button onClick={() => setShowJsonInfo(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500 p-2"><X size={24} /></button>
              <h4 className="text-xl font-black mb-2 text-slate-900 dark:text-white uppercase italic">Zero-API JSON Format</h4>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-6">Upload or Paste this format to load instantly.</p>
              
              <div className="bg-slate-950 p-6 rounded-[2rem] font-mono text-xs text-blue-400 overflow-x-auto border-2 border-slate-800 custom-scrollbar">
                 <pre className="whitespace-pre-wrap">{jsonTemplate}</pre>
              </div>

              <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-900/30 flex gap-4">
                 <div className="shrink-0 p-3 bg-blue-600 text-white rounded-2xl h-fit"><Info size={16} /></div>
                 <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    <span className="text-blue-600 font-bold block mb-1">How it works:</span>
                    If you paste content that matches this JSON structure, the app will <span className="text-blue-600 font-bold underline">automatically skip the AI API</span> and load your questions directly. Perfect for custom quizzes.
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* TRANSFER CATEGORY MODAL */}
      {transferModalQuiz && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 relative animate-in zoom-in-95 duration-300">
              <button onClick={() => setTransferModalQuiz(null)} className="absolute top-6 right-6 text-slate-400 hover:text-red-500 p-2"><X size={20} /></button>
              
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl"><FolderPlus size={22} /></div>
                 <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">Transfer Category</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[220px]">{transferModalQuiz.title}</p>
                 </div>
              </div>

              <div className="space-y-4 mb-6">
                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Main Category</label>
                    <select 
                      value={transferCatId} 
                      onChange={e => { setTransferCatId(e.target.value); setTransferSubCatId(''); }}
                      className="w-full p-3.5 border rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Unassigned (No Category) --</option>
                      {categories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>

                 {transferCatId && categories.filter(c => c.parentId === transferCatId).length > 0 && (
                   <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Sub-Category</label>
                      <select 
                        value={transferSubCatId} 
                        onChange={e => setTransferSubCatId(e.target.value)}
                        className="w-full p-3.5 border rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Main Category Only --</option>
                        {categories.filter(c => c.parentId === transferCatId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                   </div>
                 )}
              </div>

              <div className="flex gap-3">
                 <button 
                   onClick={() => setTransferModalQuiz(null)} 
                   className="flex-1 py-3.5 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={() => transferQuizCategory(transferModalQuiz.id, transferCatId, transferSubCatId)} 
                   className="flex-1 py-3.5 rounded-2xl text-xs font-bold bg-blue-600 text-white shadow-lg hover:bg-blue-700"
                 >
                   Save Transfer
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* PHONE STORAGE & PERSISTENCE MODAL */}
      {showPhoneStorageModal && (
        <PhoneStorageModal
          isOpen={showPhoneStorageModal}
          onClose={() => setShowPhoneStorageModal(false)}
          isDarkMode={isDarkMode}
          library={library}
          bookmarks={bookmarks}
          categories={categories}
          onPermissionChanged={(granted) => {
            setStoragePermissionGranted(granted);
            if (granted) {
              setSuccessMessage("✓ Phone Storage Permission Active! Quizzes will load instantly offline.");
              setTimeout(() => setSuccessMessage(null), 4000);
            }
          }}
          onDataImported={handleDataImported}
          onForceSync={async () => {
            await fetchQuizzes();
            await fetchCategories();
            setSuccessMessage("✓ Dual-Sync completed with MongoDB & Local Storage!");
            setTimeout(() => setSuccessMessage(null), 4000);
          }}
        />
      )}

      {/* AI AUDIT & FIX MODAL */}
      {showAiAuditModal && auditTargetQuiz && (
        <AiAuditModal
          isOpen={showAiAuditModal}
          onClose={() => {
            setShowAiAuditModal(false);
            setAuditTargetQuiz(null);
          }}
          quiz={auditTargetQuiz}
          isDarkMode={isDarkMode}
          onApplyFixedQuiz={(updatedQuiz) => {
            // If quiz exists in library, update it
            const existingIdx = library.findIndex(l => l.quiz.id === updatedQuiz.id);
            if (existingIdx !== -1) {
              const updatedLib = [...library];
              updatedLib[existingIdx] = {
                ...updatedLib[existingIdx],
                quiz: updatedQuiz
              };
              setLibrary(updatedLib);
              localStorage.setItem('quizzly_library', JSON.stringify(updatedLib));
            } else {
              // If it's a newly audited quiz (e.g. from pasted JSON), add it to library
              const newStored: StoredQuiz = {
                quiz: updatedQuiz,
                savedAt: Date.now()
              };
              const updatedLib = [newStored, ...library];
              setLibrary(updatedLib);
              localStorage.setItem('quizzly_library', JSON.stringify(updatedLib));
            }

            if (activeQuiz && activeQuiz.id === updatedQuiz.id) {
              setActiveQuiz(updatedQuiz);
            }
            setSuccessMessage(`✓ AI Audit applied! ${updatedQuiz.questions.length} questions verified & updated.`);
            setTimeout(() => setSuccessMessage(null), 4000);
          }}
        />
      )}

      {/* AI INSTANT EXPLANATION MODAL */}
      {showAiExplainModal && explainModalQuestion && (
        <AiExplainModal
          isOpen={showAiExplainModal}
          onClose={() => {
            setShowAiExplainModal(false);
            setExplainModalQuestion(null);
            setExplainModalUserSelected(null);
          }}
          question={explainModalQuestion}
          userSelectedOption={explainModalUserSelected}
          isDarkMode={isDarkMode}
        />
      )}

      {appState === 'IDLE' && (
        <nav className={`fixed bottom-4 left-1/2 -translate-x-1/2 backdrop-blur-xl border px-3 py-2.5 sm:py-3 rounded-3xl shadow-2xl shadow-blue-500/15 flex items-center gap-1.5 sm:gap-2 z-[90] ${isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'}`}>
           <TabButton active={tab === 'HOME'} onClick={() => navigateTo('HOME')} icon={<Home />} label="Home" isDarkMode={isDarkMode} />
           <TabButton active={tab === 'AI_PROMPT'} onClick={() => navigateTo('AI_PROMPT')} icon={<Sparkles />} label="Forge" isDarkMode={isDarkMode} />
           <TabButton active={tab === 'LIBRARY'} onClick={() => navigateTo('LIBRARY')} icon={<LayoutGrid />} label="Library" isDarkMode={isDarkMode} />
           <TabButton active={tab === 'SAVED'} onClick={() => navigateTo('SAVED')} icon={<Bookmark />} label="Vault" isDarkMode={isDarkMode} />
           <TabButton active={tab === 'LEADERBOARD'} onClick={() => navigateTo('LEADERBOARD')} icon={<Trophy />} label="Rank" isDarkMode={isDarkMode} />
           {isAdmin && (
             <TabButton active={tab === 'ADMIN'} onClick={() => navigateTo('ADMIN')} icon={<Shield />} label="Admin" isDarkMode={isDarkMode} />
           )}
        </nav>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label, isDarkMode }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/20' : isDarkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
    {React.cloneElement(icon, { size: 18, fill: active ? "currentColor" : "none" })}
    <span className={`${active ? 'inline' : 'hidden md:inline'}`}>{label}</span>
  </button>
);

export default App;
