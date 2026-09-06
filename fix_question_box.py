import re

with open('components/Quiz.tsx', 'r') as f:
    content = f.read()

target = """            {/* Question Text with distinct background area and smart highlight */}
            <div className="bg-blue-50/45 dark:bg-slate-900 border border-blue-100/50 dark:border-slate-850 px-4 sm:px-5 py-4 rounded-2xl shadow-3xs whitespace-pre-wrap break-words">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-relaxed">
                {highlightQuestionText(currentQuestion.question)}
              </h3>
            </div>"""

replacement = """            {/* Sleek Question Box */}
            <div className="relative bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 px-5 py-5 sm:px-6 sm:py-6 rounded-[1.5rem] shadow-sm whitespace-pre-wrap break-words overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-indigo-500" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors" />
              <h3 className="relative z-10 text-[15px] sm:text-[17px] font-black text-slate-900 dark:text-white leading-[1.6]">
                {highlightQuestionText(currentQuestion.question)}
              </h3>
            </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open('components/Quiz.tsx', 'w') as f:
        f.write(content)
    print("Question box updated.")
else:
    print("Question box target not found.")

