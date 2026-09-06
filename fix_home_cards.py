import re

with open('App.tsx', 'r') as f:
    lines = f.readlines()

def replace_in_line(line_num, old, new):
    lines[line_num] = lines[line_num].replace(old, new)

# PDF (line 1764, 1769)
# Emerald (line 1776, 1781)
# Amber (line 1788, 1793)

for i, line in enumerate(lines):
    if "from-cyan-600/30" in line and "bg-gradient-to-br from-violet-50" in line:
        lines[i] = line.replace("'bg-gradient-to-br from-violet-50 to-fuchsia-50 hover:from-violet-100 hover:to-fuchsia-100 border-violet-200 hover:border-violet-300 text-violet-900 shadow-sm'", "'bg-gradient-to-br from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 border-cyan-200 hover:border-cyan-300 text-cyan-900 shadow-sm'")
    elif "from-emerald-600/30" in line and "bg-gradient-to-br from-violet-50" in line:
        lines[i] = line.replace("'bg-gradient-to-br from-violet-50 to-fuchsia-50 hover:from-violet-100 hover:to-fuchsia-100 border-violet-200 hover:border-violet-300 text-violet-900 shadow-sm'", "'bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-emerald-200 hover:border-emerald-300 text-emerald-900 shadow-sm'")
    elif "from-amber-600/30" in line and "bg-gradient-to-br from-violet-50" in line:
        lines[i] = line.replace("'bg-gradient-to-br from-violet-50 to-fuchsia-50 hover:from-violet-100 hover:to-fuchsia-100 border-violet-200 hover:border-violet-300 text-violet-900 shadow-sm'", "'bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-amber-200 hover:border-amber-300 text-amber-900 shadow-sm'")
        
    # Text colors
    if "PDF & Scan" in line:
        lines[i] = line.replace("'text-violet-900 group-hover:text-violet-700'", "'text-cyan-900 group-hover:text-cyan-700'")
    elif "Paste JSON" in line:
        lines[i] = line.replace("'text-violet-900 group-hover:text-violet-700'", "'text-emerald-900 group-hover:text-emerald-700'")
    elif "Database" in line and "text-violet-900" in line:
        lines[i] = line.replace("'text-violet-900 group-hover:text-violet-700'", "'text-amber-900 group-hover:text-amber-700'")

with open('App.tsx', 'w') as f:
    f.writelines(lines)

print("Fixed")
