import re

with open('server/aiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the EXPLANATION & CORRECTION INSTRUCTIONS to also include question highlight rules
pattern = re.compile(r'IMPORTANT EXPLANATION & CORRECTION INSTRUCTIONS:.*?Return valid JSON\.', re.DOTALL)

replacement = """CRITICAL HIGHLIGHTING & EXPLANATION INSTRUCTIONS:
      1. QUESTION TEXT HIGHLIGHTING: You MUST wrap the 1-2 most critical keywords in the question text with **bold** (e.g. "What is the **capital** of..."). If there are negative words like **NOT** or **INCORRECT**, bold them! Do this for EVERY question.
      2. EXPLANATION STRUCTURE: Do NOT write long story-like or essay paragraphs. The "explanation" MUST be structured using bold titles, italic emphasis, and bullet points.
      3. CORRECTIONS: If any answer choice represents a common misconception or incorrect trap, explicitly correct it and explain why the correct answer is right.
      4. FOLLOW-UP: Include an **AI Follow-up Concept Check** question at the end of the explanation.
      
      Follow this exact explanation structure (translate headings to ${language}):
      **Core Concept:** [Clear direct explanation]
      **Why Correct & Misconception Correction:** [Reasoning with *italic emphasis* and correcting incorrect traps]
      **Key Takeaways:**
      • [Point 1 with **bold keywords**]
      • [Point 2 with **bold keywords**]
      **AI Concept Check:** [A quick interactive follow-up question to verify mastery]
      
      Return valid JSON."""

if pattern.search(content):
    # This might match twice if there are two prompts (batch and chunk)
    content = pattern.sub(replacement, content)
    with open('server/aiService.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Pattern not found")
