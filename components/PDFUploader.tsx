'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  extractContentFromPDFProgressive, 
  parseTextToContentItems, 
  ContentItem 
} from '@/lib/pdfParser'
import { useToast } from './Toast'
import ClipboardPasteModal, { useClipboardPaste } from './ClipboardPasteModal'

interface PDFUploaderProps {
  onTextExtracted: (words: string[], title: string, rawText?: string) => void
  onContentExtracted?: (content: ContentItem[], title: string, rawText?: string, done?: boolean) => void
}

export default function PDFUploader({ onTextExtracted, onContentExtracted }: PDFUploaderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [clipboardSupported, setClipboardSupported] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast, ToastContainer } = useToast()
  const { showModal, closeModal, requestPaste } = useClipboardPaste()

  // Detect mobile and clipboard API support
  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth < 768
      setIsMobile(isTouchDevice || isSmallScreen)
    }
    
    // Check if Clipboard API is available
    setClipboardSupported(
      typeof navigator !== 'undefined' && 
      'clipboard' in navigator && 
      typeof navigator.clipboard.readText === 'function'
    )
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Generate a title from the first few words of pasted text
  const generateTitleFromText = (text: string): string => {
    const words = text.trim().split(/\s+/).slice(0, 6)
    let title = words.join(' ')
    if (title.length > 50) {
      title = title.substring(0, 47) + '...'
    } else if (text.trim().split(/\s+/).length > 6) {
      title += '...'
    }
    return title || 'Pasted Text'
  }

  // Check if text is a URL
  const isUrl = (text: string): boolean => {
    try {
      const url = new URL(text.trim())
      return ['http:', 'https:'].includes(url.protocol)
    } catch {
      return false
    }
  }

  // Handle URL parsing
  const handleUrlSubmit = async (url: string) => {
    setIsLoading(true)
    setExtractionProgress('Fetching article...')

    try {
      const response = await fetch('/api/url/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        showToast(data.error || 'Failed to parse URL', 'error')
        setIsLoading(false)
        setExtractionProgress(null)
        return
      }

      setExtractionProgress(`Extracted ${data.wordCount.toLocaleString()} words from ${data.siteName}`)

      // Parse the extracted text
      const contentItems = parseTextToContentItems(data.textContent)
      const words = contentItems
        .filter((item): item is { type: 'word'; value: string } => item.type === 'word')
        .map(item => item.value)

      if (words.length === 0) {
        showToast('Could not extract readable text from this URL', 'error')
        setIsLoading(false)
        setExtractionProgress(null)
        return
      }

      // Call callbacks with extracted data
      onTextExtracted(words, data.title, data.textContent)
      onContentExtracted?.(contentItems, data.title, data.textContent)
    } catch (e) {
      console.error('URL parsing error:', e)
      showToast('Error parsing URL. Please try again', 'error')
    } finally {
      setIsLoading(false)
      setTimeout(() => setExtractionProgress(null), 2000)
    }
  }

  // Handle pasted text
  const handlePastedText = useCallback(async (text: string) => {
    const trimmedText = text.trim()
    
    if (trimmedText.length === 0) {
      showToast('No text found in clipboard', 'warning')
      return
    }

    // Check if it's a URL
    if (isUrl(trimmedText)) {
      // Parse as URL
      await handleUrlSubmit(trimmedText)
      return
    }

    setIsLoading(true)
    setExtractionProgress('Processing text...')

    try {
      const contentItems = parseTextToContentItems(trimmedText)
      const words = contentItems
        .filter((item): item is { type: 'word'; value: string } => item.type === 'word')
        .map(item => item.value)

      if (words.length === 0) {
        showToast('Could not parse any words from the pasted text', 'error')
        setIsLoading(false)
        setExtractionProgress(null)
        return
      }

      if (words.length < 10) {
        showToast('Please paste more text (at least 10 words)', 'warning')
        setIsLoading(false)
        setExtractionProgress(null)
        return
      }

      const title = generateTitleFromText(trimmedText)
      
      // Call both callbacks for compatibility
      onTextExtracted(words, title, trimmedText)
      onContentExtracted?.(contentItems, title, trimmedText)
    } catch (e) {
      console.error('Text parsing error:', e)
      showToast('Error processing pasted text. Please try again', 'error')
    } finally {
      setIsLoading(false)
      setExtractionProgress(null)
    }
  }, [onTextExtracted, onContentExtracted, showToast])

  // Handle paste button click (for mobile)
  // Uses requestPaste which tries async clipboard API first, then falls back to modal
  const handlePasteClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering file input
    
    await requestPaste(
      (text) => {
        // Success callback - process the pasted text
        handlePastedText(text)
      },
      (error) => {
        // Error callback (e.g., clipboard is empty)
        showToast(error || 'Could not read clipboard', 'warning')
      }
    )
  }, [handlePastedText, requestPaste, showToast])

  // Global paste event listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't capture paste if user is in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const text = e.clipboardData?.getData('text')
      if (text && text.trim().length > 0) {
        e.preventDefault()
        handlePastedText(text)
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePastedText])

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      showToast('Please upload a PDF file', 'error')
      return
    }

    setIsLoading(true)
    setExtractionProgress('Extracting text...')

    try {
      const title = file.name.replace('.pdf', '')
      let firstBatchSent = false

      // Use progressive extraction - sends user to reader quickly
      // then continues processing remaining pages in background
      await extractContentFromPDFProgressive(
        file,
        (contentItems, rawText, done, pagesProcessed, totalPages) => {
          const words = contentItems
            .filter((item): item is { type: 'word'; value: string } => item.type === 'word')
            .map(item => item.value)

          if (!firstBatchSent) {
            // First batch - validate and send user to reader
            firstBatchSent = true

            if (words.length === 0) {
              showToast('Could not extract text from this PDF', 'error')
              setIsLoading(false)
              setExtractionProgress(null)
              return
            }

            setIsLoading(false)
            setExtractionProgress(null)

            // Call callbacks to transition to the reader
            onTextExtracted(words, title, rawText)
            onContentExtracted?.(contentItems, title, rawText, done)
          } else {
            // Subsequent batches - update content as more pages are processed
            onTextExtracted(words, title, rawText)
            onContentExtracted?.(contentItems, title, rawText, done)
          }

          if (!done) {
            setExtractionProgress(`Processing page ${pagesProcessed} of ${totalPages}...`)
          }
        }
      )
    } catch (e) {
      console.error('PDF parsing error:', e)
      showToast('Error reading PDF. Please try another file', 'error')
      setIsLoading(false)
      setExtractionProgress(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  // The modal's onPaste just needs to call handlePastedText directly
  // since the modal handles its own closing

  return (
    <>
      <ToastContainer />
      <ClipboardPasteModal 
        isOpen={showModal} 
        onClose={closeModal} 
        onPaste={handlePastedText} 
      />
      <div className="w-full max-w-xl mx-auto">
        <div
          className={`
            relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-200
            ${dragActive 
              ? 'border-[color:var(--accent)] bg-[color:var(--accent-glow)]' 
              : 'border-[color:var(--border)] hover:border-[color:var(--muted)]'
            }
            ${isLoading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleInputChange}
            className="hidden"
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin" />
              <p className="text-[color:var(--muted)]">
                {extractionProgress || 'Processing...'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile-optimized layout with prominent paste button */}
              {/* Always show on mobile - we have fallback modal for unsupported browsers */}
              {isMobile ? (
                <div className="flex flex-col items-center gap-4">
                  {/* Paste button - prominent on mobile */}
                  <button
                    onClick={handlePasteClick}
                    className="w-full py-4 px-6 bg-[color:var(--accent)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-3 text-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Paste from Clipboard
                  </button>

                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 h-px bg-[color:var(--border)]" />
                    <span className="text-[color:var(--muted)] text-sm">or</span>
                    <div className="flex-1 h-px bg-[color:var(--border)]" />
                  </div>

                  {/* Browse for PDF - secondary on mobile */}
                  <div className="text-center">
                    <svg 
                      className="w-10 h-10 mx-auto mb-2 text-[color:var(--muted)]" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <p className="text-base font-medium mb-1">
                      Tap to browse PDFs
                    </p>
                  </div>
                </div>
              ) : (
                /* Desktop layout - original design */
                <>
                  <svg 
                    className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-[color:var(--muted)]" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-base sm:text-lg font-medium mb-1 sm:mb-2">
                    Drop a PDF, paste text, or paste a URL
                  </p>
                  <p className="text-[color:var(--muted)] text-sm sm:text-base">
                    {clipboardSupported ? 'Click to browse, or paste anywhere (Ctrl/Cmd+V)' : 'Click to browse files'}
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
