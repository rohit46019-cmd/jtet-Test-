import re

with open('App.tsx', 'r') as f:
    content = f.read()

# We need to replace the themeGradients array with a dynamic one that checks isDarkMode.
# Let's extract everything from `const themeGradients = [` to `];\n                        const theme =`

target_start = "const themeGradients = ["
target_end = "];\n                        const theme ="

start_idx = content.find(target_start)
end_idx = content.find(target_end, start_idx) + 2

if start_idx != -1 and end_idx > 1:
    new_theme = """const themeGradients = [
                          {
                            bg: isDarkMode ? 'from-violet-900/40 via-purple-900/20 to-slate-900/60' : 'from-violet-100 via-violet-50 to-white',
                            border: isDarkMode ? 'border-violet-500/30 hover:border-violet-400/60' : 'border-violet-200 hover:border-violet-300',
                            glow: isDarkMode ? 'shadow-violet-950/30' : 'shadow-violet-100',
                            iconBg: 'from-violet-500 to-indigo-600',
                            accentText: isDarkMode ? 'text-violet-300' : 'text-violet-700',
                            chipBg: isDarkMode ? 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20 text-violet-200' : 'bg-violet-100 hover:bg-violet-200 border-violet-200 text-violet-800'
                          },
                          {
                            bg: isDarkMode ? 'from-cyan-900/40 via-teal-900/20 to-slate-900/60' : 'from-cyan-100 via-cyan-50 to-white',
                            border: isDarkMode ? 'border-cyan-500/30 hover:border-cyan-400/60' : 'border-cyan-200 hover:border-cyan-300',
                            glow: isDarkMode ? 'shadow-cyan-950/30' : 'shadow-cyan-100',
                            iconBg: 'from-cyan-500 to-teal-600',
                            accentText: isDarkMode ? 'text-cyan-300' : 'text-cyan-700',
                            chipBg: isDarkMode ? 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20 text-cyan-200' : 'bg-cyan-100 hover:bg-cyan-200 border-cyan-200 text-cyan-800'
                          },
                          {
                            bg: isDarkMode ? 'from-rose-900/40 via-pink-900/20 to-slate-900/60' : 'from-rose-100 via-rose-50 to-white',
                            border: isDarkMode ? 'border-rose-500/30 hover:border-rose-400/60' : 'border-rose-200 hover:border-rose-300',
                            glow: isDarkMode ? 'shadow-rose-950/30' : 'shadow-rose-100',
                            iconBg: 'from-rose-500 to-pink-600',
                            accentText: isDarkMode ? 'text-rose-300' : 'text-rose-700',
                            chipBg: isDarkMode ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-200' : 'bg-rose-100 hover:bg-rose-200 border-rose-200 text-rose-800'
                          },
                          {
                            bg: isDarkMode ? 'from-amber-900/40 via-orange-900/20 to-slate-900/60' : 'from-amber-100 via-amber-50 to-white',
                            border: isDarkMode ? 'border-amber-500/30 hover:border-amber-400/60' : 'border-amber-200 hover:border-amber-300',
                            glow: isDarkMode ? 'shadow-amber-950/30' : 'shadow-amber-100',
                            iconBg: 'from-amber-500 to-orange-600',
                            accentText: isDarkMode ? 'text-amber-300' : 'text-amber-700',
                            chipBg: isDarkMode ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-200' : 'bg-amber-100 hover:bg-amber-200 border-amber-200 text-amber-800'
                          },
                          {
                            bg: isDarkMode ? 'from-emerald-900/40 via-green-900/20 to-slate-900/60' : 'from-emerald-100 via-emerald-50 to-white',
                            border: isDarkMode ? 'border-emerald-500/30 hover:border-emerald-400/60' : 'border-emerald-200 hover:border-emerald-300',
                            glow: isDarkMode ? 'shadow-emerald-950/30' : 'shadow-emerald-100',
                            iconBg: 'from-emerald-500 to-teal-600',
                            accentText: isDarkMode ? 'text-emerald-300' : 'text-emerald-700',
                            chipBg: isDarkMode ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-200' : 'bg-emerald-100 hover:bg-emerald-200 border-emerald-200 text-emerald-800'
                          }
                        ];"""
    
    content = content[:start_idx] + new_theme + content[end_idx:]

# Also replace text-white inside the category card with dynamic text
content = content.replace(
    '<h4 className="font-black text-sm sm:text-base text-white mb-1 leading-tight drop-shadow-sm group-hover:text-blue-200 transition-colors truncate">',
    '<h4 className={`font-black text-sm sm:text-base mb-1 leading-tight drop-shadow-sm transition-colors truncate ${isDarkMode ? \'text-white group-hover:text-blue-200\' : \'text-slate-900 group-hover:text-blue-700\'}`}>'
)

# And replace the text color of the small stats pill
content = content.replace(
    'className="inline-flex px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white/80 border border-white/10 text-[8.5px] font-black uppercase tracking-widest shadow-inner"',
    'className={`inline-flex px-2 py-0.5 rounded-full backdrop-blur-md text-[8.5px] font-black uppercase tracking-widest shadow-inner border ${isDarkMode ? \'bg-black/40 text-white/80 border-white/10\' : \'bg-black/10 text-slate-800 border-black/10\'}`}'
)

with open('App.tsx', 'w') as f:
    f.write(content)
print("Explore Categories Updated")
