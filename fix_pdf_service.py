with open('services/pdfService.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';",
    "// @ts-ignore\nimport * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';"
)
content = content.replace(
    "import { getDocument } from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';",
    "// @ts-ignore\nimport { getDocument } from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';"
)

with open('services/pdfService.ts', 'w') as f:
    f.write(content)
print("Fixed pdf service")
