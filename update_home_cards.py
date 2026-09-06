import re

with open('App.tsx', 'r') as f:
    content = f.read()

# AI Forge
content = content.replace(
    "'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-300 text-slate-900 shadow-sm'",
    "'bg-gradient-to-br from-violet-50 to-fuchsia-50 hover:from-violet-100 hover:to-fuchsia-100 border-violet-200 hover:border-violet-300 text-violet-900 shadow-sm'"
)
content = content.replace(
    "'text-slate-900 group-hover:text-violet-600'",
    "'text-violet-900 group-hover:text-violet-700'"
)

# PDF & Scan
content = content.replace(
    "'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-300 text-slate-900 shadow-sm'",
    "'bg-gradient-to-br from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 border-cyan-200 hover:border-cyan-300 text-cyan-900 shadow-sm'"
)
content = content.replace(
    "'text-slate-900 group-hover:text-cyan-600'",
    "'text-cyan-900 group-hover:text-cyan-700'"
)

# Paste JSON
content = content.replace(
    "'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-300 text-slate-900 shadow-sm'",
    "'bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-emerald-200 hover:border-emerald-300 text-emerald-900 shadow-sm'"
)
content = content.replace(
    "'text-slate-900 group-hover:text-emerald-600'",
    "'text-emerald-900 group-hover:text-emerald-700'"
)

# Database
content = content.replace(
    "'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-300 text-slate-900 shadow-sm'",
    "'bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-amber-200 hover:border-amber-300 text-amber-900 shadow-sm'"
)
content = content.replace(
    "'text-slate-900 group-hover:text-amber-600'",
    "'text-amber-900 group-hover:text-amber-700'"
)

# Fix double replacements if they were matched by the first one (since they all had the same original string)
with open('App.tsx', 'w') as f:
    f.write(content)
print("Updated")
