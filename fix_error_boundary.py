with open('index.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'return this.props.children;',
    'return (this as any).props.children;'
)

with open('index.tsx', 'w') as f:
    f.write(content)
print("Fixed error boundary")
