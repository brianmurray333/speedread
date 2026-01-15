// Content types for mixed word/image flow
export type ContentItem = 
  | { type: 'word'; value: string }
  | { type: 'image'; src: string; alt?: string; pageNum: number; width?: number; height?: number }

// Legacy function for backward compatibility
export function parseTextToWords(text: string): string[] {
  return parseTextToContentItems(text)
    .filter((item): item is { type: 'word'; value: string } => item.type === 'word')
    .map(item => item.value)
}

// Convert text to content items with smarter filtering
export function parseTextToContentItems(text: string): ContentItem[] {
  // Split by whitespace and filter
  const rawWords = text
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length > 0)

  const contentItems: ContentItem[] = []
  let consecutiveNumbers = 0
  let consecutiveShortTokens = 0

  for (let i = 0; i < rawWords.length; i++) {
    const word = rawWords[i]
    
    // Skip if it fails basic filtering
    if (!passesBasicFilter(word)) {
      consecutiveNumbers = 0
      consecutiveShortTokens = 0
      continue
    }

    // Check for chart/table patterns
    if (isChartLikePattern(word, rawWords, i)) {
      consecutiveNumbers++
      consecutiveShortTokens++
      // Skip if we're in a sequence of chart-like data
      if (consecutiveNumbers > 3 || consecutiveShortTokens > 5) {
        continue
      }
    } else {
      consecutiveNumbers = 0
      consecutiveShortTokens = 0
    }

    // Split hyphenated words
    const splitWords = splitHyphenatedWord(word)
    for (const w of splitWords) {
      contentItems.push({ type: 'word', value: w })
    }
  }

  return contentItems
}

// Basic filter: must have at least one letter or number
function passesBasicFilter(word: string): boolean {
  if (word.length === 0) return false
  // Must contain at least one letter or number
  if (!/[a-zA-Z0-9]/.test(word)) return false
  // Skip URLs - they're not readable in speed reading
  if (isUrl(word)) return false
  return true
}

// Detect URLs
function isUrl(word: string): boolean {
  // Match common URL patterns
  const urlPatterns = [
    /^https?:\/\//i,           // http:// or https://
    /^www\./i,                  // www.
    /\.(com|org|net|edu|gov|io|co|me|app|dev|ai)\b/i,  // common TLDs
    /^[a-z0-9-]+\.[a-z]{2,}/i,  // domain.tld pattern
  ]
  return urlPatterns.some(pattern => pattern.test(word))
}

// Detect chart/table-like patterns
function isChartLikePattern(word: string, allWords: string[], index: number): boolean {
  // Pure number or percentage (axis labels)
  if (/^[\d,.]+%?$/.test(word)) return true
  
  // Grid references (A1, B2, etc.)
  if (/^[A-Z]\d+$/i.test(word) && word.length <= 3) return true
  
  // Single letter/number that's not a common word
  if (word.length === 1 && !/^[aAiI]$/.test(word)) return true
  
  // Repeated short fragments in sequence (table cells)
  if (word.length <= 2) {
    const prevWord = index > 0 ? allWords[index - 1] : ''
    const nextWord = index < allWords.length - 1 ? allWords[index + 1] : ''
    if (prevWord.length <= 2 && nextWord.length <= 2) {
      return true
    }
  }
  
  // Axis label patterns (0, 10, 20, 30... or 0%, 25%, 50%...)
  if (/^\d+%?$/.test(word)) {
    const num = parseInt(word)
    // Check if surrounded by other numbers in a sequence pattern
    const prevNum = index > 0 ? parseInt(allWords[index - 1]) : NaN
    const nextNum = index < allWords.length - 1 ? parseInt(allWords[index + 1]) : NaN
    
    if (!isNaN(prevNum) && !isNaN(nextNum)) {
      // Check for evenly spaced sequence
      const diff1 = num - prevNum
      const diff2 = nextNum - num
      if (Math.abs(diff1 - diff2) < 2 && diff1 > 0) {
        return true
      }
    }
  }
  
  // Figure/table captions without context
  if (/^(Figure|Fig\.|Table|Chart|Graph)$/i.test(word)) {
    const nextWord = index < allWords.length - 1 ? allWords[index + 1] : ''
    // If followed by just a number, likely a label
    if (/^\d+\.?:?$/.test(nextWord)) {
      return true
    }
  }

  return false
}

// Split hyphenated words into separate parts
function splitHyphenatedWord(word: string): string[] {
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

// Text item with position data from PDF.js
interface TextItemWithPosition {
  str: string
  transform: number[]  // [scaleX, skewX, skewY, scaleY, translateX, translateY]
  width: number
  height: number
}

// Check if an item is a TextItem (has str property)
function isTextItem(item: unknown): item is { str: string; transform?: number[]; width?: number; height?: number } {
  return typeof item === 'object' && item !== null && 'str' in item
}

// Filter text items based on position heuristics
function filterTextItemsByPosition(items: TextItemWithPosition[]): TextItemWithPosition[] {
  if (items.length === 0) return items
  
  // Calculate statistics for rotation detection
  const rotatedItems: TextItemWithPosition[] = []
  const normalItems: TextItemWithPosition[] = []
  
  for (const item of items) {
    if (!item.str.trim()) continue
    
    const [scaleX, skewX, skewY] = item.transform
    
    // Check for rotation (non-zero skew indicates rotation)
    const isRotated = Math.abs(skewX) > 0.1 || Math.abs(skewY) > 0.1
    
    // Check for very small scale (might be subscript/superscript in charts)
    const isTiny = Math.abs(scaleX) < 6
    
    if (isRotated || isTiny) {
      rotatedItems.push(item)
    } else {
      normalItems.push(item)
    }
  }
  
  // If most text is "normal", filter out rotated text (likely axis labels)
  if (normalItems.length > rotatedItems.length * 2) {
    return normalItems
  }
  
  return items
}

interface ExtractedImage {
  src: string
  width: number
  height: number
  pageNum: number
  yPosition: number  // For ordering
}

// Extract images from a PDF page using canvas rendering
async function extractImagesFromPage(
  page: { getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>; objs: { get: (name: string, callback: (img: unknown) => void) => void } }, 
  pageNum: number
): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = []
  
  try {
    const operatorList = await page.getOperatorList()
    const pdfjsLib = await import('pdfjs-dist')
    const { OPS } = pdfjsLib
    
    // Track image objects we've seen
    const seenImages = new Set<string>()
    
    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fnId = operatorList.fnArray[i]
      const args = operatorList.argsArray[i]
      
      // Check if this is an image painting operation
      if (fnId === OPS.paintImageXObject) {
        const imageName = args[0] as string
        
        if (seenImages.has(imageName)) continue
        seenImages.add(imageName)
        
        try {
          // Get the image object
          const imgData = await new Promise<{
            width: number
            height: number
            data?: Uint8ClampedArray
            src?: string
          } | null>((resolve) => {
            page.objs.get(imageName, (img: unknown) => {
              resolve(img as { width: number; height: number; data?: Uint8ClampedArray; src?: string } | null)
            })
          })
          
          if (!imgData) continue
          
          // Skip very small images (likely icons or artifacts)
          if (imgData.width < 50 || imgData.height < 50) continue
          
          // Skip very wide/short images (likely decorative lines)
          const aspectRatio = imgData.width / imgData.height
          if (aspectRatio > 10 || aspectRatio < 0.1) continue
          
          let src: string
          
          if (imgData.src) {
            // Already have a data URL
            src = imgData.src
          } else if (imgData.data) {
            // Convert raw image data to data URL
            src = await imageDataToDataURL(imgData.data, imgData.width, imgData.height)
          } else {
            continue
          }
          
          images.push({
            src,
            width: imgData.width,
            height: imgData.height,
            pageNum,
            yPosition: 0  // We'll estimate position based on order
          })
        } catch (e) {
          // Skip images that fail to extract
          console.warn('Failed to extract image:', imageName, e)
        }
      }
    }
  } catch (e) {
    console.warn('Failed to get operator list for page:', pageNum, e)
  }
  
  return images
}

// Convert raw image data to a data URL
async function imageDataToDataURL(
  data: Uint8ClampedArray, 
  width: number, 
  height: number
): Promise<string> {
  // Create a canvas to draw the image
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('Could not get canvas context')
  }
  
  // Handle different data formats
  let rgbaData: Uint8ClampedArray
  
  if (data.length === width * height * 4) {
    // RGBA format - use directly
    rgbaData = data
  } else if (data.length === width * height * 3) {
    // RGB format - need to convert to RGBA
    rgbaData = new Uint8ClampedArray(width * height * 4)
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
      rgbaData[j] = data[i]       // R
      rgbaData[j + 1] = data[i + 1] // G
      rgbaData[j + 2] = data[i + 2] // B
      rgbaData[j + 3] = 255         // A
    }
  } else if (data.length === width * height) {
    // Grayscale - convert to RGBA
    rgbaData = new Uint8ClampedArray(width * height * 4)
    for (let i = 0, j = 0; i < data.length; i++, j += 4) {
      rgbaData[j] = data[i]       // R
      rgbaData[j + 1] = data[i]   // G
      rgbaData[j + 2] = data[i]   // B
      rgbaData[j + 3] = 255       // A
    }
  } else {
    throw new Error(`Unknown image data format: ${data.length} bytes for ${width}x${height}`)
  }
  
  // Create ImageData and draw to canvas
  // Create a fresh Uint8ClampedArray to avoid SharedArrayBuffer issues
  const safeRgbaData = new Uint8ClampedArray(width * height * 4)
  safeRgbaData.set(rgbaData)
  const imageData = new ImageData(safeRgbaData, width, height)
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

// Full PDF extraction with text and images
export interface PDFExtractionResult {
  text: string
  contentItems: ContentItem[]
  images: ExtractedImage[]
}

// Client-side only PDF extraction
export async function extractTextFromPDF(file: File): Promise<string> {
  const result = await extractContentFromPDF(file)
  return result.text
}

// Full content extraction (text + images)
export async function extractContentFromPDF(file: File): Promise<PDFExtractionResult> {
  // Dynamically import pdfjs-dist only on the client
  const pdfjsLib = await import('pdfjs-dist')
  
  // Set worker path for PDF.js - use local copy from public folder
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  let fullText = ''
  const allImages: ExtractedImage[] = []
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    
    // Extract text with position data
    const textContent = await page.getTextContent()
    const textItems: TextItemWithPosition[] = []
    
    for (const item of textContent.items) {
      if (isTextItem(item) && item.transform) {
        textItems.push({
          str: item.str,
          transform: item.transform,
          width: item.width || 0,
          height: item.height || 0
        })
      }
    }
    
    // Filter by position and concatenate
    const filteredItems = filterTextItemsByPosition(textItems)
    const pageText = filteredItems.map(item => item.str).join(' ')
    fullText += pageText + ' '
    
    // Extract images from this page
    const pageImages = await extractImagesFromPage(page, i)
    allImages.push(...pageImages)
  }
  
  const cleanedText = fullText.trim()
  
  // Build content items, interleaving images at page boundaries
  const contentItems: ContentItem[] = []
  
  // For now, insert images at the beginning of the content
  // A more sophisticated approach would track text positions per page
  for (const image of allImages) {
    contentItems.push({
      type: 'image',
      src: image.src,
      pageNum: image.pageNum,
      width: image.width,
      height: image.height,
      alt: `Image from page ${image.pageNum}`
    })
  }
  
  // Add all text content items
  const textContentItems = parseTextToContentItems(cleanedText)
  contentItems.push(...textContentItems)
  
  return {
    text: cleanedText,
    contentItems,
    images: allImages
  }
}

// Smart content extraction that interleaves images with text
export async function extractSmartContentFromPDF(file: File): Promise<ContentItem[]> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  const allContent: ContentItem[] = []
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    
    // Extract images first (they often come before text conceptually)
    const pageImages = await extractImagesFromPage(page, pageNum)
    
    // Extract text
    const textContent = await page.getTextContent()
    const textItems: TextItemWithPosition[] = []
    
    for (const item of textContent.items) {
      if (isTextItem(item) && item.transform) {
        textItems.push({
          str: item.str,
          transform: item.transform,
          width: item.width || 0,
          height: item.height || 0
        })
      }
    }
    
    const filteredItems = filterTextItemsByPosition(textItems)
    const pageText = filteredItems.map(item => item.str).join(' ')
    const pageContentItems = parseTextToContentItems(pageText)
    
    // Add text first, then images at the end of each page's text
    // This keeps reading flow natural - you read about something, then see the figure
    allContent.push(...pageContentItems)
    
    // Add images from this page
    for (const image of pageImages) {
      allContent.push({
        type: 'image',
        src: image.src,
        pageNum: image.pageNum,
        width: image.width,
        height: image.height,
        alt: `Figure from page ${image.pageNum}`
      })
    }
  }
  
  return allContent
}
