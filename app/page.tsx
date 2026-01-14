'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import PDFUploader from '@/components/PDFUploader'
import SpeedReader from '@/components/SpeedReader'
import IntroReader from '@/components/IntroReader'
import Link from 'next/link'

export default function Home() {
  const [words, setWords] = useState<string[]>([])
  const [title, setTitle] = useState<string>('')
  const [isReading, setIsReading] = useState(false)
  const [showIntro, setShowIntro] = useState<boolean | null>(null)

  // Check if user has seen the intro before
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('speedread-intro-seen')
    setShowIntro(!hasSeenIntro)
  }, [])

  const handleIntroComplete = () => {
    localStorage.setItem('speedread-intro-seen', 'true')
    setShowIntro(false)
  }

  const handleTextExtracted = (extractedWords: string[], docTitle: string) => {
    setWords(extractedWords)
    setTitle(docTitle)
    setIsReading(true)
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
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Read <span className="text-[color:var(--accent)]">faster</span>,<br />
            retain <span className="text-[color:var(--accent)]">more</span>
          </h1>
          <p className="text-xl text-[color:var(--muted)] mb-12 max-w-2xl mx-auto">
            Upload any PDF and read it word-by-word using the scientifically-backed RSVP technique. 
            No distractions, maximum focus.
          </p>
          
          <PDFUploader onTextExtracted={handleTextExtracted} />
          
          <div className="mt-8 flex items-center justify-center gap-4 text-[color:var(--muted)]">
            <span>or</span>
            <Link href="/library" className="text-[color:var(--accent)] hover:underline font-medium">
              Browse the library →
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-t border-b border-[color:var(--border)]">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-[color:var(--accent)] mb-2">2-3x</div>
            <div className="text-[color:var(--muted)]">Faster reading speed</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-[color:var(--accent)] mb-2">300+</div>
            <div className="text-[color:var(--muted)]">Default words/minute</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-[color:var(--accent)] mb-2">0</div>
            <div className="text-[color:var(--muted)]">Distractions</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            How It <span className="text-[color:var(--accent)]">Works</span>
          </h2>
          <p className="text-center text-[color:var(--muted)] mb-12 max-w-2xl mx-auto">
            SpeedRead uses Rapid Serial Visual Presentation (RSVP), a technique backed by reading science.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="card">
              <div className="w-12 h-12 rounded-lg bg-[color:var(--accent)]/10 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-[color:var(--accent)]">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">One Word at a Time</h3>
              <p className="text-[color:var(--muted)]">
                Instead of scanning lines of text, you see one word at a time in the same position. 
                This eliminates the time your eyes spend moving across the page.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card">
              <div className="w-12 h-12 rounded-lg bg-[color:var(--accent)]/10 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-[color:var(--accent)]">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Optimal Recognition Point</h3>
              <p className="text-[color:var(--muted)]">
                Each word is positioned so your eye focuses on the <span className="text-[color:var(--accent)] font-semibold">red letter</span>—the 
                Optimal Recognition Point (ORP). This is where your brain recognizes words fastest.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card">
              <div className="w-12 h-12 rounded-lg bg-[color:var(--accent)]/10 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-[color:var(--accent)]">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Zero Distractions</h3>
              <p className="text-[color:var(--muted)]">
                During reading, all controls fade away. Your entire focus is on the words. 
                Move your mouse or tap the screen to reveal controls when needed.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card">
              <div className="w-12 h-12 rounded-lg bg-[color:var(--accent)]/10 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-[color:var(--accent)]">4</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Adjustable Speed</h3>
              <p className="text-[color:var(--muted)]">
                Start at 300 words per minute and gradually increase as you get comfortable. 
                Many users reach 500+ WPM with practice.
              </p>
            </div>
          </div>

          {/* Demo */}
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-semibold mb-6">See the ORP in action</h3>
            <div className="inline-block bg-[color:var(--surface)] rounded-xl p-8 border border-[color:var(--border)] min-w-[320px]">
              <div 
                className="text-5xl sm:text-6xl font-normal tracking-wide flex items-baseline justify-center" 
                style={{ fontFamily: 'system-ui, Arial, sans-serif' }}
              >
                <span className="text-right" style={{ width: '45%' }}>Sp</span>
                <span className="text-[color:var(--accent)] font-semibold">e</span>
                <span className="text-left" style={{ width: '45%' }}>edRead</span>
              </div>
              <p className="text-[color:var(--muted)] mt-4 text-sm">
                The red letter stays fixed at the center
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[color:var(--surface)] border-t border-[color:var(--border)]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to read <span className="text-[color:var(--accent)]">faster</span>?
          </h2>
          <p className="text-[color:var(--muted)] text-lg mb-8">
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
      <footer className="py-8 px-6 border-t border-[color:var(--border)]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[color:var(--muted)] text-sm">
            © {new Date().getFullYear()} SpeedRead. Read faster, retain more.
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/library" className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
              Library
            </Link>
            <Link href="/#how-it-works" className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
              How It Works
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
