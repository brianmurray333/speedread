export function parseTextToWords(text: string): string[] {
  // Split by whitespace and filter empty strings
  return text
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word.trim())
}

export function calculateORP(word: string): number {
  // Optimal Recognition Point (ORP) calculation
  // Based on research, the ORP is typically:
  // - 1 char word: position 0
  // - 2-5 char word: position 1
  // - 6-9 char word: position 2
  // - 10-13 char word: position 3
  // - 14+ char word: position 4
  
  const length = word.length
  
  if (length <= 1) return 0
  if (length <= 5) return 1
  if (length <= 9) return 2
  if (length <= 13) return 3
  return 4
}

// Client-side only PDF extraction
export async function extractTextFromPDF(file: File): Promise<string> {
  // Dynamically import pdfjs-dist only on the client
  const pdfjsLib = await import('pdfjs-dist')
  
  // Set worker path for PDF.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  let fullText = ''
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    fullText += pageText + ' '
  }
  
  return fullText.trim()
}
