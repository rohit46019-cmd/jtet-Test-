import re

with open('App.tsx', 'r') as f:
    content = f.read()

# Replace Quiz with StoredQuiz in the handleUpdateQuiz parameter
content = content.replace(
    'const handleUpdateQuiz = (updatedQuiz: Quiz) => {',
    'const handleUpdateQuiz = (updatedQuiz: StoredQuiz) => {'
)

with open('App.tsx', 'w') as f:
    f.write(content)

print("Fixed handleUpdateQuiz")
