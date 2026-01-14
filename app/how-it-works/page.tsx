'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { calculateORP } from '@/lib/pdfParser'
import Link from 'next/link'
import { BookOpenText } from 'lucide-react'

// Demo text that explains the technique
const DEMO_TEXT = `This is SpeedRead. Watch this word. See how the red letter helps your eye focus? That's the Optimal Recognition Point. Your brain recognizes words faster when you focus here. Now let's speed up a bit. Notice how you can still understand everything even as we go faster? This technique is called RSVP. Rapid Serial Visual Presentation. With practice you can read at 500 words per minute or more. Ready to try it yourself?`

// Speed schedule: [wordIndex, wpm] - speed increases at these word indices
const SPEED_SCHEDULE: [number, number][] = [
  [0, 120],    // Start very slow
  [10, 150],   // Slight increase
  [20, 200],   // Getting faster
  [30, 280],   // Comfortable reading speed
  [45, 350],   // Fast
  [55, 420],   // Very fast
]

export default function HowItWorksPage() {
  const router = useRouter()
  const [hasStarted, setHasStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wpm, setWpm] = useState(SPEED_SCHEDULE[0][1])

  const words = DEMO_TEXT.split(/\s+/).filter(w => w.length > 0)
  const currentWord = hasStarted ? (words[currentIndex] || '') : 'This'
  const orpIndex = calculateORP(currentWord)

  // Calculate interval from WPM
  const interval = Math.round(60000 / wpm)

  // Handle start
  const handleStart = useCallback(() => {
    setHasStarted(true)
    setIsPlaying(true)
  }, [])

  // Replay demo
  const handleReplay = useCallback(() => {
    setCurrentIndex(0)
    setWpm(SPEED_SCHEDULE[0][1])
    setIsFinished(false)
    setHasStarted(true)
    setIsPlaying(true)
  }, [])

  // Update speed based on word index
  useEffect(() => {
    if (!isPlaying) return

    let newWpm = SPEED_SCHEDULE[0][1]
    for (const [wordIdx, speed] of SPEED_SCHEDULE) {
      if (currentIndex >= wordIdx) {
        newWpm = speed
      }
    }
    setWpm(newWpm)
  }, [currentIndex, isPlaying])

  // Auto-advance words
  useEffect(() => {
    if (!isPlaying) return

    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= words.length - 1) {
          setIsPlaying(false)
          setIsFinished(true)
          return prev
        }
        return prev + 1
      })
    }, interval)

    return () => clearInterval(timer)
  }, [isPlaying, interval, words.length])

  // Keyboard: space to start/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        if (isFinished) {
          handleReplay()
        } else if (!hasStarted) {
          handleStart()
        } else {
          setIsPlaying(prev => !prev)
        }
      } else if (e.key === 'Escape') {
        router.push('/')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasStarted, isFinished, handleStart, handleReplay, router])

  // Render word with ORP at fixed center position
  const renderWord = () => {
    if (!currentWord) return null

    const before = currentWord.slice(0, orpIndex)
    const orp = currentWord[orpIndex] || ''
    const after = currentWord.slice(orpIndex + 1)

    return (
      <div className="w-full flex justify-center">
        <span className="text-[color:var(--foreground)] text-right inline-block" style={{ minWidth: '40%' }}>
          {before}
        </span>
        <span className="text-[color:var(--accent)] font-semibold">{orp}</span>
        <span className="text-[color:var(--foreground)] text-left inline-block" style={{ minWidth: '40%' }}>
          {after}
        </span>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[color:var(--background)] flex flex-col">
      {/* Minimal header */}
      <header className="flex-shrink-0 p-4 sm:p-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <BookOpenText className="w-6 h-6 text-[color:var(--accent)]" />
          <span className="text-xl font-bold">
            <span className="text-[color:var(--foreground)]">speed</span>
            <span className="text-[color:var(--accent)]">read</span>
          </span>
        </Link>
        <Link 
          href="/"
          className="text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors text-sm"
        >
          ← Back
        </Link>
      </header>

      {/* WPM indicator */}
      <div className="flex-shrink-0 h-8 flex items-center justify-center">
        {hasStarted && !isFinished && (
          <span className="text-[color:var(--muted)] text-sm">{wpm} WPM</span>
        )}
      </div>

      {/* Word Display - takes remaining space */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0">
        <div 
          className="w-full max-w-4xl px-4 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-wide"
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif' }}
        >
          {renderWord()}
        </div>
      </div>

      {/* Bottom controls section - fixed height */}
      <div className="flex-shrink-0 h-40 sm:h-48 flex flex-col items-center justify-start pt-4">
        {/* Play button - before started */}
        {!hasStarted && (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleStart}
              className="w-14 h-14 rounded-full bg-[color:var(--accent)] text-white flex items-center justify-center hover:opacity-90 transition-all hover:scale-105"
              aria-label="Start demo"
            >
              <svg 
                className="w-6 h-6 ml-0.5" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <span className="text-[color:var(--muted)] text-sm">Watch the demo</span>
          </div>
        )}

        {/* Progress indicator - while playing */}
        {hasStarted && !isFinished && (
          <div className="w-48 h-1 bg-[color:var(--border)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[color:var(--accent)]"
              style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
            />
          </div>
        )}

        {/* Finished state - fade in */}
        {isFinished && (
          <div 
            className="flex flex-col items-center gap-4 animate-fadeIn"
            style={{
              animation: 'fadeIn 0.5s ease-out forwards',
            }}
          >
            <div className="flex gap-3">
              <button
                onClick={handleReplay}
                className="px-6 py-3 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl font-medium hover:bg-[color:var(--surface-hover)] transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Replay
              </button>
              <Link
                href="/"
                className="px-6 py-3 bg-[color:var(--accent)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Try it yourself →
              </Link>
            </div>
            <Link
              href="/library"
              className="text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors text-sm"
            >
              or browse the library
            </Link>
          </div>
        )}
      </div>

      {/* Inline keyframes for fade animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
