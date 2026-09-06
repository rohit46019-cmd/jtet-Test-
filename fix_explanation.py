import re

with open('components/Quiz.tsx', 'r') as f:
    content = f.read()

target = """const DecoratedExplanation: React.FC<{ 
  explanation: string; 
  onAskAi?: () => void;
}> = ({ explanation, onAskAi }) => {
  if (!explanation && !onAskAi) return null;

  const normalizedText = normalizeExplanationText(explanation || '');
  const paragraphs = normalizedText
    .split(/\\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return (
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
      <div className="space-y-2.5 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
        {paragraphs.length > 0 ? (
          paragraphs.map((para, idx) => {
            const isBullet = para.startsWith('•') || para.startsWith('-') || para.startsWith('*') || /^\\d+[\\.\\)]\\s+/.test(para);
            return (
              <p key={idx} className={isBullet ? 'pl-4 relative' : ''}>
                {isBullet && <span className="absolute left-0 top-0 text-blue-500 dark:text-blue-400 font-black">•</span>}
                {para.replace(/^[•\\-\\*]\\s*/, '').replace(/^\\d+[\\.\\)]\\s*/, '')}
              </p>
            );
          })
        ) : (
          <p className="opacity-70 italic text-xs">No detailed explanation provided for this question.</p>
        )}
      </div>
    </div>
  );
};"""

replacement = """const DecoratedExplanation: React.FC<{ 
  explanation: string; 
  onAskAi?: () => void;
}> = ({ explanation, onAskAi }) => {
  if (!explanation && !onAskAi) return null;

  const normalizedText = normalizeExplanationText(explanation || '');
  const paragraphs = normalizedText
    .split(/\\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return (
    <div className="mt-8 relative animate-in fade-in slide-in-from-bottom-2 duration-300 text-left select-text">
      {/* Stylish Gradient Container */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-blue-500/5 dark:from-indigo-900/20 dark:via-purple-900/10 dark:to-blue-900/20 rounded-[1.5rem] border border-indigo-100 dark:border-indigo-900/30" />
      
      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20 rounded-xl">
              <Brain size={16} />
            </div>
            <div>
              <h4 className="font-black text-xs sm:text-sm uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                Concept Insight
              </h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Explanation & Reasoning</p>
            </div>
          </div>
          
          {onAskAi && (
            <button
              onClick={onAskAi}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-[10px] uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Sparkles size={11} className="animate-pulse" />
              <span>Ask AI Chat</span>
            </button>
          )}
        </div>

        {/* Content paragraphs */}
        <div className="space-y-3 text-slate-700 dark:text-slate-300 text-[13px] sm:text-sm font-medium leading-relaxed">
          {paragraphs.length > 0 ? (
            paragraphs.map((para, idx) => {
              const isBullet = para.startsWith('•') || para.startsWith('-') || para.startsWith('*') || /^\\d+[\\.\\)]\\s+/.test(para);
              return (
                <div key={idx} className={`flex gap-3 ${isBullet ? '' : 'pt-1'}`}>
                  {isBullet && (
                    <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
                  )}
                  <p className="flex-1">
                    {para.replace(/^[•\\-\\*]\\s*/, '').replace(/^\\d+[\\.\\)]\\s*/, '')}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="opacity-70 italic text-xs">No detailed explanation provided for this question.</p>
          )}
        </div>
      </div>
    </div>
  );
};"""

if target in content:
    content = content.replace(target, replacement)
    with open('components/Quiz.tsx', 'w') as f:
        f.write(content)
    print("Explanation Updated Successfully.")
else:
    print("Explanation Target not found. Check formatting.")

