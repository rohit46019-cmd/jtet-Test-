import re

with open("App.tsx", "r") as f:
    content = f.read()

start_idx = content.find("            {tab === 'HOME' && (")
end_idx = content.find("            {tab === 'AI_PROMPT' && (", start_idx)

if start_idx != -1 and end_idx != -1:
    new_home = """            {tab === 'HOME' && (
              <div className="relative min-h-screen -mx-4 -mt-16 pt-20 px-4 pb-24 bg-[#0B0D17] overflow-hidden">
                {/* Space Background Effects */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                   <div className="absolute top-[5%] left-[5%] w-64 h-64 bg-purple-600/30 rounded-full blur-[90px]"></div>
                   <div className="absolute top-[30%] right-[0%] w-72 h-72 bg-blue-600/20 rounded-full blur-[100px]"></div>
                   <div className="absolute bottom-[20%] left-[10%] w-80 h-80 bg-fuchsia-600/10 rounded-full blur-[120px]"></div>
                   <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30"></div>
                </div>

                <div className="relative z-10 space-y-4 max-w-3xl mx-auto pt-2">
                  {/* Unified Hero Banner - Compact */}
                  <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#2D1B6C] via-[#3C2792] to-[#5135B3] p-4 shadow-[0_0_30px_rgba(124,58,237,0.3)] border border-white/10 animate-in fade-in zoom-in duration-700">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/30 rounded-full blur-3xl -mr-10 -mt-10" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/30 rounded-full blur-3xl -ml-10 -mb-10" />
                    
                    <div className="relative flex justify-between">
                       <div className="flex items-center gap-3 z-10 w-full">
                          <div className="w-12 h-12 shrink-0 text-4xl drop-shadow-xl flex items-center justify-center">🎓</div>
                          <div className="flex-1 flex flex-col justify-center">
                            <h2 className="text-lg font-black tracking-tight text-white leading-tight drop-shadow-sm">
                              Hello, {user?.displayName || 'Learner'}!
                            </h2>
                            <p className="text-blue-100/90 text-[10px] sm:text-xs font-medium tracking-wide mt-0.5 mb-2 flex items-center gap-1 drop-shadow-sm">
                              Ready to evolve today? <ArrowRight size={10}/>
                            </p>
                            <div className="w-[80%] sm:w-[60%] h-1 bg-white/20 rounded-full overflow-hidden shadow-inner backdrop-blur-sm">
                               <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 w-[60%] rounded-full shadow-[0_0_10px_rgba(251,191,36,0.8)]"></div>
                            </div>
                          </div>
                       </div>
                       <div className="absolute top-0 right-0 flex flex-col items-end z-20">
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 font-black text-[8px] uppercase tracking-widest shadow-sm">
                            <Sparkles size={8} className="text-amber-300" /> PRO
                          </div>
                       </div>
                       <div className="absolute bottom-0 right-0 z-20 mr-1 opacity-80">
                          <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-blue-200 italic tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                            Evolve<span className="text-fuchsia-300">*</span>
                          </h3>
                       </div>
                    </div>
                  </div>

                  {/* Phone Storage Permission Request Banner - Compact */}
                  {showStoragePromptBanner && !storagePermissionGranted && (
                    <div className="p-3 rounded-[1.25rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-lg animate-in fade-in slide-in-from-top-4 duration-500 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
                          <Smartphone size={16} className="text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <span className="text-[7px] font-black uppercase tracking-widest bg-white/20 px-1.5 py-0.5 rounded-md">Device</span>
                             <h4 className="font-black text-[11px] tracking-tight">Offline Cache</h4>
                          </div>
                          <p className="text-[8px] text-blue-100 font-medium leading-tight mt-0.5">
                            Grant storage permission to save quizzes offline.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <button 
                          onClick={handleGrantPhoneStorage}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-50 font-black text-[8px] uppercase tracking-widest rounded-lg shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <ShieldCheck size={12} /> Allow
                        </button>
                        <button 
                          onClick={handleDismissStoragePrompt}
                          className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                          title="Dismiss"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Paused Session Resume Banner - Compact */}
                  {pausedSession && (
                    <div className="p-4 rounded-[1.5rem] bg-gradient-to-br from-[#F57B36] to-[#E35D1F] text-white shadow-[0_0_20px_rgba(245,123,54,0.3)] border border-white/10 animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                      
                      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20 shadow-sm">
                               <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> PAUSED
                             </span>
                             <h4 className="font-black text-sm sm:text-base tracking-tight drop-shadow-sm truncate max-w-[200px]">{pausedSession.quiz.title}</h4>
                          </div>
                          <p className="text-[10px] text-orange-100 font-medium drop-shadow-sm">Q {pausedSession.currentQuestionIndex + 1} of {pausedSession.quiz.questions.length} • {formatDuration(pausedSession.timer)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => resumePausedSession(pausedSession)}
                            className="flex-1 sm:flex-none px-4 py-2 bg-white text-[#E35D1F] hover:bg-orange-50 font-black text-[9px] uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                          >
                            <Play size={12} fill="currentColor" /> RESUME
                          </button>
                          <button 
                            onClick={() => startFreshFromPausedSession(pausedSession)}
                            className="px-3 py-2 bg-transparent border border-white/40 hover:bg-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1"
                            title="Start this test from beginning"
                          >
                            <RotateCcw size={12} />
                          </button>
                          <button 
                            onClick={discardPausedSession}
                            className="w-8 h-8 bg-transparent border border-white/40 hover:bg-white/10 text-white rounded-xl transition-all flex items-center justify-center shrink-0"
                            title="Discard Paused Session"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 1. TOP CATEGORIES SECTION - Compact Grid */}
                  <div className="text-left mt-4">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-white/90 flex items-center gap-1.5 drop-shadow-md">
                        <Sparkles size={14} className="text-purple-400" /> CATEGORIES
                      </h3>
                      <button 
                        onClick={() => navigateTo('LIBRARY')} 
                        className="text-[9px] font-black uppercase tracking-widest text-white/80 hover:text-white bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1 transition-all"
                      >
                        View All <ArrowRight size={10} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {categories.filter(c => !c.parentId).map((cat, index) => {
                        const subCats = categories.filter(c => c.parentId === cat.id);
                        const catQuizCount = library.filter(q => q.categoryId === cat.id).length;

                        const iconMap: Record<string, string> = {
                           'General Knowledge': '🌍',
                           'Science': '⚛️',
                           'History': '📜',
                           'Polity': '⚖️',
                           'Geography': '📍',
                           'Physics': '🔬',
                           'Chemistry': '🧪',
                           'Computer Science': '💻'
                        };
                        
                        const getIcon = (name: string) => {
                            const key = Object.keys(iconMap).find(k => name.includes(k));
                            return key ? iconMap[key] : '📁';
                        };

                        const cardBgClasses = index % 2 === 0 
                          ? "bg-gradient-to-br from-white/[0.08] to-white/[0.02]" 
                          : "bg-gradient-to-br from-slate-400/[0.1] to-slate-500/[0.02]";

                        return (
                          <div 
                            key={cat.id}
                            className={`relative p-3.5 sm:p-4 rounded-[1.5rem] ${cardBgClasses} backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col justify-between`}
                          >
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => {
                                  setSelectedCategoryFilter(cat.id);
                                  setSelectedSubCategoryFilter('ALL');
                                  navigateTo('LIBRARY');
                                }}>
                                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 shadow-inner flex items-center justify-center shrink-0 text-3xl drop-shadow-lg group-hover:scale-105 transition-transform">
                                     {getIcon(cat.name)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-sm sm:text-base text-white mb-1 leading-tight drop-shadow-sm group-hover:text-blue-200 transition-colors truncate">{cat.name}</h4>
                                    <div className="inline-flex px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white/70 border border-white/5 text-[8px] font-black uppercase tracking-widest shadow-inner">
                                      {catQuizCount} Tests • {subCats.length > 0 ? subCats.length : 1} Topics
                                    </div>
                                  </div>
                                </div>

                                {/* Sub-categories chips - More Compact */}
                                {subCats.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/10">
                                    {subCats.slice(0, 4).map(sub => {
                                      return (
                                        <button
                                          key={sub.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedCategoryFilter(cat.id);
                                            setSelectedSubCategoryFilter(sub.id);
                                            navigateTo('LIBRARY');
                                          }}
                                          className="px-2.5 py-1 rounded-lg text-[9px] font-bold bg-white/5 border border-white/10 text-white hover:bg-white/20 shadow-sm backdrop-blur-md transition-all flex items-center gap-1 group"
                                        >
                                          {sub.name}
                                        </button>
                                      );
                                    })}
                                    {subCats.length > 4 && (
                                      <span className="px-2 py-1 text-[9px] text-white/50 font-bold">+{subCats.length - 4} more</span>
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      })}

                      {categories.filter(c => !c.parentId).length === 0 && (
                        <div className="col-span-full p-4 text-center rounded-[1.5rem] bg-white/5 backdrop-blur-md border border-dashed border-white/20 text-white/50 text-xs font-bold">
                          <p>No categories found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 2. FILE UPLOAD & IMPORT AREA */}
                  <div className="mt-6 pt-2">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-white/90 flex items-center gap-1.5 drop-shadow-md">
                        <Zap size={14} className="text-amber-400" /> IMPORT & CREATE
                      </h3>
                    </div>
                    
                    {showPasteArea ? (
                      <div className="animate-in zoom-in-95 duration-300">
                         <div className="p-4 rounded-[1.5rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-3">
                                 <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300">Smart-Detection Area</span>
                                    <p className="text-[8px] text-white/50 font-bold uppercase mt-0.5">Paste JSON (Insta-Load) or Raw Text (AI Scan)</p>
                                 </div>
                                 <button onClick={() => setShowPasteArea(false)} className="text-white/40 hover:text-white transition-colors p-1 bg-white/5 rounded-full"><X size={14} /></button>
                              </div>
                              <textarea 
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                placeholder="Paste JSON or Study Text here..."
                                className="w-full h-40 p-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/30 outline-none text-[11px] text-white/90 font-medium placeholder:text-white/20 transition-all resize-none"
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                <button 
                                  onClick={handlePasteProcess}
                                  className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-[9px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-white/10"
                                >
                                  <Zap size={12} fill="currentColor" className="text-amber-400" /> Direct Process
                                </button>
                                <button 
                                  onClick={handleAuditAndFixPastedJson}
                                  disabled={isAuditingPastedJson}
                                  className="py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black text-[9px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 border border-white/20"
                                >
                                  <ShieldCheck size={12} className="text-emerald-300" /> Auto-Verify & Fix
                                </button>
                              </div>
                            </div>
                         </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Styled File Upload matching dark theme */}
                        <div className="p-1 rounded-[1.5rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg">
                           <FileUpload onFileSelect={handleFileSelect} isLoading={false} />
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center gap-2 pb-6">
                           <button 
                             onClick={() => setShowPasteArea(true)}
                             className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg bg-white/10 text-white hover:bg-white/20 border border-white/10"
                           >
                             <ClipboardList size={14} className="text-blue-400" /> Paste JSON / Text
                           </button>
                           <button 
                             onClick={loadDemoJson}
                             className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg bg-white/10 text-white hover:bg-white/20 border border-white/10"
                           >
                             <Zap size={14} className="text-amber-400" /> Demo JSON
                           </button>
                           <button 
                             onClick={() => setShowJsonInfo(true)}
                             className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg bg-white/10 text-white hover:bg-white/20 border border-white/10"
                           >
                             <Brackets size={14} className="text-indigo-400" /> Format
                           </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
"""

    new_content = content[:start_idx] + new_home + content[end_idx:]
    with open("App.tsx", "w") as f:
        f.write(new_content)
    print("Shrunk layout successfully")
else:
    print("Could not find bounds")
