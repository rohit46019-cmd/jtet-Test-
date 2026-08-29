import React, { useState, useEffect } from 'react';
import { Category, Quiz } from '../types';
import { 
  Trash2, Plus, Edit2, Check, X, Users, BookOpen, Shield, Trophy, 
  FolderPlus, Tag, Image as ImageIcon, Timer, Target, Save, 
  CheckCircle2, AlertTriangle, MessageSquare, Sparkles,
  ChevronLeft, ChevronRight, HelpCircle
} from 'lucide-react';
import { getTopicThumbnail, TopicImage } from '../lib/thumbnailHelper';

interface AdminPanelProps {
  categories?: Category[];
  onCategoriesUpdated?: (cats: Category[]) => void;
}

export default function AdminPanel({ categories: externalCategories, onCategoriesUpdated }: AdminPanelProps = {}) {
  const [categories, setCategories] = useState<Category[]>(externalCategories && externalCategories.length > 0 ? externalCategories : []);
  const [users, setUsers] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'categories' | 'users' | 'quizzes' | 'settings' | 'reports'>('categories');
  const [newCatName, setNewCatName] = useState('');
  const [newCatThumbnail, setNewCatThumbnail] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📁');
  const [parentCategoryId, setParentCategoryId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editIcon, setEditIcon] = useState('📁');
  const [editingUserPts, setEditingUserPts] = useState<{ id: string; points: number } | null>(null);

  const predefinedIcons = ['📁', '🌍', '⚛️', '📜', '⚖️', '📍', '🔬', '🧪', '💻', '📐', '🧬', '🚀', '🎨', '🎶', '🧠', '📈', '🏥', '⚽', '🌱', '⚙️', '📚'];

  // Inline Subcategory Creation state
  const [addingSubToCatId, setAddingSubToCatId] = useState<string | null>(null);
  const [newSubCatName, setNewSubCatName] = useState('');
  const [newSubCatThumbnail, setNewSubCatThumbnail] = useState('');

  // Category Search & Filter
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [seedingLoading, setSeedingLoading] = useState(false);

  // Editing a reported question states
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [editQText, setEditQText] = useState('');
  const [editQOptions, setEditQOptions] = useState<string[]>(['', '', '', '']);
  const [editQCorrectIndex, setEditQCorrectIndex] = useState<number>(0);
  const [editQExplanation, setEditQExplanation] = useState('');
  const [isSavingReportEdit, setIsSavingReportEdit] = useState(false);

  // Quiz Rules Settings (Admin Only)
  const [positiveMarks, setPositiveMarks] = useState<number>(1);
  const [negativeMarks, setNegativeMarks] = useState<number>(0.25);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(0); // seconds
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Pagination States
  const [categoriesPage, setCategoriesPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [quizzesPage, setQuizzesPage] = useState(1);
  const [reportsPage, setReportsPage] = useState(1);
  const ITEMS_PER_PAGE = 6; // Compact list length

  const generateSafeId = (prefix = 'cat') => {
    if (typeof crypto !== 'undefined' && crypto?.randomUUID) {
      return crypto.randomUUID();
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  useEffect(() => {
    if (externalCategories && externalCategories.length > 0) {
      setCategories(externalCategories);
    }
  }, [externalCategories]);

  useEffect(() => {
    fetchAll();
    fetchQuizConfig();
  }, []);

  const syncCategories = (updatedCats: Category[]) => {
    setCategories(updatedCats);
    localStorage.setItem('qf_categories', JSON.stringify(updatedCats));
    if (onCategoriesUpdated) {
      onCategoriesUpdated(updatedCats);
    }
  };

  const fetchQuizConfig = async () => {
    try {
      const res = await fetch('/api/settings/quiz_config');
      if (res.ok) {
        const data = await res.json();
        if (data.positiveMarks !== undefined) setPositiveMarks(Number(data.positiveMarks));
        if (data.negativeMarks !== undefined) setNegativeMarks(Number(data.negativeMarks));
        if (data.timePerQuestion !== undefined) setTimePerQuestion(Number(data.timePerQuestion));
      }
    } catch (e) {
      console.error("Failed to load quiz config", e);
    }
  };

  const handleSaveQuizConfig = async () => {
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      await fetch('/api/settings/quiz_config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positiveMarks: Number(positiveMarks),
          negativeMarks: Number(negativeMarks),
          timePerQuestion: Number(timePerQuestion),
        })
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Failed to save quiz config", e);
    }
    setSavingSettings(false);
  };

  const fetchAll = async () => {
    try {
      const [catRes, userRes, quizRes, reportRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/users'),
        fetch('/api/quizzes'),
        fetch('/api/reports')
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData && Array.isArray(catData) && catData.length > 0) {
          syncCategories(catData);
        } else {
          // Check local storage if empty
          const savedCats = localStorage.getItem('qf_categories');
          if (savedCats) {
            const parsed = JSON.parse(savedCats);
            if (parsed.length > 0) syncCategories(parsed);
          }
        }
      }
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsers(userData);
      }
      if (quizRes.ok) {
        const quizData = await quizRes.json();
        setQuizzes(quizData);
        localStorage.setItem('qf_lib_v4', JSON.stringify(quizData));
      }
      if (reportRes && reportRes.ok) {
        const reportData = await reportRes.json();
        setReports(reportData);
      }
    } catch (e) {
      console.error("Admin fetch error, checking local fallback:", e);
      const savedCats = localStorage.getItem('qf_categories');
      if (savedCats) syncCategories(JSON.parse(savedCats));
      const savedLib = localStorage.getItem('qf_lib_v4');
      if (savedLib) setQuizzes(JSON.parse(savedLib));
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setLoading(true);
    const thumb = newCatThumbnail.trim() || getTopicThumbnail(newCatName.trim());
    const newCat = {
      id: generateSafeId(parentCategoryId ? 'sub' : 'cat'),
      name: newCatName.trim(),
      parentId: parentCategoryId ? String(parentCategoryId).trim() : null,
      thumbnailUrl: thumb,
      icon: newCatIcon,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      createdAt: Date.now()
    };

    // Instant local UI
    const updated = [...categories, newCat];
    syncCategories(updated);

    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat)
      });
      setNewCatName('');
      setNewCatThumbnail('');
      setNewCatIcon('📁');
      setParentCategoryId('');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCreateSubCategory = async (parentId: string) => {
    if (!newSubCatName.trim()) return;
    setLoading(true);
    const thumb = newSubCatThumbnail.trim() || getTopicThumbnail(newSubCatName.trim());
    const newSubCat = {
      id: generateSafeId('sub'),
      name: newSubCatName.trim(),
      parentId: String(parentId).trim(),
      thumbnailUrl: thumb,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      createdAt: Date.now()
    };

    const updated = [...categories, newSubCat];
    syncCategories(updated);

    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubCat)
      });
      setNewSubCatName('');
      setNewSubCatThumbnail('');
      setAddingSubToCatId(null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSeedDefaultCategories = async () => {
    setSeedingLoading(true);
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          syncCategories(data);
        }
      }
    } catch (e) {
      console.error('Failed to reload starter categories:', e);
    }
    setSeedingLoading(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete category? All subcategories will also be affected.')) return;
    const updated = categories.filter(c => c.id !== id && c.parentId !== id);
    syncCategories(updated);

    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editName.trim()) return;
    const updated = categories.map(c => c.id === id ? {
      ...c,
      name: editName.trim(),
      thumbnailUrl: editThumbnail.trim() || getTopicThumbnail(editName.trim()),
      icon: editIcon
    } : c);
    syncCategories(updated);
    setEditingId(null);

    try {
      await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          thumbnailUrl: editThumbnail.trim() || getTopicThumbnail(editName.trim()),
          icon: editIcon
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignQuizCategory = async (quizId: string, categoryId: string, subCategoryId: string = '') => {
    setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, categoryId, subCategoryId } : q));
    const savedLib = localStorage.getItem('qf_lib_v4');
    if (savedLib) {
      const lib = JSON.parse(savedLib);
      const updated = lib.map((q: any) => q.id === quizId ? { ...q, categoryId, subCategoryId } : q);
      localStorage.setItem('qf_lib_v4', JSON.stringify(updated));
    }

    try {
      await fetch(`/api/quizzes/${quizId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: categoryId || '', subCategoryId: subCategoryId || '' })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm('Delete public quiz from MongoDB cloud?')) return;
    const updated = quizzes.filter(q => q.id !== id);
    setQuizzes(updated);
    localStorage.setItem('qf_lib_v4', JSON.stringify(updated));

    try {
      await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePoints = async (userId: string, pts: number) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, totalPoints: Number(pts) } : u));
    setEditingUserPts(null);
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalPoints: Number(pts) })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete user profile?')) return;
    setUsers(prev => prev.filter(u => u.id !== userId));
    try {
      await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const startEditingReport = (report: any) => {
    setEditingReportId(report.id);
    setEditQText(report.questionText);
    setEditQOptions(report.options && report.options.length ? [...report.options] : ['', '', '', '']);
    setEditQCorrectIndex(report.correctAnswerIndex ?? 0);
    setEditQExplanation(report.explanation || '');
  };

  const cancelEditingReport = () => {
    setEditingReportId(null);
    setEditQText('');
    setEditQOptions(['', '', '', '']);
    setEditQCorrectIndex(0);
    setEditQExplanation('');
  };

  const handleSaveReportEdit = async (report: any) => {
    setIsSavingReportEdit(true);
    try {
      const quizToEdit = quizzes.find(q => q.id === report.quizId);
      if (!quizToEdit) {
        alert('Quiz not found. It might have been deleted.');
        setIsSavingReportEdit(false);
        return;
      }

      const updatedQuestions = quizToEdit.questions.map((q: any) => {
        if (q.id === report.questionId || q.question === report.questionText) {
          return {
            ...q,
            question: editQText,
            options: editQOptions,
            correctAnswerIndex: editQCorrectIndex,
            explanation: editQExplanation
          };
        }
        return q;
      });

      const updatedQuiz = {
        ...quizToEdit,
        questions: updatedQuestions,
        updatedAt: Date.now()
      };

      const saveRes = await fetch(`/api/quizzes/${report.quizId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedQuiz)
      });

      if (saveRes.ok) {
        await fetch(`/api/reports/${report.id}`, {
          method: 'DELETE'
        });

        const savedLib = localStorage.getItem('qf_lib_v4');
        if (savedLib) {
          const lib = JSON.parse(savedLib);
          const updatedLib = lib.map((q: any) => q.id === report.quizId ? updatedQuiz : q);
          localStorage.setItem('qf_lib_v4', JSON.stringify(updatedLib));
        }

        await fetchAll();
        setEditingReportId(null);
      } else {
        alert('Failed to save updated quiz.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    } finally {
      setIsSavingReportEdit(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Resolve and dismiss this report?')) return;
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setReports(prev => prev.filter(r => r.id !== reportId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Robust category hierarchy detection
  const isMainCat = (c: any) => !c.parentId || c.parentId === '' || c.parentId === 'null' || c.parentId === null || c.parentId === undefined;
  const mainCategories = categories.filter(isMainCat);
  const getSubCategories = (catId: string) => categories.filter((c: any) => c.parentId && String(c.parentId).trim() === String(catId).trim());
  const orphanedSubCategories = categories.filter((c: any) => !isMainCat(c) && !mainCategories.some(m => String(m.id).trim() === String(c.parentId).trim()));
  const totalSubCategoriesCount = categories.length - mainCategories.length;

  // Filtered by search query if any
  const filteredMainCategories = categorySearchQuery.trim()
    ? mainCategories.filter(cat => {
        const q = categorySearchQuery.toLowerCase();
        const subs = getSubCategories(cat.id);
        return cat.name.toLowerCase().includes(q) || subs.some(s => s.name.toLowerCase().includes(q));
      })
    : mainCategories;

  // Dynamic Pagination Computing
  const activeCategoriesPage = Math.min(categoriesPage, Math.max(1, Math.ceil(filteredMainCategories.length / ITEMS_PER_PAGE)));
  const paginatedMainCategories = filteredMainCategories.slice((activeCategoriesPage - 1) * ITEMS_PER_PAGE, activeCategoriesPage * ITEMS_PER_PAGE);

  const activeUsersPage = Math.min(usersPage, Math.max(1, Math.ceil(users.length / ITEMS_PER_PAGE)));
  const paginatedUsers = users.slice((activeUsersPage - 1) * ITEMS_PER_PAGE, activeUsersPage * ITEMS_PER_PAGE);

  const activeQuizzesPage = Math.min(quizzesPage, Math.max(1, Math.ceil(quizzes.length / ITEMS_PER_PAGE)));
  const paginatedQuizzes = quizzes.slice((activeQuizzesPage - 1) * ITEMS_PER_PAGE, activeQuizzesPage * ITEMS_PER_PAGE);

  const activeReportsPage = Math.min(reportsPage, Math.max(1, Math.ceil(reports.length / 4)));
  const paginatedReports = reports.slice((activeReportsPage - 1) * 4, activeReportsPage * 4);

  // Elegant Mini Paginator UI Component
  const renderPagination = (currentPage: number, totalItems: number, onPageChange: (p: number) => void, itemsPerPage = ITEMS_PER_PAGE) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] select-text">
        <span className="text-slate-400 font-bold uppercase tracking-wider">
          Page {currentPage} of {totalPages} ({totalItems} total)
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Previous Page"
          >
            <ChevronLeft size={12} />
          </button>
          
          <div className="flex items-center gap-0.5">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pNum = idx + 1;
              if (totalPages > 5 && Math.abs(pNum - currentPage) > 1 && pNum !== 1 && pNum !== totalPages) {
                if (pNum === 2 || pNum === totalPages - 1) {
                  return <span key={pNum} className="px-0.5 text-slate-400 font-bold">.</span>;
                }
                return null;
              }
              return (
                <button
                  key={pNum}
                  onClick={() => onPageChange(pNum)}
                  className={`w-4.5 h-4.5 rounded text-[9px] font-black flex items-center justify-center transition-all ${currentPage === pNum ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-500 dark:text-slate-400'}`}
                >
                  {pNum}
                </button>
              );
            })}
          </div>

          <button
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Next Page"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-2 sm:p-3 animate-in fade-in duration-200 pb-16 select-text text-slate-800 dark:text-slate-200">
      {/* Mini Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black uppercase tracking-tight flex items-center gap-1.5 text-slate-900 dark:text-white">
            <Shield className="text-blue-600" size={20} /> Admin Control Center
          </h2>
          <p className="text-slate-400 text-[9px] uppercase tracking-wider mt-0.5">MongoDB Live Database • Rules, Categories, Users & Flagged Audits</p>
        </div>

        {/* Small Tabs Menu */}
        <div className="w-full sm:w-auto flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg gap-0.5 overflow-x-auto scrollbar-hide no-scrollbar self-stretch sm:self-auto">
          {(['categories', 'users', 'quizzes', 'reports', 'settings'] as const).map((tab) => {
            const isActive = activeTab === tab;
            let label = tab.toUpperCase();
            if (tab === 'categories') label = `Cats (${categories.length})`;
            if (tab === 'users') label = `Users (${users.length})`;
            if (tab === 'quizzes') label = `Quizzes (${quizzes.length})`;
            if (tab === 'reports') label = `Reports (${reports.length})`;
            if (tab === 'settings') label = `Rules`;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${isActive ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                {tab === 'reports' && <AlertTriangle size={10} className={isActive ? 'text-white' : 'text-rose-500'} />}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mini Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-2.5 rounded-xl shadow-2xs flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0">
            <Users size={14} />
          </div>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">{users.length}</div>
            <div className="text-[8px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">Live Users</div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-2.5 rounded-xl shadow-2xs flex items-center gap-2">
          <div className="w-7 h-7 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen size={14} />
          </div>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">{quizzes.length}</div>
            <div className="text-[8px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">Cloud Quizzes</div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-2.5 rounded-xl shadow-2xs flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
            <Trophy size={14} />
          </div>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">{categories.length}</div>
            <div className="text-[8px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">Categories</div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-2.5 rounded-xl shadow-2xs flex items-center gap-2">
          <div className="w-7 h-7 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center shrink-0">
            <AlertTriangle size={14} />
          </div>
          <div>
            <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">{reports.length}</div>
            <div className="text-[8px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">Reports</div>
          </div>
        </div>
      </div>

      {/* TAB CONTENT: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-3.5">
          {/* Create category box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <FolderPlus size={13} className="text-blue-500" /> Create Category / Sub-Category
              </h3>
              <span className="text-[9px] font-bold text-slate-400">
                {mainCategories.length} Main • {totalSubCategoriesCount} Sub-Categories
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5 flex gap-2">
                <select
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="w-12 px-1 text-center text-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  title="Select Icon"
                >
                  {predefinedIcons.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
                <input 
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category Name (e.g. Science)"
                  className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={parentCategoryId}
                onChange={(e) => setParentCategoryId(e.target.value)}
                className="sm:col-span-5 px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-750 dark:text-slate-250 focus:outline-none focus:border-blue-500"
              >
                <option value="">Main Category (Top Level)</option>
                {mainCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>↳ Sub-category of: {cat.name}</option>
                ))}
              </select>
              <button 
                onClick={handleCreateCategory}
                disabled={loading || !newCatName.trim()}
                className="sm:col-span-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
              >
                <Plus size={13} /> Create
              </button>
            </div>
          </div>

          {/* Categories Grid List with Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl p-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <BookOpen size={13} className="text-blue-500" /> Manage Category Architecture
                </h3>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                  Organize quiz categories and create nested subcategories for focused practice.
                </p>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <input
                  type="text"
                  value={categorySearchQuery}
                  onChange={(e) => { setCategorySearchQuery(e.target.value); setCategoriesPage(1); }}
                  placeholder="Filter categories..."
                  className="px-2.5 py-1 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex-1 sm:w-40 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSeedDefaultCategories}
                  disabled={seedingLoading}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 transition-colors"
                  title="Reload starter categories if list is empty"
                >
                  <Sparkles size={11} className="text-amber-500" /> {seedingLoading ? 'Loading...' : 'Seed Starter Cats'}
                </button>
              </div>
            </div>

            {/* Categories List */}
            <div className="space-y-2.5">
              {paginatedMainCategories.map(cat => {
                const subs = getSubCategories(cat.id);
                const isAddingSub = addingSubToCatId === cat.id;

                return (
                  <div key={cat.id} className="p-3 border border-slate-150 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-800/20 space-y-2.5 transition-all hover:border-slate-250 dark:hover:border-slate-750">
                    {/* Category Header */}
                    <div className="flex items-center justify-between gap-2">
                      {editingId === cat.id ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 flex-1 mr-2">
                          <select
                            value={editIcon}
                            onChange={(e) => setEditIcon(e.target.value)}
                            className="w-12 px-1 text-center text-lg rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                          >
                            {predefinedIcons.map(icon => (
                              <option key={icon} value={icon}>{icon}</option>
                            ))}
                          </select>
                          <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-blue-500 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                            placeholder="Category name"
                            autoFocus
                          />
                          <input 
                            type="text" 
                            value={editThumbnail}
                            onChange={(e) => setEditThumbnail(e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                            placeholder="Thumbnail URL (Optional)"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => handleUpdateCategory(cat.id)} className="text-green-600 bg-green-50 dark:bg-green-950/40 p-1.5 hover:bg-green-100 rounded-lg"><Check size={14} /></button>
                            <button onClick={() => setEditingId(null)} className="text-red-500 bg-red-50 dark:bg-red-950/40 p-1.5 hover:bg-red-100 rounded-lg"><X size={14} /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2.5 min-w-0">
                          <TopicImage 
                            title={cat.name}
                            customUrl={cat.thumbnailUrl} 
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-bold text-slate-900 dark:text-white truncate">{cat.name}</span>
                              <span className="text-[8px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shrink-0">
                                {subs.length} Sub-Cat{subs.length === 1 ? '' : 's'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {editingId !== cat.id && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              if (isAddingSub) {
                                setAddingSubToCatId(null);
                                setNewSubCatName('');
                              } else {
                                setAddingSubToCatId(cat.id);
                                setNewSubCatName('');
                              }
                            }}
                            className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                              isAddingSub 
                                ? 'bg-blue-600 text-white shadow-xs' 
                                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 border border-blue-100 dark:border-blue-900/40'
                            }`}
                            title="Add a subcategory directly under this category"
                          >
                            <Plus size={11} /> Sub-Category
                          </button>
                          <button 
                            onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditThumbnail(cat.thumbnailUrl || ''); setEditIcon(cat.icon || '📁'); }} 
                            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
                            title="Edit Category"
                          ><Edit2 size={12} /></button>
                          <button 
                            onClick={() => handleDeleteCategory(cat.id)} 
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                            title="Delete Category"
                          ><Trash2 size={12} /></button>
                        </div>
                      )}
                    </div>

                    {/* Inline Quick Add Subcategory Form */}
                    {isAddingSub && (
                      <div className="flex flex-col sm:flex-row items-center gap-1.5 p-2 bg-blue-50/70 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800/60 animate-in fade-in duration-150">
                        <input
                          type="text"
                          value={newSubCatName}
                          onChange={(e) => setNewSubCatName(e.target.value)}
                          placeholder={`Enter sub-category name under ${cat.name}...`}
                          className="flex-1 w-full px-2.5 py-1 text-xs font-semibold rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateSubCategory(cat.id);
                          }}
                        />
                        <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                          <button
                            onClick={() => handleCreateSubCategory(cat.id)}
                            disabled={loading || !newSubCatName.trim()}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                          >
                            <Plus size={11} /> Add Sub
                          </button>
                          <button
                            onClick={() => { setAddingSubToCatId(null); setNewSubCatName(''); }}
                            className="px-2 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-[10px] font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Subcategories List */}
                    {subs.length > 0 && (
                      <div className="pl-4 space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/40">
                        {subs.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs">
                            {editingId === sub.id ? (
                              <div className="flex items-center gap-1.5 flex-1 mr-2">
                                <input 
                                  type="text" 
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="flex-1 px-2 py-0.5 text-xs rounded border border-blue-500 bg-transparent font-medium"
                                  autoFocus
                                />
                                <button onClick={() => handleUpdateCategory(sub.id)} className="text-green-500 p-0.5"><Check size={13} /></button>
                                <button onClick={() => setEditingId(null)} className="text-red-500 p-0.5"><X size={13} /></button>
                              </div>
                            ) : (
                              <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span> 
                                <span className="truncate">{sub.name}</span>
                                <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest shrink-0">(Sub)</span>
                              </div>
                            )}

                            {editingId !== sub.id && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => { setEditingId(sub.id); setEditName(sub.name); }} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 size={11} /></button>
                                <button onClick={() => handleDeleteCategory(sub.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={11} /></button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Orphaned subcategories section if any */}
              {orphanedSubCategories.length > 0 && (
                <div className="p-3 border border-amber-200 dark:border-amber-900/50 rounded-xl bg-amber-50/30 dark:bg-amber-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Unassigned Sub-Categories ({orphanedSubCategories.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {orphanedSubCategories.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between py-1 px-2 bg-white dark:bg-slate-900 rounded-lg border border-amber-100 dark:border-amber-900/30 text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{sub.name}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDeleteCategory(sub.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={11} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {filteredMainCategories.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {categorySearchQuery ? 'No categories matching search' : 'No Categories Created Yet'}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Create your first category above, or seed default categories instantly.
                    </p>
                  </div>
                  <button
                    onClick={handleSeedDefaultCategories}
                    disabled={seedingLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <Sparkles size={13} /> {seedingLoading ? 'Setting up...' : 'Seed Starter Categories'}
                  </button>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {renderPagination(activeCategoriesPage, filteredMainCategories.length, setCategoriesPage)}
          </div>
        </div>
      )}

      {/* TAB CONTENT: USERS */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl p-3 shadow-2xs">
          <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-500">Manage Registered Users</h3>
          <div className="space-y-1.5">
            {paginatedUsers.map(u => (
              <div key={u.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/30 dark:bg-slate-800/15 gap-2">
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span className="text-slate-800 dark:text-slate-100">{u.name || u.email?.split('@')[0] || 'User'}</span>
                    {u.role === 'admin' && <span className="bg-blue-55 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 text-[8px] px-1.5 py-0.5 rounded uppercase tracking-widest font-black">Admin</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono leading-tight">{u.email}</div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    {editingUserPts?.id === u.id ? (
                      <div className="flex items-center gap-1">
                        <input 
                          type="number"
                          value={editingUserPts.points}
                          onChange={(e) => setEditingUserPts({ id: u.id, points: Number(e.target.value) })}
                          className="w-12 p-0.5 text-[11px] rounded border border-blue-500 bg-transparent font-black text-center"
                        />
                        <button onClick={() => handleUpdatePoints(u.id, editingUserPts.points)} className="text-green-500 hover:bg-green-50 p-0.5 rounded"><Check size={12} /></button>
                        <button onClick={() => setEditingUserPts(null)} className="text-red-500 hover:bg-red-50 p-0.5 rounded"><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="cursor-pointer group flex items-center gap-1 justify-end" onClick={() => setEditingUserPts({ id: u.id, points: u.totalPoints || 0 })}>
                        <span className="font-black text-blue-600 text-[11px]">{u.totalPoints || 0} pts</span>
                        <Edit2 size={9} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                      </div>
                    )}
                    <div className="text-[8px] uppercase tracking-widest text-slate-400">Score Points</div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => handleToggleAdmin(u.id, u.role)} 
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all border ${u.role === 'admin' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-650 border-slate-200/50'}`}
                    >
                      {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition-all"
                      title="Delete User"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="text-slate-400 italic py-4 text-center text-xs">No registered users found.</p>}
          </div>

          {/* Pagination */}
          {renderPagination(activeUsersPage, users.length, setUsersPage)}
        </div>
      )}

      {/* TAB CONTENT: QUIZZES */}
      {activeTab === 'quizzes' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl p-3 shadow-2xs">
          <h3 className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-500">Manage Cloud Quizzes</h3>
          <p className="text-[10px] text-slate-400 mb-2 leading-tight">Assign quizzes to categories so users can easily search and practice them.</p>
          <div className="space-y-1.5">
            {paginatedQuizzes.map(q => {
              const availableSubCats = categories.filter(c => c.parentId === q.categoryId);
              return (
                <div key={q.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/30 dark:bg-slate-800/15 gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs truncate text-slate-900 dark:text-white">{q.title}</h4>
                    <p className="text-[9px] text-slate-400 font-medium">{q.questions?.length || 0} MCQs • ID: {String(q.id).slice(0, 8)}...</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                    {/* Main Category Dropdown */}
                    <select
                      value={q.categoryId || ''}
                      onChange={(e) => handleAssignQuizCategory(q.id, e.target.value, '')}
                      className="px-1.5 py-1 text-[10px] font-bold rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Main Cat --</option>
                      {mainCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>

                    {/* Sub Category Dropdown */}
                    {availableSubCats.length > 0 && (
                      <select
                        value={q.subCategoryId || ''}
                        onChange={(e) => handleAssignQuizCategory(q.id, q.categoryId || '', e.target.value)}
                        className="px-1.5 py-1 text-[10px] font-bold rounded bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 border border-blue-200/40 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-- Sub Cat --</option>
                        {availableSubCats.map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </select>
                    )}

                    <button 
                      onClick={() => handleDeleteQuiz(q.id)}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition-colors"
                      title="Delete Quiz"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
            {quizzes.length === 0 && <p className="text-slate-400 italic py-4 text-center text-xs">No cloud quizzes published yet.</p>}
          </div>

          {/* Pagination */}
          {renderPagination(activeQuizzesPage, quizzes.length, setQuizzesPage)}
        </div>
      )}

      {/* TAB CONTENT: SETTINGS (QUIZ RULES) */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl p-3 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1 text-slate-900 dark:text-white">
                <Target size={14} className="text-blue-600" /> Admin Quiz Rules & Marks Configuration
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Set global rules for positive marks, penalty indices, and limits.</p>
            </div>
            {saveSuccess && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] border border-emerald-250 animate-pulse">
                <CheckCircle2 size={10} /> Saved!
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Positive Marks per Question */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-150/80 space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-650 dark:text-slate-200 flex items-center gap-1">
                <Target size={11} className="text-emerald-500" /> Correct Ans (+ Marks)
              </label>
              <p className="text-[9px] text-slate-400 font-semibold leading-tight">Marks per right choice (e.g. 1, 2, 4)</p>
              <input 
                type="number"
                step="0.25"
                min="0"
                value={positiveMarks}
                onChange={(e) => setPositiveMarks(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-705 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-xs outline-none focus:border-blue-500"
              />
            </div>

            {/* Negative Marks per Wrong Question */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-150/80 space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-650 dark:text-slate-200 flex items-center gap-1">
                <X size={11} className="text-rose-500" /> Incorrect Ans (- Penalty)
              </label>
              <p className="text-[9px] text-slate-400 font-semibold leading-tight">Marks cut for wrong choice (e.g. 0.25, 0.5)</p>
              <input 
                type="number"
                step="0.25"
                min="0"
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-705 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-xs outline-none focus:border-blue-500"
              />
            </div>

            {/* Time Limit per Question */}
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-150/80 space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-650 dark:text-slate-200 flex items-center gap-1">
                <Timer size={11} className="text-blue-500" /> Timer limit (Seconds)
              </label>
              <p className="text-[9px] text-slate-400 font-semibold leading-tight">Max seconds per question (0 = No limit)</p>
              <input 
                type="number"
                min="0"
                step="5"
                value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-705 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button 
              onClick={handleSaveQuizConfig}
              disabled={savingSettings}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 shadow transition-all shrink-0 active:scale-95"
            >
              <Save size={12} /> {savingSettings ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-2.5 flex gap-2 items-start">
            <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={16} />
            <div>
              <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">User Flags & Quality Auditing</h3>
              <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 leading-relaxed">
                Review flagged questions for wrong keys or typos. Editing a question updates the live database instantly and dismisses the report.
              </p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl p-6 text-center shadow-2xs">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 size={20} />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">All Questions Clean!</h4>
              <p className="text-slate-400 text-[9px] uppercase tracking-wider mt-0.5">No pending reports found in MongoDB database.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedReports.map((report) => (
                <div 
                  key={report.id} 
                  className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-xl p-3 shadow-2xs relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>

                  {editingReportId === report.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-1">
                        <div>
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                            Quiz: {report.quizTitle}
                          </span>
                        </div>
                        <button 
                          onClick={cancelEditingReport}
                          className="p-0.5 hover:bg-slate-150 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Question Text */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Question Text</label>
                        <textarea
                          rows={2}
                          value={editQText}
                          onChange={(e) => setEditQText(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500 whitespace-pre-wrap font-medium"
                          placeholder="Type question text here..."
                        />
                      </div>

                      {/* Options */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Options</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {editQOptions.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-black text-slate-500 shrink-0">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...editQOptions];
                                  updated[oIdx] = e.target.value;
                                  setEditQOptions(updated);
                                }}
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[11px] outline-none focus:border-blue-500"
                                placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Correct Answer select */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Correct Answer Key</label>
                        <select
                          value={editQCorrectIndex}
                          onChange={(e) => setEditQCorrectIndex(Number(e.target.value))}
                          className="w-full sm:w-48 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs"
                        >
                          {editQOptions.map((opt, oIdx) => (
                            <option key={oIdx} value={oIdx}>
                              Option {String.fromCharCode(65 + oIdx)}: {opt.substring(0, 30)}{opt.length > 30 ? '...' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Explanation */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Explanation & Insights</label>
                        <textarea
                          rows={2}
                          value={editQExplanation}
                          onChange={(e) => setEditQExplanation(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-[11px] outline-none focus:border-blue-500 whitespace-pre-wrap font-medium"
                          placeholder="Provide correct explanation..."
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-1.5">
                        <button
                          type="button"
                          onClick={cancelEditingReport}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSavingReportEdit}
                          onClick={() => handleSaveReportEdit(report)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs"
                        >
                          <Save size={11} />
                          {isSavingReportEdit ? 'Saving...' : 'Save & Resolve'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* View Flag Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                              Quiz: {report.quizTitle}
                            </span>
                            <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1">
                              <AlertTriangle size={9} /> Flag: {report.reason}
                            </span>
                          </div>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                            Date: {new Date(report.timestamp).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => startEditingReport(report)}
                            className="px-2 py-1 bg-blue-50 dark:bg-blue-950/45 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                          >
                            <Edit2 size={10} /> Edit & Resolve
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="px-2 py-1 bg-rose-50 dark:bg-rose-950/45 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                          >
                            <Trash2 size={10} /> Dismiss
                          </button>
                        </div>
                      </div>

                      {/* Flagged Question */}
                      <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 rounded-lg p-2.5 mb-2">
                        <p className="text-slate-900 dark:text-white text-xs font-bold whitespace-pre-wrap break-words">
                          {report.questionText}
                        </p>
                      </div>

                      {/* Answer Options list */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                        {report.options && report.options.map((opt: string, optIdx: number) => {
                          const isCorrect = optIdx === report.correctAnswerIndex;
                          return (
                            <div 
                              key={optIdx} 
                              className={`p-2 rounded-lg border text-[11px] flex items-start gap-1.5 ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-semibold' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
                            >
                              <span className={`w-4.5 h-4.5 rounded flex items-center justify-center text-[9px] font-black shrink-0 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="break-words">{opt}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      {report.explanation && (
                        <div className="bg-slate-50 dark:bg-slate-800/10 border border-slate-150 dark:border-slate-800/50 rounded-lg p-2 text-[10px] text-slate-500 dark:text-slate-400">
                          <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[8px] block mb-0.5">Explanation:</span>
                          <p className="whitespace-pre-wrap break-words">{report.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {renderPagination(activeReportsPage, reports.length, setReportsPage, 4)}
        </div>
      )}
    </div>
  );
}
