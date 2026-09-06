import re

with open('App.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<h3 className="text-xs font-black uppercase tracking-widest text-white/90 flex items-center gap-1.5 drop-shadow-md">',
    '<h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-1.5 drop-shadow-md ${isDarkMode ? \'text-white/90\' : \'text-slate-800\'}`}>'
)

content = content.replace(
    'className="text-[9.5px] font-black uppercase tracking-widest text-violet-300 hover:text-white bg-violet-950/40 hover:bg-violet-900/60 backdrop-blur-md px-3 py-1 rounded-full border border-violet-500/30 flex items-center gap-1 transition-all shadow-sm"',
    'className={`text-[9.5px] font-black uppercase tracking-widest backdrop-blur-md px-3 py-1 rounded-full border flex items-center gap-1 transition-all shadow-sm ${isDarkMode ? \'text-violet-300 hover:text-white bg-violet-950/40 hover:bg-violet-900/60 border-violet-500/30\' : \'text-violet-700 hover:text-violet-900 bg-violet-100 hover:bg-violet-200 border-violet-300\'}`}'
)

with open('App.tsx', 'w') as f:
    f.write(content)

print("Title Updated")
