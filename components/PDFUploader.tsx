'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { extractTextFromPDF, parseTextToWords } from '@/lib/pdfParser'

interface PDFUploaderProps {
  onTextExtracted: (words: string[], title: string, rawText?: string) => void
}

export default function PDFUploader({ onTextExtracted }: PDFUploaderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Handle pasted text
  const handlePastedText = useCallback((text: string) => {
    const trimmedText = text.trim()
    
    if (trimmedText.length === 0) {
      setError('No text found in clipboard')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const words = parseTextToWords(trimmedText)

      if (words.length === 0) {
        setError('Could not parse any words from the pasted text.')
        setIsLoading(false)
        return
      }

      if (words.length < 10) {
        setError('Please paste more text (at least 10 words) for a meaningful speed read.')
        setIsLoading(false)
        return
      }

      const title = generateTitleFromText(trimmedText)
      onTextExtracted(words, title, trimmedText)
    } catch (e) {
      console.error('Text parsing error:', e)
      setError('Error processing pasted text. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [onTextExtracted])

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
      setError('Please upload a PDF file')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const text = await extractTextFromPDF(file)
      const words = parseTextToWords(text)

      if (words.length === 0) {
        setError('Could not extract text from this PDF. It may be scanned or image-based.')
        setIsLoading(false)
        return
      }

      const title = file.name.replace('.pdf', '')
      onTextExtracted(words, title, text)
    } catch (e) {
      console.error('PDF parsing error:', e)
      setError('Error reading PDF. Please try another file.')
    } finally {
      setIsLoading(false)
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

  return (
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
            <p className="text-[color:var(--muted)]">Processing text...</p>
          </div>
        ) : (
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
              Drop a PDF or paste text
            </p>
            <p className="text-[color:var(--muted)] text-sm sm:text-base">
              Tap to browse, or paste text anywhere
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-center">
          {error}
        </div>
      )}
    </div>
  )
}
