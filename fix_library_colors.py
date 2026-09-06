import re

with open('App.tsx', 'r') as f:
    content = f.read()

# I will replace the Library quiz map function to use a similar theme logic.

target = """                        const catObj = categories.find(c => c.id === q.categoryId);
                        const subCatObj = categories.find(c => c.id === q.subCategoryId);
                        return (
                          <div key={q.id} className={`group p-2.5 rounded-2xl border shadow-sm hover:shadow-md hover:scale-[1.01] transition-all flex items-center gap-3 ${isDarkMode ? 'bg-slate-900/80 border-slate-700/80 hover:border-indigo-500/50 hover:bg-slate-800/80' : 'bg-gradient-to-br from-white to-indigo-50/30 border-indigo-100/80 hover:border-indigo-300 hover:from-indigo-50 hover:to-purple-50'}`}>"""

replacement = """                        const catObj = categories.find(c => c.id === q.categoryId);
                        const subCatObj = categories.find(c => c.id === q.subCategoryId);
                        
                        // Pick theme based on category index for colorful library boxes
                        const rootCats = categories.filter(c => !c.parentId);
                        const catIndex = rootCats.findIndex(c => c.id === q.categoryId);
                        const tIndex = catIndex >= 0 ? catIndex : 0;
                        const libThemes = [
                          {
                            bg: isDarkMode ? 'bg-violet-950/40 hover:bg-violet-900/60' : 'bg-gradient-to-br from-violet-50/80 to-fuchsia-50 border-violet-100',
                            border: isDarkMode ? 'border-violet-900/50 hover:border-violet-700' : 'hover:border-violet-300',
                          },
                          {
                            bg: isDarkMode ? 'bg-cyan-950/40 hover:bg-cyan-900/60' : 'bg-gradient-to-br from-cyan-50/80 to-teal-50 border-cyan-100',
                            border: isDarkMode ? 'border-cyan-900/50 hover:border-cyan-700' : 'hover:border-cyan-300',
                          },
                          {
                            bg: isDarkMode ? 'bg-rose-950/40 hover:bg-rose-900/60' : 'bg-gradient-to-br from-rose-50/80 to-pink-50 border-rose-100',
                            border: isDarkMode ? 'border-rose-900/50 hover:border-rose-700' : 'hover:border-rose-300',
                          },
                          {
                            bg: isDarkMode ? 'bg-amber-950/40 hover:bg-amber-900/60' : 'bg-gradient-to-br from-amber-50/80 to-orange-50 border-amber-100',
                            border: isDarkMode ? 'border-amber-900/50 hover:border-amber-700' : 'hover:border-amber-300',
                          },
                          {
                            bg: isDarkMode ? 'bg-emerald-950/40 hover:bg-emerald-900/60' : 'bg-gradient-to-br from-emerald-50/80 to-teal-50 border-emerald-100',
                            border: isDarkMode ? 'border-emerald-900/50 hover:border-emerald-700' : 'hover:border-emerald-300',
                          }
                        ];
                        const lTheme = libThemes[tIndex % libThemes.length];

                        return (
                          <div key={q.id} className={`group p-2.5 rounded-2xl border shadow-sm hover:shadow-md hover:scale-[1.01] transition-all flex items-center gap-3 ${lTheme.bg} ${lTheme.border}`}>"""

content = content.replace(target, replacement)

with open('App.tsx', 'w') as f:
    f.write(content)

print("Library Updated")
