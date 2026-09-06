import re

with open('components/Quiz.tsx', 'r') as f:
    content = f.read()

target = """      {/* Bottom Footer Action Controls */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 px-4 py-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <button 
            onClick={handlePrevious} 
            disabled={currentQuestionIndex === 0 || isFetchingNext}
            className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all active:scale-95
              ${(currentQuestionIndex === 0 || isFetchingNext) ? 'opacity-0 pointer-events-none' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800'}
            `}
          >
            <ChevronLeft size={16} /> Prev
          </button>

          <div className="flex gap-2 flex-1 justify-end">
             <button 
               onClick={handleNext}
               disabled={isFetchingNext}
               className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 min-w-[130px] justify-center"
             >
                {isFetchingNext ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                   {currentQuestionIndex === quiz.questions.length - 1 && !quiz.isInfinite ? (mode === 'TEST' ? "Submit Test" : "Finish") : "Next"} <ChevronRight size={16} />
                  </>
                )}
             </button>
          </div>
        </div>
      </div>"""

replacement = """      {/* Floating Bottom Dock Action Controls */}
      <div className="fixed bottom-4 left-0 right-0 px-4 z-[90] pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-2 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex items-center justify-between gap-3 relative overflow-hidden">
             
             {/* Subtle Glow Background */}
             <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none" />

             <button 
               onClick={handlePrevious} 
               disabled={currentQuestionIndex === 0 || isFetchingNext}
               className={`relative flex items-center justify-center h-14 w-14 shrink-0 rounded-full font-black transition-all active:scale-95
                 ${(currentQuestionIndex === 0 || isFetchingNext) ? 'opacity-0 pointer-events-none' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100/60 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-700/80 shadow-sm'}
               `}
             >
               <ChevronLeft size={22} strokeWidth={3} />
             </button>

             <button 
               onClick={handleNext}
               disabled={isFetchingNext}
               className="relative flex-1 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full font-black text-xs sm:text-sm uppercase tracking-widest shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 group"
             >
                {isFetchingNext ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                   {currentQuestionIndex === quiz.questions.length - 1 && !quiz.isInfinite ? (mode === 'TEST' ? "Submit Test" : "Finish") : "Next"} 
                   <ChevronRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
             </button>
          </div>
        </div>
      </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open('components/Quiz.tsx', 'w') as f:
        f.write(content)
    print("Bottom bar updated.")
else:
    print("Target not found for bottom bar.")
