import React, { useState, useEffect } from 'react';
import { Category, Quiz } from '../types';
import { Trash2, Plus, Edit2, Check, X, Users, BookOpen, Shield, Trophy, FolderPlus, Tag, Image as ImageIcon, Timer, Target, Save, CheckCircle2 } from 'lucide-react';
import { getTopicThumbnail, TopicImage } from '../lib/thumbnailHelper';

export default function AdminPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'categories' | 'users' | 'quizzes' | 'settings'>('categories');
  const [newCatName, setNewCatName] = useState('');
  const [newCatThumbnail, setNewCatThumbnail] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editingUserPts, setEditingUserPts] = useState<{ id: string; points: number } | null>(null);

  // Quiz Rules Settings (Admin Only)
  const [positiveMarks, setPositiveMarks] = useState<number>(1);
  const [negativeMarks, setNegativeMarks] = useState<number>(0.25);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(0); // seconds
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchAll();
    fetchQuizConfig();
  }, []);

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
      const [catRes, userRes, quizRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/users'),
        fetch('/api/quizzes')
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
        localStorage.setItem('qf_categories', JSON.stringify(catData));
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
    } catch (e) {
      console.error("Admin fetch error, checking local fallback:", e);
      const savedCats = localStorage.getItem('qf_categories');
      if (savedCats) setCategories(JSON.parse(savedCats));
      const savedLib = localStorage.getItem('qf_lib_v4');
      if (savedLib) setQuizzes(JSON.parse(savedLib));
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setLoading(true);
    const thumb = newCatThumbnail.trim() || getTopicThumbnail(newCatName.trim());
    const newCat = {
      id: crypto.randomUUID(),
      name: newCatName.trim(),
      parentId: parentCategoryId || null,
      thumbnailUrl: thumb,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      createdAt: Date.now()
    };

    // Instant local UI
    const updated = [...categories, newCat];
    setCategories(updated);
    localStorage.setItem('qf_categories', JSON.stringify(updated));

    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat)
      });
      setNewCatName('');
      setNewCatThumbnail('');
      setParentCategoryId('');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete category?')) return;
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    localStorage.setItem('qf_categories', JSON.stringify(updated));

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
      thumbnailUrl: editThumbnail.trim() || getTopicThumbnail(editName.trim())
    } : c);
    setCategories(updated);
    localStorage.setItem('qf_categories', JSON.stringify(updated));
    setEditingId(null);

    try {
      await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          thumbnailUrl: editThumbnail.trim() || getTopicThumbnail(editName.trim())
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

  // Separate main categories and subcategories
  const mainCategories = categories.filter((c: any) => !c.parentId);
  const getSubCategories = (catId: string) => categories.filter((c: any) => c.parentId === catId);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300 pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight flex items-center gap-2.5">
            <Shield className="text-blue-600" size={28} /> Admin Control Center
          </h2>
          <p className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-widest mt-0.5">MongoDB Atlas Database • Quizzes, Categories, Users & Marking Rules</p>
        </div>

        <div className="w-full flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 overflow-x-auto scrollbar-hide no-scrollbar">
          <button onClick={() => setActiveTab('categories')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${activeTab === 'categories' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
            Categories ({categories.length})
          </button>
          <button onClick={() => setActiveTab('users')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
            Users ({users.length})
          </button>
          <button onClick={() => setActiveTab('quizzes')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${activeTab === 'quizzes' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
            Quizzes ({quizzes.length})
          </button>
          <button onClick={() => setActiveTab('settings')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
            <Target size={12} /> Quiz Rules & Marks
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 mb-6 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
        <div className="min-w-[140px] sm:min-w-0 flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-xl flex items-center justify-center font-black shrink-0"><Users size={20} /></div>
          <div>
            <div className="text-xl font-black">{users.length}</div>
            <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">MongoDB Users</div>
          </div>
        </div>
        <div className="min-w-[140px] sm:min-w-0 flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 text-purple-600 rounded-xl flex items-center justify-center font-black shrink-0"><BookOpen size={20} /></div>
          <div>
            <div className="text-xl font-black">{quizzes.length}</div>
            <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">Cloud Quizzes</div>
          </div>
        </div>
        <div className="min-w-[140px] sm:min-w-0 flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 text-green-600 rounded-xl flex items-center justify-center font-black shrink-0"><Trophy size={20} /></div>
          <div>
            <div className="text-xl font-black">{categories.length}</div>
            <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold whitespace-nowrap">Categories</div>
          </div>
        </div>
      </div>

      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <FolderPlus size={16} className="text-blue-600" /> Create Test Category / Sub-Category
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category Name (e.g. Science, JavaScript)"
                className="flex-1 px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-blue-500"
              />
              <select
                value={parentCategoryId}
                onChange={(e) => setParentCategoryId(e.target.value)}
                className="px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="">Main Category (Top Level)</option>
                {mainCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>Sub-category of: {cat.name}</option>
                ))}
              </select>
              <button 
                onClick={handleCreateCategory}
                disabled={loading || !newCatName.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0 active:scale-95"
              >
                <Plus size={14} /> Create
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Manage Categories & Sub-Categories</h3>
            <div className="space-y-2">
              {mainCategories.map(cat => {
                const subs = getSubCategories(cat.id);
                return (
                  <div key={cat.id} className="p-3.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                    <div className="flex items-center justify-between">
                      {editingId === cat.id ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 mr-3">
                          <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-blue-500 bg-transparent font-bold"
                            placeholder="Category name"
                          />
                          <input 
                            type="text" 
                            value={editThumbnail}
                            onChange={(e) => setEditThumbnail(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                            placeholder="Thumbnail Image URL (Optional)"
                          />
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleUpdateCategory(cat.id)} className="text-green-500 p-1"><Check size={16} /></button>
                            <button onClick={() => setEditingId(null)} className="text-red-500 p-1"><X size={16} /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="font-black text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2.5">
                          <TopicImage 
                            title={cat.name}
                            customUrl={cat.thumbnailUrl} 
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <span>{cat.name}</span>
                        </div>
                      )}
                      
                      {editingId !== cat.id && (
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditThumbnail(cat.thumbnailUrl || ''); }} 
                            className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                            title="Edit"
                          ><Edit2 size={14} /></button>
                          <button 
                            onClick={() => handleDeleteCategory(cat.id)} 
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          ><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>

                    {/* Subcategories */}
                    {subs.length > 0 && (
                      <div className="pl-6 space-y-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        {subs.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between py-1 text-xs">
                            {editingId === sub.id ? (
                              <div className="flex items-center gap-2 flex-1 mr-3">
                                <input 
                                  type="text" 
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-blue-500 bg-transparent font-medium"
                                />
                                <button onClick={() => handleUpdateCategory(sub.id)} className="text-green-500 p-1"><Check size={14} /></button>
                                <button onClick={() => setEditingId(null)} className="text-red-500 p-1"><X size={14} /></button>
                              </div>
                            ) : (
                              <div className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> {sub.name} <span className="text-[9px] text-slate-400 uppercase">(Sub)</span>
                              </div>
                            )}

                            {editingId !== sub.id && (
                              <div className="flex gap-1">
                                <button onClick={() => { setEditingId(sub.id); setEditName(sub.name); }} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 size={12} /></button>
                                <button onClick={() => handleDeleteCategory(sub.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {mainCategories.length === 0 && <p className="text-slate-400 italic py-6 text-center text-xs">No categories created yet.</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Manage Registered Users</h3>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 gap-3">
                <div>
                  <div className="font-black text-xs sm:text-sm flex items-center gap-2">
                    {u.name || u.email?.split('@')[0] || 'User'}
                    {u.role === 'admin' && <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-black">Admin</span>}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    {editingUserPts?.id === u.id ? (
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="number"
                          value={editingUserPts.points}
                          onChange={(e) => setEditingUserPts({ id: u.id, points: Number(e.target.value) })}
                          className="w-16 p-1 text-xs rounded-lg border border-blue-500 bg-transparent font-black"
                        />
                        <button onClick={() => handleUpdatePoints(u.id, editingUserPts.points)} className="text-green-500"><Check size={14} /></button>
                        <button onClick={() => setEditingUserPts(null)} className="text-red-500"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="cursor-pointer group flex items-center gap-1.5" onClick={() => setEditingUserPts({ id: u.id, points: u.totalPoints || 0 })}>
                        <span className="font-black text-blue-600 text-sm">{u.totalPoints || 0} pts</span>
                        <Edit2 size={12} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                      </div>
                    )}
                    <div className="text-[9px] uppercase tracking-widest text-slate-400">Points</div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => handleToggleAdmin(u.id, u.role)} 
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${u.role === 'admin' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                    >
                      {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete User"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="text-slate-400 italic py-6 text-center text-xs">No registered users found.</p>}
          </div>
        </div>
      )}

      {activeTab === 'quizzes' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-3">Manage Cloud Quizzes ({quizzes.length})</h3>
          <p className="text-[11px] text-slate-400 mb-3">Assign quizzes to categories so users can filter them in the Learning Vault.</p>
          <div className="space-y-2">
            {quizzes.map(q => {
              const availableSubCats = categories.filter(c => c.parentId === q.categoryId);
              return (
                <div key={q.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 gap-3">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm">{q.title}</h4>
                    <p className="text-[10px] text-slate-400">{q.questions?.length || 0} Questions • ID: {String(q.id).slice(0, 8)}...</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Main Category Dropdown */}
                    <select
                      value={q.categoryId || ''}
                      onChange={(e) => handleAssignQuizCategory(q.id, e.target.value, '')}
                      className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Main Category --</option>
                      {mainCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>

                    {/* Sub Category Dropdown */}
                    {availableSubCats.length > 0 && (
                      <select
                        value={q.subCategoryId || ''}
                        onChange={(e) => handleAssignQuizCategory(q.id, q.categoryId || '', e.target.value)}
                        className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-- Sub Category --</option>
                        {availableSubCats.map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </select>
                    )}

                    <button 
                      onClick={() => handleDeleteQuiz(q.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete Quiz"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
            {quizzes.length === 0 && <p className="text-slate-400 italic py-6 text-center text-xs">No cloud quizzes published yet.</p>}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black uppercase tracking-wider flex items-center gap-2 text-slate-900 dark:text-white">
                <Target size={20} className="text-blue-600" /> Admin Quiz Rules & Marking Configuration
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Set global positive marks per question, negative marking penalties, and per-question time limits.
              </p>
            </div>
            {saveSuccess && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-200 animate-in fade-in">
                <CheckCircle2 size={16} /> Saved Successfully!
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Positive Marks per Question */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Target size={14} className="text-emerald-500" /> Correct Answer (+ Marks)
              </label>
              <p className="text-[10px] text-slate-400 font-medium leading-tight">
                Marks awarded for each correct answer (e.g. +1, +2, +4)
              </p>
              <input 
                type="number"
                step="0.25"
                min="0"
                value={positiveMarks}
                onChange={(e) => setPositiveMarks(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-sm outline-none focus:border-blue-500"
                placeholder="1.0"
              />
            </div>

            {/* Negative Marks per Wrong Question */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <X size={14} className="text-rose-500" /> Wrong Answer (- Negative Marks)
              </label>
              <p className="text-[10px] text-slate-400 font-medium leading-tight">
                Marks deducted for each wrong option (e.g. 0.25, 0.5, 1.0)
              </p>
              <input 
                type="number"
                step="0.25"
                min="0"
                value={negativeMarks}
                onChange={(e) => setNegativeMarks(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-sm outline-none focus:border-blue-500"
                placeholder="0.25"
              />
            </div>

            {/* Time Limit per Question */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Timer size={14} className="text-blue-500" /> Question Timer (Seconds)
              </label>
              <p className="text-[10px] text-slate-400 font-medium leading-tight">
                Max seconds allowed per question (0 = Unlimited time)
              </p>
              <input 
                type="number"
                min="0"
                step="5"
                value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-sm outline-none focus:border-blue-500"
                placeholder="0 (Unlimited)"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button 
              onClick={handleSaveQuizConfig}
              disabled={savingSettings}
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Save size={16} /> {savingSettings ? 'Saving Settings...' : 'Save Rule Configuration'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
