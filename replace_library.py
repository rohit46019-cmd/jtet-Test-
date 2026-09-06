import re

with open('App.tsx', 'r') as f:
    content = f.read()

# Library background
# No specific container for library, it uses the root container. But we can style the cards.
# Search input
content = content.replace(
    'className={`w-full pl-10 pr-8 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all ${',
    'className={`w-full pl-10 pr-8 py-2.5 rounded-xl text-xs font-bold outline-none border backdrop-blur-md shadow-sm transition-all ${'
)

# Pill filters
# Main category pills
content = content.replace(
    'selectedCategoryFilter === \'ALL\' ? \'bg-blue-600 text-white shadow-md\' : isDarkMode ? \'bg-slate-800 text-slate-300\' : \'bg-slate-100 text-slate-700\'',
    'selectedCategoryFilter === \'ALL\' ? \'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border-transparent\' : isDarkMode ? \'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700\' : \'bg-white border-slate-200 text-slate-700 hover:bg-slate-50\''
)
content = content.replace(
    'selectedCategoryFilter === c.id ? \'bg-blue-600 text-white shadow-md\' : isDarkMode ? \'bg-slate-800 text-slate-300\' : \'bg-slate-100 text-slate-700\'',
    'selectedCategoryFilter === c.id ? \'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border-transparent\' : isDarkMode ? \'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700\' : \'bg-white border-slate-200 text-slate-700 hover:bg-slate-50\''
)

# Quiz Cards
# className={`group p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-xs hover:border-blue-500 transition-all flex items-center gap-2 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}
target_card = "className={`group p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-xs hover:border-blue-500 transition-all flex items-center gap-2 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}"
replacement_card = "className={`group p-2.5 rounded-2xl border shadow-sm hover:shadow-md hover:scale-[1.01] transition-all flex items-center gap-3 ${isDarkMode ? 'bg-slate-900/80 border-slate-700/80 hover:border-indigo-500/50 hover:bg-slate-800/80' : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'}`}"
content = content.replace(target_card, replacement_card)

# Topic Image border
content = content.replace(
    'className="w-8 h-8 shrink-0 rounded-lg object-cover border border-slate-200 dark:border-slate-800"',
    'className="w-10 h-10 shrink-0 rounded-[0.8rem] object-cover border shadow-sm ${isDarkMode ? \'border-slate-700\' : \'border-slate-200\'}"'
)

# Quiz titles
content = content.replace(
    'className={`font-bold text-[10px] sm:text-[10.5px] ${isDarkMode ? \'text-slate-100\' : \'text-slate-900\'} group-hover:text-blue-500 transition-colors truncate`} title={q.title}>{q.title}</h4>',
    'className={`font-black text-[11px] sm:text-[12px] leading-tight ${isDarkMode ? \'text-slate-100\' : \'text-slate-800\'} group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate`} title={q.title}>{q.title}</h4>'
)

with open('App.tsx', 'w') as f:
    f.write(content)

print("Library updated")
