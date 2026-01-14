'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import PDFUploader from '@/components/PDFUploader'
import SpeedReader from '@/components/SpeedReader'
import IntroReader from '@/components/IntroReader'
import PublishModal from '@/components/PublishModal'
import Link from 'next/link'

export default function Home() {
  const [words, setWords] = useState<string[]>([])
  const [title, setTitle] = useState<string>('')
  const [textContent, setTextContent] = useState<string>('')
  const [isReading, setIsReading] = useState(false)
  const [showIntro, setShowIntro] = useState<boolean | null>(null)
  const [showUploadOptions, setShowUploadOptions] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)

  // Check if user has seen the intro before
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('speedread-intro-seen')
    setShowIntro(!hasSeenIntro)
  }, [])

  const handleIntroComplete = () => {
    localStorage.setItem('speedread-intro-seen', 'true')
    setShowIntro(false)
  }

  const handleTextExtracted = (extractedWords: string[], docTitle: string, rawText?: string) => {
    setWords(extractedWords)
    setTitle(docTitle)
    setTextContent(rawText || extractedWords.join(' '))
    setShowUploadOptions(true)
  }

  const handleStartReading = () => {
    setShowUploadOptions(false)
    setIsReading(true)
  }

  const handlePublished = () => {
    setShowPublishModal(false)
    setShowUploadOptions(false)
    setWords([])
    setTitle('')
    setTextContent('')
    // Could show a success message or redirect to library
    alert('Published successfully! Your document is now in the library.')
  }

  // Show nothing while checking localStorage (prevents flash)
  if (showIntro === null) {
    return null
  }

  // Show intro for first-time visitors
  if (showIntro) {
    return <IntroReader onComplete={handleIntroComplete} />
  }

  if (isReading && words.length > 0) {
  return (
      <SpeedReader
        words={words}
        onComplete={() => {}}
        onExit={() => {
          setIsReading(false)
          setWords([])
          setTitle('')
          setTextContent('')
        }}
      />
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
            </p>
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
                setShowUploadOptions(false)
                setWords([])
                setTitle('')
                setTextContent('')
              }}
              className="w-full py-3 text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors text-sm"
            >
              Upload a different file
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
    <div className="min-h-screen bg-[color:var(--background)]">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
            Read <span className="text-[color:var(--accent)]">faster</span>,<br />
            retain <span className="text-[color:var(--accent)]">more</span>
          </h1>
          <p className="text-lg sm:text-xl text-[color:var(--muted)] mb-8 sm:mb-12 max-w-2xl mx-auto px-2">
            Upload any PDF and read it word-by-word using the scientifically-backed RSVP technique. 
            No distractions, maximum focus.
          </p>
          
          <PDFUploader onTextExtracted={handleTextExtracted} />
          
          <div className="mt-8 flex items-center justify-center gap-2 text-[color:var(--muted)]">
            <span>or</span>
            <Link href="/library" className="text-[color:var(--accent)] hover:underline font-medium">
              Browse the library →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 border-t border-b border-[color:var(--border)]">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 sm:gap-8 text-center">
          <div>
            <div className="text-2xl sm:text-4xl font-bold text-[color:var(--accent)] mb-1 sm:mb-2">2-3x</div>
            <div className="text-[color:var(--muted)] text-xs sm:text-base">Faster reading</div>
          </div>
          <div>
            <div className="text-2xl sm:text-4xl font-bold text-[color:var(--accent)] mb-1 sm:mb-2">300+</div>
            <div className="text-[color:var(--muted)] text-xs sm:text-base">Words/minute</div>
          </div>
          <div>
            <div className="text-2xl sm:text-4xl font-bold text-[color:var(--accent)] mb-1 sm:mb-2">0</div>
            <div className="text-[color:var(--muted)] text-xs sm:text-base">Distractions</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-[color:var(--surface)] border-t border-[color:var(--border)]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
            Ready to read <span className="text-[color:var(--accent)]">faster</span>?
          </h2>
          <p className="text-[color:var(--muted)] text-base sm:text-lg mb-6 sm:mb-8">
            Upload your first PDF and experience the difference.
          </p>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="btn-primary text-lg px-8 py-4"
          >
            Get Started — It&apos;s Free
          </button>
        </div>
      </section>

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
          </div>
        </div>
      </footer>
    </div>
  )
}
