with open('App.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'className="w-10 h-10 shrink-0 rounded-[0.8rem] object-cover border shadow-sm ${isDarkMode ? \'border-slate-700\' : \'border-slate-200\'}"',
    'className={`w-10 h-10 shrink-0 rounded-[0.8rem] object-cover border shadow-sm ${isDarkMode ? \'border-slate-700\' : \'border-slate-200\'}`}'
)

with open('App.tsx', 'w') as f:
    f.write(content)

print("Fixed quotes")
