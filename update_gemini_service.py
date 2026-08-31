import re

with open('services/geminiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace CRITICAL RULES section 1
pattern1 = re.compile(r'CRITICAL RULES:\n1\. Each question must have EXACTLY 4 plausible options\.\n2\. Provide a 0-indexed \'correctAnswerIndex\' \(0, 1, 2, or 3\)\.\n3\. Include a comprehensive explanation justifying the correct answer\.\n4\. Output strict JSON matching the schema\.', re.DOTALL)

replacement1 = """CRITICAL RULES:
1. Each question must have EXACTLY 4 plausible options.
2. Provide a 0-indexed 'correctAnswerIndex' (0, 1, 2, or 3).
3. Include a comprehensive explanation justifying the correct answer.
4. HIGHLIGHTING: You MUST wrap the 1-2 most critical keywords in the question text with **bold** (e.g. "What is the **capital** of...").
5. Output strict JSON matching the schema."""

if pattern1.search(content):
    content = pattern1.sub(replacement1, content)
    print("Replaced pattern 1")

# Replace CRITICAL RULES section 2
pattern2 = re.compile(r'CRITICAL RULES:\n1\. Formulate conceptual questions strictly based on the text\.\n2\. Each question MUST have exactly 4 options\.\n3\. Provide a 0-indexed \'correctAnswerIndex\' \(0, 1, 2, or 3\)\.\n4\. Include a detailed explanation\.\n5\. Return valid JSON matching schema\.', re.DOTALL)

replacement2 = """CRITICAL RULES:
1. Formulate conceptual questions strictly based on the text.
2. Each question MUST have exactly 4 options.
3. Provide a 0-indexed 'correctAnswerIndex' (0, 1, 2, or 3).
4. Include a detailed explanation.
5. HIGHLIGHTING: You MUST wrap the 1-2 most critical keywords in the question text with **bold** (e.g. "What is the **capital** of...").
6. Return valid JSON matching schema."""

if pattern2.search(content):
    content = pattern2.sub(replacement2, content)
    print("Replaced pattern 2")

with open('services/geminiService.ts', 'w', encoding='utf-8') as f:
    f.write(content)

