import re

with open('App.tsx', 'r') as f:
    content = f.read()

# Replace bg-[#090B14] with proper light/dark mode bg
content = content.replace(
    'className="relative min-h-screen -mx-4 -mt-16 pt-20 px-4 pb-24 bg-[#090B14] overflow-hidden"',
    'className={`relative min-h-screen -mx-4 -mt-16 pt-20 px-4 pb-24 overflow-hidden ${isDarkMode ? \'bg-[#090B14]\' : \'bg-[#f8fafc]\'}`}'
)

# Replace opacity-15 for ambient mesh with dynamic opacity
content = content.replace(
    'className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:32px_32px] opacity-15"',
    'className={`absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:32px_32px] ${isDarkMode ? \'opacity-15\' : \'opacity-5\'}`}'
)

# Replace the Colorful Hero Banner
content = content.replace(
    'className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-violet-900/90 via-indigo-900/90 to-slate-900/90 p-5 shadow-[0_0_35px_rgba(99,102,241,0.35)] border border-violet-500/30 animate-in fade-in zoom-in duration-500"',
    'className={`relative overflow-hidden rounded-[1.75rem] p-5 shadow-xl border animate-in fade-in zoom-in duration-500 ${isDarkMode ? \'bg-gradient-to-r from-violet-900/90 via-indigo-900/90 to-slate-900/90 shadow-[0_0_35px_rgba(99,102,241,0.35)] border-violet-500/30 text-white\' : \'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 shadow-xl border-violet-300 text-white\'}`}'
)

# Replace the text-violet-400 arrow with dynamic
content = content.replace(
    '<ArrowRight size={12} className="text-violet-400" />',
    '<ArrowRight size={12} className={`transition-colors ${isDarkMode ? \'text-violet-400\' : \'text-violet-200\'}`} />'
)

# Quick stats grid bg
content = content.replace(
    'className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10"',
    'className={`grid grid-cols-3 gap-2 mt-4 pt-3 border-t ${isDarkMode ? \'border-white/10\' : \'border-white/20\'}`}'
)

content = content.replace(
    'className="p-2 rounded-xl bg-white/5 backdrop-blur-md border border-white/5 text-center"',
    'className={`p-2 rounded-xl backdrop-blur-md border text-center ${isDarkMode ? \'bg-white/5 border-white/5\' : \'bg-white/10 border-white/10\'}`}'
)

with open('App.tsx', 'w') as f:
    f.write(content)

print("Home updated")
