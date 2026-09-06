with open('server/aiService.ts', 'r') as f:
    content = f.read()

content = content.replace(
    '    language,\n    difficulty\n  };',
    '    language\n  };'
)

with open('server/aiService.ts', 'w') as f:
    f.write(content)
