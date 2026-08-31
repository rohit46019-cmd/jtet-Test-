import re

with open('components/Quiz.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace highlightQuestionText function
pattern = re.compile(r'const highlightQuestionText = \(text: string\) => \{.*?return <span key=\{idx\}>\{part\}</span>;\n  \}\);\n\};', re.DOTALL)

replacement = """const highlightQuestionText = (text: string) => {
  if (!text) return null;

  // 1. If text already has markdown asterisks (**bold** or *italic*), format them with vivid highlight styling
  if (text.includes('**') || text.includes('*')) {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <span 
            key={idx} 
            className="inline-block font-black text-amber-900 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-500/25 px-1.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-500/40 mx-0.5 shadow-2xs"
          >
            {part.slice(2, -2)}
          </span>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <span 
            key={idx} 
            className="inline-block font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/40 mx-0.5"
          >
            {part.slice(1, -1)}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  }

  // 2. Return plain text if no markdown highlights are present
  return <span>{text}</span>;
};"""

if pattern.search(content):
    content = pattern.sub(replacement, content)
    with open('components/Quiz.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Pattern not found")
