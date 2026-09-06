import re

with open('App.tsx', 'r') as f:
    content = f.read()

# AI Forge button
content = content.replace(
    'className="p-3.5 rounded-[1.25rem] bg-gradient-to-br from-violet-600/30 via-purple-600/20 to-fuchsia-600/20 hover:from-violet-600/40 hover:to-fuchsia-600/30 border border-violet-500/30 hover:border-violet-400/50 backdrop-blur-xl shadow-lg transition-all text-left group active:scale-95"',
    'className={`p-3.5 rounded-[1.25rem] backdrop-blur-xl shadow-lg transition-all text-left group active:scale-95 border ${isDarkMode ? \'bg-gradient-to-br from-violet-600/30 via-purple-600/20 to-fuchsia-600/20 hover:from-violet-600/40 hover:to-fuchsia-600/30 border-violet-500/30 hover:border-violet-400/50 text-white\' : \'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-300 text-slate-900 shadow-sm\'}`}'
)
content = content.replace(
    'className="text-xs font-black text-white group-hover:text-violet-200 transition-colors">AI Forge</div>',
    'className={`text-xs font-black transition-colors ${isDarkMode ? \'text-white group-hover:text-violet-200\' : \'text-slate-900 group-hover:text-violet-600\'}`}>AI Forge</div>'
)
content = content.replace(
    'className="text-[9px] text-violet-300/80 font-medium mt-0.5">Instant Quiz AI</div>',
    'className={`text-[9px] font-medium mt-0.5 ${isDarkMode ? \'text-violet-300/80\' : \'text-slate-500\'}`}>Instant Quiz AI</div>'
)

# PDF & Scan
content = content.replace(
    'className="p-3.5 rounded-[1.25rem] bg-gradient-to-br from-cyan-600/30 via-teal-600/20 to-blue-600/20 hover:from-cyan-600/40 hover:to-blue-600/30 border border-cyan-500/30 hover:border-cyan-400/50 backdrop-blur-xl shadow-lg transition-all text-left group active:scale-95"',
    'className={`p-3.5 rounded-[1.25rem] backdrop-blur-xl shadow-lg transition-all text-left group active:scale-95 border ${isDarkMode ? \'bg-gradient-to-br from-cyan-600/30 via-teal-600/20 to-blue-600/20 hover:from-cyan-600/40 hover:to-blue-600/30 border-cyan-500/30 hover:border-cyan-400/50 text-white\' : \'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-300 text-slate-900 shadow-sm\'}`}'
)
content = content.replace(
    'className="text-xs font-black text-white group-hover:text-cyan-200 transition-colors">PDF & Scan</div>',
    'className={`text-xs font-black transition-colors ${isDarkMode ? \'text-white group-hover:text-cyan-200\' : \'text-slate-900 group-hover:text-cyan-600\'}`}>PDF & Scan</div>'
)
content = content.replace(
    'className="text-[9px] text-cyan-300/80 font-medium mt-0.5">Document to MCQ</div>',
    'className={`text-[9px] font-medium mt-0.5 ${isDarkMode ? \'text-cyan-300/80\' : \'text-slate-500\'}`}>Document to MCQ</div>'
)

# Paste JSON
content = content.replace(
    'className="p-3.5 rounded-[1.25rem] bg-gradient-to-br from-emerald-600/30 via-teal-600/20 to-green-600/20 hover:from-emerald-600/40 hover:to-green-600/30 border border-emerald-500/30 hover:border-emerald-400/50 backdrop-blur-xl shadow-lg transition-all text-left group active:scale-95"',
    'className={`p-3.5 rounded-[1.25rem] backdrop-blur-xl shadow-lg transition-all text-left group active:scale-95 border ${isDarkMode ? \'bg-gradient-to-br from-emerald-600/30 via-teal-600/20 to-green-600/20 hover:from-emerald-600/40 hover:to-green-600/30 border-emerald-500/30 hover:border-emerald-400/50 text-white\' : \'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-300 text-slate-900 shadow-sm\'}`}'
)
content = content.replace(
    'className="text-xs font-black text-white group-hover:text-emerald-200 transition-colors">Paste JSON</div>',
    'className={`text-xs font-black transition-colors ${isDarkMode ? \'text-white group-hover:text-emerald-200\' : \'text-slate-900 group-hover:text-emerald-600\'}`}>Paste JSON</div>'
)
content = content.replace(
    'className="text-[9px] text-emerald-300/80 font-medium mt-0.5">Direct Upload</div>',
    'className={`text-[9px] font-medium mt-0.5 ${isDarkMode ? \'text-emerald-300/80\' : \'text-slate-500\'}`}>Direct Upload</div>'
)

# Database
content = content.replace(
    'className="p-3.5 rounded-[1.25rem] bg-gradient-to-br from-amber-600/30 via-orange-600/20 to-yellow-600/20 hover:from-amber-600/40 hover:to-yellow-600/30 border border-amber-500/30 hover:border-amber-400/50 backdrop-blur-xl shadow-lg transition-all text-left group active:scale-95"',
    'className={`p-3.5 rounded-[1.25rem] backdrop-blur-xl shadow-lg transition-all text-left group active:scale-95 border ${isDarkMode ? \'bg-gradient-to-br from-amber-600/30 via-orange-600/20 to-yellow-600/20 hover:from-amber-600/40 hover:to-yellow-600/30 border-amber-500/30 hover:border-amber-400/50 text-white\' : \'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-300 text-slate-900 shadow-sm\'}`}'
)
content = content.replace(
    'className="text-xs font-black text-white group-hover:text-amber-200 transition-colors">Database</div>',
    'className={`text-xs font-black transition-colors ${isDarkMode ? \'text-white group-hover:text-amber-200\' : \'text-slate-900 group-hover:text-amber-600\'}`}>Database</div>'
)
content = content.replace(
    'className="text-[9px] text-amber-300/80 font-medium mt-0.5">MongoDB Cloud</div>',
    'className={`text-[9px] font-medium mt-0.5 ${isDarkMode ? \'text-amber-300/80\' : \'text-slate-500\'}`}>MongoDB Cloud</div>'
)

with open('App.tsx', 'w') as f:
    f.write(content)

print("Home Actions updated")
