import re

with open('components/Quiz.tsx', 'r') as f:
    content = f.read()

target = "px-0 sm:px-4 pt-1.5 pb-6 relative touch-pan-y"
replacement = "px-0 sm:px-4 pt-1.5 pb-28 relative touch-pan-y"

if target in content:
    content = content.replace(target, replacement)
    with open('components/Quiz.tsx', 'w') as f:
        f.write(content)
    print("Padding updated.")
else:
    print("Padding target not found.")

