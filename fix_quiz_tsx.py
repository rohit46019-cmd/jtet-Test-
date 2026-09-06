with open('components/Quiz.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "mode: 'PRACTICE', positiveMarks:",
    "mode: 'PRACTICE' as any, positiveMarks:"
)

content = content.replace(
    "mode: 'TEST', positiveMarks:",
    "mode: 'TEST' as any, positiveMarks:"
)

content = content.replace(
    "mode: 'PRACTICE' as const",
    "mode: 'PRACTICE' as any"
)

with open('components/Quiz.tsx', 'w') as f:
    f.write(content)

print("Fixed")
