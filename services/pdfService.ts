
declare const pdfjsLib: any;

/**
 * Extracts text from a PDF file using pdf.js with optimized parallel processing.
 * Implements batching to handle large files without crashing the browser tab.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  // Load pdf.js dynamically if not present
  if (typeof pdfjsLib === 'undefined') {
    await new Promise<void>((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
      script.type = 'module';
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ 
    data: arrayBuffer,
    stopAtErrors: false,
    isEvalSupported: false 
  }).promise;
  
  const numPages = pdf.numPages;
  const pageTexts: string[] = new Array(numPages);
  
  // Process in batches to balance speed and memory usage
  const BATCH_SIZE = 10; 
  for (let i = 0; i < numPages; i += BATCH_SIZE) {
    const batchPromises = [];
    for (let j = i; j < Math.min(i + BATCH_SIZE, numPages); j++) {
      batchPromises.push(
        pdf.getPage(j + 1).then(async (page: any) => {
          const content = await page.getTextContent();
          // Faster text joining for large pages
          const strings = content.items.map((item: any) => item.str);
          pageTexts[j] = strings.join(' ');
        })
      );
    }
    await Promise.all(batchPromises);
  }

  // Efficiently join large arrays of strings
  return pageTexts.join('\n').trim();
}
