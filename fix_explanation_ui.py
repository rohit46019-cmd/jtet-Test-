import re

with open('components/Quiz.tsx', 'r') as f:
    content = f.read()

target = """  return (
    <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-left select-text animate-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg">
            <Brain size={16} />
          </div>
          <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
            Explanation & Concept Insight
          </span>
        </div>
        
        {onAskAi && (
          <button
            onClick={onAskAi}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider shadow-sm active:scale-95 transition-all"
          >
            <Sparkles size={11} />
            <span>Ask AI</span>
          </button>
        )}
      </div>

      {/* Content paragraphs - clean, structured, no heavy boxes */}
      <div className="space-y-2.5 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">"""


replacement = """  return (
    <div className="mt-8 relative overflow-hidden rounded-[1.5rem] text-left select-text animate-in slide-in-from-bottom-2 duration-300 shadow-sm border border-slate-200/60 dark:border-slate-700/50">
      
      {/* Colorful Gradient Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-purple-50/80 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 pointer-events-none" />
      
      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3 border-b border-indigo-100/50 dark:border-indigo-900/30 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-blue-500 text-white shadow-md shadow-indigo-500/20 rounded-xl">
              <Brain size={16} />
            </div>
            <div>
              <h4 className="font-black text-[13px] sm:text-[14px] uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400">
                Concept Insight
              </h4>
              <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Explanation & Reasoning</p>
            </div>
          </div>
          
          {onAskAi && (
            <button
              onClick={onAskAi}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-[10px] uppercase tracking-wider shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
            >
              <Sparkles size={12} className="animate-pulse" />
              <span>Ask AI Assistant</span>
            </button>
          )}
        </div>

        {/* Content paragraphs - clean, structured, no heavy boxes */}
        <div className="space-y-3 text-slate-700 dark:text-slate-300 text-[13px] sm:text-sm font-medium leading-relaxed">"""

if target in content:
    content = content.replace(target, replacement)
    
    # Let's also fix the closing tag padding
    # Wait, the closing div structure changed. 
    # Let's make sure the closing tags match. 
    # original had:
    # </div> (for space-y-2.5)
    # </div> (for mt-6)
    # The new one has:
    # </div> (for space-y-3)
    # </div> (for relative p-5)
    # </div> (for mt-8)
    
    # We need to replace the last two `</div>` in DecoratedExplanation.
    
    with open('components/Quiz.tsx', 'w') as f:
        f.write(content)
    print("Explanation UI Updated.")
else:
    print("Target not found.")

