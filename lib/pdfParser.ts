// Content types for mixed word/image/section flow
export type ContentItem = 
  | { type: 'word'; value: string }
  | { type: 'image'; src: string; alt?: string; pageNum: number; width?: number; height?: number }
  | { type: 'section'; title: string }

// Section definition from AI analysis
export interface DocumentSection {
  name: string
  startPage: number
  endPage: number
  priority: number
  skip: boolean
}

// AI analysis result
export interface DocumentAnalysis {
  title: string
  sections: DocumentSection[]
}

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

// Detect chart/table-like patterns - CONSERVATIVE approach
// Only filter obvious chart artifacts, never regular text
function isChartLikePattern(word: string, allWords: string[], index: number): boolean {
  // Only detect long sequences of evenly-spaced numbers (axis labels like 0, 10, 20, 30...)
  // Must be in a sequence of at least 4 consecutive numbers with consistent spacing
  if (/^\d+%?$/.test(word)) {
    const num = parseInt(word)
    
    // Look for at least 3 numbers before AND after with consistent spacing
    const prevNums: number[] = []
    const nextNums: number[] = []
    
    for (let j = 1; j <= 3 && index - j >= 0; j++) {
      const prev = parseInt(allWords[index - j])
      if (!isNaN(prev)) prevNums.unshift(prev)
      else break
    }
    
    for (let j = 1; j <= 3 && index + j < allWords.length; j++) {
      const next = parseInt(allWords[index + j])
      if (!isNaN(next)) nextNums.push(next)
      else break
    }
    
    // Need at least 2 before AND 2 after to consider it a chart axis
    if (prevNums.length >= 2 && nextNums.length >= 2) {
      const allNums = [...prevNums, num, ...nextNums]
      // Check if evenly spaced
      const diffs = []
      for (let i = 1; i < allNums.length; i++) {
        diffs.push(allNums[i] - allNums[i - 1])
      }
      // All differences should be the same (within tolerance of 1)
      const firstDiff = diffs[0]
      const isEvenlySpaced = diffs.every(d => Math.abs(d - firstDiff) <= 1)
      if (isEvenlySpaced && firstDiff > 0) {
        return true
      }
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

// Cache of image names that are known to have no .src or timed out — skip them on subsequent pages
const knownBadImages = new Set<string>()

// Lightweight image extraction - only grabs images that already have a .src (e.g. embedded JPEGs)
// Skips raw pixel data images entirely (no canvas/encoding overhead)
async function extractFreeImagesFromPage(
  page: { getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[][] }>; objs: { get: (name: string, callback: (img: unknown) => void) => void } },
  pageNum: number
): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = []

  try {
    const operatorList = await page.getOperatorList()
    const pdfjsLib = await import('pdfjs-dist')
    const { OPS } = pdfjsLib

    const seenImages = new Set<string>()
    let lastTransform: number[] | null = null

    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fnId = operatorList.fnArray[i]
      const args = operatorList.argsArray[i]

      // Track transform for position info
      if (fnId === OPS.transform) {
        lastTransform = args as unknown as number[]
      }

      if (fnId === OPS.paintImageXObject) {
        const imageName = args[0] as string
        if (seenImages.has(imageName)) continue
        seenImages.add(imageName)

        // Skip images we already know are bad (no .src or timed out before)
        if (knownBadImages.has(imageName)) continue

        try {
          // Use a short timeout (200ms) — images with .src resolve almost instantly
          const imgData = await Promise.race([
            new Promise<{
              width: number
              height: number
              src?: string
            } | null>((resolve) => {
              page.objs.get(imageName, (img: unknown) => {
                resolve(img as { width: number; height: number; src?: string } | null)
              })
            }),
            new Promise<null>((resolve) => setTimeout(() => {
              resolve(null)
            }, 200))
          ])

          if (!imgData) {
            knownBadImages.add(imageName)
            continue
          }
          // Only use images that already have a src (no conversion needed)
          if (!imgData.src) {
            knownBadImages.add(imageName)
            continue
          }
          // Skip tiny images (icons, artifacts)
          if (imgData.width < 50 || imgData.height < 50) continue
          // Skip extreme aspect ratios (decorative lines)
          const aspectRatio = imgData.width / imgData.height
          if (aspectRatio > 10 || aspectRatio < 0.1) continue

          const yPosition = lastTransform ? lastTransform[5] : 0
          console.log(`[PDF] Page ${pageNum}: found free image "${imageName}" (${imgData.width}x${imgData.height})`)

          images.push({
            src: imgData.src,
            width: imgData.width,
            height: imgData.height,
            pageNum,
            yPosition
          })
        } catch {
          knownBadImages.add(imageName)
        }
      }
    }
    if (images.length > 0) {
      console.log(`[PDF] Page ${pageNum}: ${images.length} free images extracted`)
    }
  } catch (e) {
    console.warn(`[PDF] Page ${pageNum}: failed to get operator list:`, e)
  }

  return images
}

// Build content items for a page, interleaving text and images by Y position
function buildPageContent(
  textItems: TextItemWithPosition[],
  images: ExtractedImage[],
): ContentItem[] {
  if (images.length === 0) {
    // No images - just return text
    const pageText = textItems.map(item => item.str).join(' ')
    return parseTextToContentItems(pageText)
  }

  // Group text items into lines by Y position (rounded to cluster nearby items)
  // PDF Y coordinates go bottom-to-top, so we sort descending for top-to-bottom reading order
  const textByY: { y: number; text: string }[] = []
  let currentY = -Infinity
  let currentLine = ''
  const Y_THRESHOLD = 5 // items within 5 units are on the same line

  // Sort text items top-to-bottom (descending Y in PDF coords)
  const sortedText = [...textItems].sort((a, b) => b.transform[5] - a.transform[5])

  for (const item of sortedText) {
    const y = item.transform[5]
    if (Math.abs(y - currentY) > Y_THRESHOLD && currentLine.trim()) {
      textByY.push({ y: currentY, text: currentLine })
      currentLine = ''
    }
    currentY = y
    currentLine += item.str + ' '
  }
  if (currentLine.trim()) {
    textByY.push({ y: currentY, text: currentLine })
  }

  // Sort images top-to-bottom (descending Y)
  const sortedImages = [...images].sort((a, b) => b.yPosition - a.yPosition)

  // Merge text and images in reading order (top to bottom)
  const content: ContentItem[] = []
  let imgIdx = 0

  for (const line of textByY) {
    // Insert any images that appear above this text line (higher Y = above in PDF)
    while (imgIdx < sortedImages.length && sortedImages[imgIdx].yPosition >= line.y) {
      const img = sortedImages[imgIdx]
      content.push({
        type: 'image',
        src: img.src,
        pageNum: img.pageNum,
        width: img.width,
        height: img.height,
        alt: `Figure from page ${img.pageNum}`
      })
      imgIdx++
    }
    // Add text words
    const words = parseTextToContentItems(line.text)
    content.push(...words)
  }

  // Any remaining images after all text
  while (imgIdx < sortedImages.length) {
    const img = sortedImages[imgIdx]
    content.push({
      type: 'image',
      src: img.src,
      pageNum: img.pageNum,
      width: img.width,
      height: img.height,
      alt: `Figure from page ${img.pageNum}`
    })
    imgIdx++
  }

  return content
}

// Progressive PDF extraction - extracts text and free images (no expensive conversion)
// Calls onBatchReady as content becomes available so the user can start reading immediately
export async function extractContentFromPDFProgressive(
  file: File,
  onBatchReady: (content: ContentItem[], text: string, done: boolean, pagesProcessed: number, totalPages: number) => void,
): Promise<void> {
  console.log(`[PDF] Starting progressive extraction for "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
  const startTime = performance.now()
  
  // Reset image cache for new extraction
  knownBadImages.clear()
  
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  const totalPages = pdf.numPages
  console.log(`[PDF] Document loaded: ${totalPages} pages`)
  
  // Send first batch after a few pages so user can start reading quickly
  const FIRST_BATCH_SIZE = Math.min(3, totalPages)
  // After first batch, send updates every N pages
  const UPDATE_INTERVAL = 5
  
  let fullText = ''
  let allContent: ContentItem[] = []
  let firstBatchSent = false
  
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const pageStart = performance.now()
    const page = await pdf.getPage(pageNum)
    
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
    fullText += pageText + ' '

    // Extract free images (only .src, no conversion) 
    const freeImages = await extractFreeImagesFromPage(page, pageNum)

    // Build interleaved content for this page
    const pageContent = buildPageContent(filteredItems, freeImages)
    allContent = allContent.concat(pageContent)
    
    const pageTime = (performance.now() - pageStart).toFixed(0)
    if (freeImages.length > 0 || pageNum <= 3 || pageNum === totalPages) {
      console.log(`[PDF] Page ${pageNum}/${totalPages}: ${filteredItems.length} text items, ${freeImages.length} images (${pageTime}ms)`)
    }
    
    // Send first batch early so user can start reading
    if (!firstBatchSent && pageNum >= FIRST_BATCH_SIZE) {
      firstBatchSent = true
      console.log(`[PDF] Sending first batch (${allContent.length} items from ${pageNum} pages)`)
      onBatchReady([...allContent], fullText.trim(), totalPages <= FIRST_BATCH_SIZE, pageNum, totalPages)
    }
    // Send periodic updates for remaining pages
    else if (firstBatchSent && (pageNum % UPDATE_INTERVAL === 0)) {
      console.log(`[PDF] Sending update batch (${allContent.length} items from ${pageNum} pages)`)
      onBatchReady([...allContent], fullText.trim(), false, pageNum, totalPages)
    }
  }
  
  const totalTime = ((performance.now() - startTime) / 1000).toFixed(1)
  
  // If PDF had fewer pages than FIRST_BATCH_SIZE, send the first (and final) batch now
  if (!firstBatchSent) {
    console.log(`[PDF] Complete in ${totalTime}s - sending final batch (${allContent.length} items)`)
    onBatchReady([...allContent], fullText.trim(), true, totalPages, totalPages)
    return
  }
  
  // Send final complete batch
  console.log(`[PDF] Complete in ${totalTime}s - sending final batch (${allContent.length} items)`)
  onBatchReady([...allContent], fullText.trim(), true, totalPages, totalPages)
}

// ============================================================================
// AI-guided extraction: extract text by page, then let AI guide section ordering
// ============================================================================

// Fast text-only extraction — returns text grouped by page number
// No images, no progressive callbacks — just gets all text as fast as possible
export async function extractTextByPage(
  file: File
): Promise<{ pageTexts: Record<number, string>; totalPages: number }> {
  console.log(`[PDF] Fast text extraction for "${file.name}"`)
  const startTime = performance.now()

  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const totalPages = pdf.numPages
  const pageTexts: Record<number, string> = {}

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
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
    const pageText = filteredItems.map(item => item.str).join(' ').trim()
    if (pageText) {
      pageTexts[pageNum] = pageText
    }
  }

  const totalTime = ((performance.now() - startTime) / 1000).toFixed(1)
  console.log(`[PDF] Text extraction complete in ${totalTime}s — ${totalPages} pages`)

  return { pageTexts, totalPages }
}

// Build content items from page texts, ordered by AI-detected sections
// Sections are read in priority order (lowest priority number first)
// Skipped sections are excluded entirely
export function buildContentFromSections(
  pageTexts: Record<number, string>,
  analysis: DocumentAnalysis
): ContentItem[] {
  const content: ContentItem[] = []

  // Filter out skipped sections, sort by priority
  const activeSections = analysis.sections
    .filter(s => !s.skip)
    .sort((a, b) => a.priority - b.priority)

  for (const section of activeSections) {
    // Add section divider
    content.push({ type: 'section', title: section.name })

    // Add text from this section's pages
    for (let page = section.startPage; page <= section.endPage; page++) {
      const pageText = pageTexts[page]
      if (pageText) {
        const items = parseTextToContentItems(pageText)
        content.push(...items)
      }
    }
  }

  return content
}
