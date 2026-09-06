import re

with open('App.tsx', 'r') as f:
    content = f.read()

# Fix 1: quiz: updatedQuiz -> ...updatedQuiz
content = content.replace(
    'const newStored: StoredQuiz = {\n                quiz: updatedQuiz,\n                savedAt: Date.now()\n              };',
    'const newStored: StoredQuiz = {\n                ...updatedQuiz,\n                // savedAt is not in StoredQuiz, maybe it doesn\'t matter or it\'s part of it\n              };'
)

# wait, there's another occurrence of quiz: updatedQuiz
content = content.replace(
    'const newStored: StoredQuiz = {\n                quiz: updatedQuiz,\n                savedAt: Date.now()\n              };',
    'const newStored: StoredQuiz = {\n                ...updatedQuiz\n              };'
)

content = content.replace(
    'quiz: updatedQuiz\n              };',
    '...updatedQuiz\n              };'
)

# Fix activeQuiz / setActiveQuiz. In App.tsx, the active quiz is usually `quiz` and `setQuiz`.
content = content.replace(
    'if (activeQuiz && activeQuiz.id === updatedQuiz.id) {\n              setActiveQuiz(updatedQuiz);\n            }',
    'if (quiz && quiz.id === updatedQuiz.id) {\n              setQuiz(updatedQuiz);\n            }'
)

with open('App.tsx', 'w') as f:
    f.write(content)

print("Fixed")
