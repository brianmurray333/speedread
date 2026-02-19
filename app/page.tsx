'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import PDFUploader from '@/components/PDFUploader'
import SpeedReader from '@/components/SpeedReader'
import IntroReader from '@/components/IntroReader'
import PublishModal from '@/components/PublishModal'
import MobileBottomNav from '@/components/MobileBottomNav'
import BitcoinInfoSection from '@/components/BitcoinInfoSection'
import Link from 'next/link'
import { ContentItem, DocumentAnalysis, parseTextToContentItems } from '@/lib/pdfParser'

// Separate component that uses useSearchParams (needs Suspense boundary)
function HomeContent() {
  const searchParams = useSearchParams()
  const [words, setWords] = useState<string[]>([])
  const [content, setContent] = useState<ContentItem[]>([])
  const [title, setTitle] = useState<string>('')
  const [textContent, setTextContent] = useState<string>('')
  const [isReading, setIsReading] = useState(false)
  const [showIntro, setShowIntro] = useState<boolean | null>(null)
  const [showUploadOptions, setShowUploadOptions] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [urlTextProcessed, setUrlTextProcessed] = useState(false)
  const [isStillProcessing, setIsStillProcessing] = useState(false)
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysis | null>(null)
  // Session counter to ignore stale callbacks from previous uploads
  const extractionSessionRef = useRef(0)

  // Generate a title from the first few words of text
  const generateTitleFromText = (text: string): string => {
    const textWords = text.trim().split(/\s+/).slice(0, 6)
    let generatedTitle = textWords.join(' ')
    if (generatedTitle.length > 50) {
      generatedTitle = generatedTitle.substring(0, 47) + '...'
    } else if (text.trim().split(/\s+/).length > 6) {
      generatedTitle += '...'
    }
    return generatedTitle || 'Shared Text'
  }

  // Process text and start reading
  const processAndStartReading = (text: string) => {
    const trimmedText = text.trim()
    const contentItems = parseTextToContentItems(trimmedText)
    const extractedWords = contentItems
      .filter((item): item is { type: 'word'; value: string } => item.type === 'word')
      .map(item => item.value)
    
    if (extractedWords.length >= 3) {
      // Mark intro as seen
      localStorage.setItem('speedread-intro-seen', 'true')
      
      setContent(contentItems)
      setWords(extractedWords)
      setTitle(generateTitleFromText(trimmedText))
      setTextContent(trimmedText)
      setShowIntro(false)
      setIsReading(true)
      
      // Clean up the URL
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/')
      }
      return true
    }
    return false
  }

  // Check for URL parameters and auto-start reading
  useEffect(() => {
    if (urlTextProcessed) return
    
    // Check for ?text= parameter (text passed directly in URL)
    const sharedText = searchParams.get('text')
    if (sharedText && sharedText.trim().length > 0) {
      setUrlTextProcessed(true)
      processAndStartReading(sharedText)
      return
    }
    
    // Check for ?paste=true parameter (read from clipboard or sessionStorage)
    const shouldPaste = searchParams.get('paste')
    if (shouldPaste === 'true') {
      setUrlTextProcessed(true)
      
      const attemptRead = async () => {
        // First, check sessionStorage for pending pasted text (from fallback modal)
        const pendingText = sessionStorage.getItem('pendingPastedText')
        if (pendingText && pendingText.trim().length > 0) {
          sessionStorage.removeItem('pendingPastedText')
          processAndStartReading(pendingText)
          return
        }
        
        // Fall back to clipboard API if no pending text
        if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
          try {
            // Check if Permissions API is available
            if ('permissions' in navigator && 'query' in navigator.permissions) {
              try {
                // Check current clipboard-read permission status
                const permissionStatus = await navigator.permissions.query({ 
                  name: 'clipboard-read' as PermissionName 
                })
                
                // If permission is denied, show home page
                if (permissionStatus.state === 'denied') {
                  console.log('Clipboard permission denied')
                  localStorage.setItem('speedread-intro-seen', 'true')
                  setShowIntro(false)
                  window.history.replaceState({}, '', '/')
                  return
                }
              } catch (permErr) {
                // Permissions API query failed, continue to attempt read
                console.log('Permission query not supported, attempting direct read')
              }
            }
            
            // Attempt to read from clipboard
            const clipboardText = await navigator.clipboard.readText()
            
            if (clipboardText && clipboardText.trim().length > 0) {
              processAndStartReading(clipboardText)
            } else {
              // No text in clipboard, just show home page
              localStorage.setItem('speedread-intro-seen', 'true')
              setShowIntro(false)
              window.history.replaceState({}, '', '/')
            }
          } catch (err) {
            // Clipboard access denied or error, show home page
            console.error('Clipboard read error:', err)
            localStorage.setItem('speedread-intro-seen', 'true')
            setShowIntro(false)
            window.history.replaceState({}, '', '/')
          }
        } else {
          // No clipboard API, show home page
          localStorage.setItem('speedread-intro-seen', 'true')
          setShowIntro(false)
          window.history.replaceState({}, '', '/')
        }
      }
      
      attemptRead()
      return
    }
  }, [searchParams, urlTextProcessed])

  // Check if user has seen the intro before
  useEffect(() => {
    // Don't override if we already set showIntro from URL text
    if (showIntro !== null) return
    
    const hasSeenIntro = localStorage.getItem('speedread-intro-seen')
    setShowIntro(!hasSeenIntro)
  }, [showIntro])

  const handleIntroComplete = () => {
    localStorage.setItem('speedread-intro-seen', 'true')
    setShowIntro(false)
  }

  const handleTextExtracted = (extractedWords: string[], docTitle: string, rawText?: string) => {
    setWords(extractedWords)
    setTitle(docTitle)
    setTextContent(rawText || extractedWords.join(' '))
    if (!showUploadOptions && !isReading) {
      // New extraction session - increment counter
      extractionSessionRef.current += 1
      setShowUploadOptions(true)
      setIsStillProcessing(true)
    }
  }

  const handleContentExtracted = (extractedContent: ContentItem[], docTitle: string, rawText?: string, done?: boolean) => {
    // Capture session at time of first call
    const session = extractionSessionRef.current
    
    setContent(extractedContent)
    // Also update words for backward compatibility
    const extractedWords = extractedContent
      .filter((item): item is { type: 'word'; value: string } => item.type === 'word')
      .map(item => item.value)
    setWords(extractedWords)
    setTitle(docTitle)
    setTextContent(rawText || extractedWords.join(' '))
    if (!showUploadOptions && !isReading) {
      extractionSessionRef.current += 1
      setShowUploadOptions(true)
      setIsStillProcessing(true)
    }
    // If this is the final batch (or a non-progressive call), mark processing as complete
    // Only if we're still in the same session
    if (done !== false && session === extractionSessionRef.current) {
      setIsStillProcessing(false)
    }
  }

  const handleStartReading = () => {
    setShowUploadOptions(false)
    setIsReading(true)
  }

  const handlePublished = () => {
    setShowPublishModal(false)
    setShowUploadOptions(false)
    setWords([])
    setContent([])
    setTitle('')
    setTextContent('')
    // Could show a success message or redirect to library
    alert('Published successfully! Your document is now in the library.')
  }

  // Count images in content
  const imageCount = content.filter(item => item.type === 'image').length

  // Show nothing while checking localStorage (prevents flash)
  if (showIntro === null) {
    return null
  }

  // Show intro for first-time visitors
  if (showIntro) {
    return <IntroReader onComplete={handleIntroComplete} />
  }

  if (isReading && (content.length > 0 || words.length > 0)) {
    return (
      <>
        <SpeedReader
          content={content.length > 0 ? content : undefined}
          words={content.length === 0 ? words : undefined}
          autoStart={true}
          onComplete={() => {}}
          onRequestPublish={() => setShowPublishModal(true)}
          isLoadingMore={isStillProcessing}
          onExit={() => {
            setIsReading(false)
            setWords([])
            setContent([])
            setTitle('')
            setTextContent('')
            setIsStillProcessing(false)
            setDocumentAnalysis(null)
          }}
        />
        {/* Publish Modal overlay for sharing local content */}
        <PublishModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          onPublished={() => {
            setShowPublishModal(false)
            setIsReading(false)
            setWords([])
            setContent([])
            setTitle('')
            setTextContent('')
            alert('Published successfully! Your document is now in the library.')
          }}
          title={title}
          textContent={textContent}
          wordCount={words.length}
        />
      </>
    )
  }

  // Show options after PDF is uploaded
  if (showUploadOptions && words.length > 0) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">{title}</h1>
            <p className="text-[color:var(--muted)]">
              {words.length.toLocaleString()} words ready
              {isStillProcessing && (
                <span className="block text-sm mt-1 flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin inline-block" />
                  Loading more pages...
                </span>
              )}
              {!isStillProcessing && imageCount > 0 && (
                <span className="block text-sm mt-1">
                  + {imageCount} image{imageCount > 1 ? 's' : ''} extracted
                </span>
              )}
            </p>

            {/* AI-detected sections */}
            {documentAnalysis && documentAnalysis.sections.length > 0 && (
              <div className="mt-4 text-left bg-[color:var(--surface)] rounded-lg border border-[color:var(--border)] p-3">
                <p className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider mb-2">
                  Reading Order
                </p>
                <ol className="space-y-1">
                  {documentAnalysis.sections
                    .filter(s => !s.skip)
                    .sort((a, b) => a.priority - b.priority)
                    .map((section, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-[color:var(--accent)] text-white text-xs flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-[color:var(--foreground)]">{section.name}</span>
                        <span className="text-[color:var(--muted)] text-xs ml-auto">
                          p.{section.startPage}{section.endPage !== section.startPage ? `–${section.endPage}` : ''}
                        </span>
                      </li>
                    ))}
                </ol>
                {documentAnalysis.sections.filter(s => s.skip).length > 0 && (
                  <p className="text-xs text-[color:var(--muted)] mt-2 pt-2 border-t border-[color:var(--border)]">
                    Skipping: {documentAnalysis.sections.filter(s => s.skip).map(s => s.name).join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {/* Read Now */}
            <button
              onClick={handleStartReading}
              className="w-full py-4 bg-[color:var(--accent)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start Reading
            </button>

            {/* Publish to Library */}
            <button
              onClick={() => setShowPublishModal(true)}
              className="w-full py-4 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl font-semibold hover:bg-[color:var(--surface-hover)] transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5 text-[color:var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Publish to Library
              <span className="text-xs text-[color:var(--muted)] ml-1">(optional paywall)</span>
            </button>

            {/* Cancel */}
            <button
              onClick={() => {
                extractionSessionRef.current += 1  // Invalidate any in-progress extraction
                setShowUploadOptions(false)
                setWords([])
                setContent([])
                setTitle('')
                setTextContent('')
                setIsStillProcessing(false)
                setDocumentAnalysis(null)
              }}
              className="w-full py-3 text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors text-sm"
            >
              Start over
            </button>
          </div>
        </div>

        {/* Publish Modal */}
        <PublishModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          onPublished={handlePublished}
          title={title}
          textContent={textContent}
          wordCount={words.length}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)] pb-20 sm:pb-0">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-12 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
            Read <span className="text-[color:var(--accent)]">faster</span>,<br />
            retain <span className="text-[color:var(--accent)]">more</span>
          </h1>
          <p className="text-lg sm:text-xl text-[color:var(--muted)] mb-8 sm:mb-12 max-w-2xl mx-auto px-2">
            Read text, websites or PDFs FAST. Just paste or upload.
          </p>
          
          <PDFUploader 
            onTextExtracted={handleTextExtracted}
            onContentExtracted={handleContentExtracted}
            onAnalysisComplete={(analysis) => setDocumentAnalysis(analysis)}
          />
          
          <p className="mt-8 text-center text-[color:var(--muted)]">
            <span>or </span>
            <Link href="/library" className="text-[color:var(--accent)] hover:underline font-medium">
              browse the library →
            </Link>
          </p>
        </div>
      </section>

      {/* Bitcoin Info Section - Mobile Only */}
      <BitcoinInfoSection />

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 border-t border-[color:var(--border)]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="text-[color:var(--muted)] text-sm">
            © {new Date().getFullYear()} SpeedRead. Read faster, retain more.
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/library" className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
              Library
            </Link>
            <Link href="/how-it-works" className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
              How It Works
            </Link>
            <Link href="/shortcuts" className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
              iOS Shortcuts
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}

// Main export with Suspense boundary for useSearchParams
export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
