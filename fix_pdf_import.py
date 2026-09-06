with open('services/pdfService.ts', 'r') as f:
    content = f.read()

content = content.replace(
    "const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');",
    "// @ts-ignore\n  const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');"
)

with open('services/pdfService.ts', 'w') as f:
    f.write(content)
