export function parseTextToWords(text: string): string[] {
  // Split by whitespace and filter out:
  // - Empty strings
  // - Pure symbols/special characters (no letters or numbers)
  // - Very short non-word tokens
  return text
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => {
      if (word.length === 0) return false
      // Must contain at least one letter or number
      if (!/[a-zA-Z0-9]/.test(word)) return false
      return true
    })
    .flatMap(word => {
      // Split hyphenated words into separate words
      // e.g., "hyper-parameters" becomes ["hyper-", "parameters"]
      if (word.includes('-') && word.length > 1) {
        const parts = word.split('-')
        // Only split if we have multiple meaningful parts
        if (parts.length > 1 && parts.every(p => p.length > 0)) {
          return parts.map((part, i) => 
            i < parts.length - 1 ? part + '-' : part
          )
        }
      }
      return [word]
    })
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
  
  // Set worker path for PDF.js - use local copy from public folder
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

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
