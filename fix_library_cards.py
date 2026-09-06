with open('App.tsx', 'r') as f:
    content = f.read()

target = "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
replacement = "bg-gradient-to-br from-white to-indigo-50/30 border-indigo-100/80 hover:border-indigo-300 hover:from-indigo-50 hover:to-purple-50"

content = content.replace(target, replacement)

# Add colorful random icons or keep the existing topic images
with open('App.tsx', 'w') as f:
    f.write(content)

print("Library cards colorful")
