with open('server/aiService.ts', 'r') as f:
    content = f.read()

# Replace difficulty with something else, or remove it.
# Actually, the error is it's not in QuizData. QuizData has id, title, topic, questions.
content = content.replace(
    'difficulty: "medium",\n',
    ''
)
content = content.replace(
    'difficulty: "medium"',
    ''
)

with open('server/aiService.ts', 'w') as f:
    f.write(content)
print("Fixed aiService")
