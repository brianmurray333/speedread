'use client'

import { useState, useEffect, useCallback } from 'react'
import { calculateORP } from '@/lib/pdfParser'

interface IntroReaderProps {
  onComplete: () => void
}

// Intro text that explains the app - broken into words
const INTRO_TEXT = `This is SpeedRead. Watch this word. See how the orange letter helps your eye focus? That's the Optimal Recognition Point. Your brain recognizes words faster when you focus here. Now let's speed up a bit. Notice how you can still understand everything even as we go faster? This technique is called RSVP. Rapid Serial Visual Presentation. With practice you can read at 500 words per minute or more. Ready to try it yourself?`

// Speed schedule: [wordIndex, wpm] - speed increases at these word indices
const SPEED_SCHEDULE: [number, number][] = [
  [0, 120],    // Start very slow
  [10, 150],   // Slight increase
  [20, 200],   // Getting faster
  [30, 280],   // Comfortable reading speed
  [45, 350],   // Fast
  [55, 420],   // Very fast
]

export default function IntroReader({ onComplete }: IntroReaderProps) {
  const [hasStarted, setHasStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wpm, setWpm] = useState(SPEED_SCHEDULE[0][1])

  const words = INTRO_TEXT.split(/\s+/).filter(w => w.length > 0)
  const currentWord = hasStarted ? (words[currentIndex] || '') : 'This'
  const orpIndex = calculateORP(currentWord)

  // Calculate interval from WPM
  const interval = Math.round(60000 / wpm)

  // Handle start
  const handleStart = useCallback(() => {
    setHasStarted(true)
    setIsPlaying(true)
  }, [])

  // Update speed based on word index
  useEffect(() => {
    if (!isPlaying) return

    // Find the appropriate speed for current index
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
          onComplete()
        } else if (!hasStarted) {
          handleStart()
        } else {
          setIsPlaying(prev => !prev)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasStarted, isFinished, handleStart, onComplete])

  // Render word with ORP at fixed center position (same as SpeedReader)
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
    <div className="fixed inset-0 bg-[color:var(--background)] flex flex-col items-center justify-center">
      {/* Word Display - same position whether started or not */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div 
          className="w-full max-w-4xl px-4 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-wide"
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif' }}
        >
          {renderWord()}
        </div>
      </div>

      {/* Play button - only show before started */}
      {!hasStarted && (
        <div className="absolute bottom-16 sm:bottom-24 flex flex-col items-center gap-3">
          <button
            onClick={handleStart}
            className="w-16 h-16 sm:w-14 sm:h-14 rounded-full bg-[color:var(--accent)] text-white flex items-center justify-center hover:opacity-90 transition-all hover:scale-105"
            aria-label="Start intro"
          >
            <svg 
              className="w-7 h-7 sm:w-6 sm:h-6 ml-0.5" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <span className="text-[color:var(--muted)] text-sm sm:hidden">Tap to start</span>
        </div>
      )}

      {/* Progress indicator - only show while playing */}
      {hasStarted && !isFinished && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-48 h-1 bg-[color:var(--border)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[color:var(--accent)]"
              style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Get Started button - show after intro finishes */}
      {isFinished && (
        <div className="absolute bottom-16 sm:bottom-24">
          <button
            onClick={onComplete}
            className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3"
          >
            Get started
          </button>
        </div>
      )}
    </div>
  )
}
