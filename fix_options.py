import re

with open('components/Quiz.tsx', 'r') as f:
    content = f.read()

target = """            <div className="space-y-2.5">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQuestion.correctAnswerIndex;
                let btnStyle = "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-850";
                
                if (mode === 'PRACTICE' && showFeedback) {
                  // Practice mode instant feedback styling
                  if (isCorrect) btnStyle = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-2xs font-semibold";
                  else if (isSelected) btnStyle = "bg-rose-50 dark:bg-rose-900/20 border-rose-500 text-rose-700 dark:text-rose-400 shadow-2xs font-semibold";
                  else btnStyle = "opacity-40 grayscale-[0.5]";
                } else if (isSelected) {
                  // Test mode / pre-feedback selected styling
                  btnStyle = "bg-blue-50 dark:bg-blue-900/30 border-blue-600 ring-2 ring-blue-500/20 text-blue-900 dark:text-blue-200 font-semibold shadow-2xs";
                }

                return (
                  <button 
                    key={idx} 
                    disabled={(mode === 'PRACTICE' && showFeedback) || (effectiveTimePerQ > 0 && questionTimer === 0)} 
                    onClick={() => handleOptionClick(idx)} 
                    className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center group ${btnStyle}`}
                  >
                    <div className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full border flex items-center justify-center mr-3 font-black text-xs transition-all shrink-0 aspect-square
                      ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-850'}
                    `}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="font-semibold text-xs sm:text-sm leading-snug flex-1 text-slate-800 dark:text-slate-200">{option}</span>
                    {mode === 'TEST' && isSelected && (
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[8px] font-black uppercase tracking-wider ml-2">Selected</span>
                    )}
                  </button>
                );
              })}
            </div>"""

replacement = """            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQuestion.correctAnswerIndex;
                
                let btnStyle = "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-sm";
                let letterStyle = "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200";
                let textStyle = "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white";
                let showIcon = null;

                if (mode === 'PRACTICE' && showFeedback) {
                  if (isCorrect) {
                    btnStyle = "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-400 dark:border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20 font-bold scale-[1.01]";
                    letterStyle = "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30";
                    textStyle = "text-emerald-900 dark:text-emerald-100 font-bold";
                    showIcon = <Check size={14} strokeWidth={4} />;
                  } else if (isSelected) {
                    btnStyle = "bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30 border-rose-300 dark:border-rose-500/50 font-bold";
                    letterStyle = "bg-rose-500 border-rose-500 text-white shadow-sm";
                    textStyle = "text-rose-900 dark:text-rose-100 font-bold";
                    showIcon = <X size={14} strokeWidth={4} />;
                  } else {
                    btnStyle = "bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60";
                    letterStyle = "bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500";
                    textStyle = "text-slate-500 dark:text-slate-400";
                  }
                } else if (isSelected) {
                  btnStyle = "bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-2 ring-blue-500/20 shadow-sm scale-[1.01]";
                  letterStyle = "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30";
                  textStyle = "text-blue-900 dark:text-blue-100 font-bold";
                }

                return (
                  <button 
                    key={idx} 
                    disabled={(mode === 'PRACTICE' && showFeedback) || (effectiveTimePerQ > 0 && questionTimer === 0)} 
                    onClick={() => handleOptionClick(idx)} 
                    className={`w-full text-left p-3.5 sm:p-4 rounded-[1.25rem] border transition-all duration-300 flex items-center group ${btnStyle}`}
                  >
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center mr-3.5 font-black text-sm transition-all shrink-0 aspect-square ${letterStyle}`}>
                      {showIcon || String.fromCharCode(65 + idx)}
                    </div>
                    <span className={`text-xs sm:text-sm leading-snug flex-1 transition-colors ${textStyle}`}>
                      {option}
                    </span>
                    {mode === 'TEST' && isSelected && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider ml-2 shadow-sm">Selected</span>
                    )}
                  </button>
                );
              })}
            </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open('components/Quiz.tsx', 'w') as f:
        f.write(content)
    print("Options Updated Successfully.")
else:
    print("Target not found. Doing regex substitution.")

