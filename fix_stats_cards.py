import re
with open('App.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "'bg-white/10 border-white/10'",
    "'bg-white/20 border-white/30 shadow-sm drop-shadow-sm'"
)
# Make text inside stats cards pure white in light mode instead of whatever it is
# Let's check what color it is
with open('App.tsx', 'w') as f:
    f.write(content)
