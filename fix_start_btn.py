import re

with open('App.tsx', 'r') as f:
    content = f.read()

# using regex
pattern = r'className="px-2 py-0.5 bg-blue-600 text-white rounded-lg font-black text-\[8px\] uppercase tracking-wider hover:bg-blue-700 transition-all shadow-2xs active:scale-95 flex items-center gap-0.5"\s*>\s*<Play size=\{8\} fill="currentColor" /> Start\s*</button>'
replacement = 'className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:from-emerald-400 hover:to-teal-400 transition-all shadow-md shadow-emerald-500/30 active:scale-95 flex items-center gap-1">\n                                 <Play size={10} fill="currentColor" /> START\n                               </button>'

content, count = re.subn(pattern, replacement, content)

if count > 0:
    with open('App.tsx', 'w') as f:
        f.write(content)
    print(f"Replaced {count} instances.")
else:
    print("No matches found.")
