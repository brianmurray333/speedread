'use client'

import { useState, useEffect, useCallback } from 'react'
import { calculateORP } from '@/lib/pdfParser'

interface IntroReaderProps {
  onComplete: () => void
}

// Intro text that explains the app - broken into words
const INTRO_TEXT = `This is SpeedRead. Watch this word. See how the red letter helps your eye focus? That's the Optimal Recognition Point. Your brain recognizes words faster when you focus here. Now let's speed up a bit. Notice how you can still understand everything even as we go faster? This technique is called RSVP. Rapid Serial Visual Presentation. With practice you can read at 500 words per minute or more. Ready to try it yourself?`

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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wordKey, setWordKey] = useState(0)
  const [wpm, setWpm] = useState(SPEED_SCHEDULE[0][1])

  const words = INTRO_TEXT.split(/\s+/).filter(w => w.length > 0)
  const currentWord = words[currentIndex] || ''
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
          // Small delay before completing
          setTimeout(() => {
            onComplete()
          }, 1000)
          return prev
        }
        setWordKey(k => k + 1)
        return prev + 1
      })
    }, interval)

    return () => clearInterval(timer)
  }, [isPlaying, interval, words.length, onComplete])

  // Keyboard: space to start/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        if (!hasStarted) {
          handleStart()
        } else {
          setIsPlaying(prev => !prev)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasStarted, handleStart])

  // Render word with highlighted ORP
  const renderWord = (word: string, orp: number) => {
    if (!word) return null

    const before = word.slice(0, orp)
    const orpChar = word[orp] || ''
    const after = word.slice(orp + 1)

    return (
      <span key={wordKey} className="word-animate inline-flex items-baseline">
        <span className="text-[color:var(--foreground)]">{before}</span>
        <span className="text-[color:var(--accent)] font-semibold">{orpChar}</span>
        <span className="text-[color:var(--foreground)]">{after}</span>
      </span>
    )
  }

  // Initial state: Show "This" with play button
  if (!hasStarted) {
    return (
      <div className="fixed inset-0 bg-[color:var(--background)] flex flex-col items-center justify-center">
        <div className="text-center">
          {/* The word "This" with ORP */}
          <div 
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-normal tracking-wide mb-16"
            style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif' }}
          >
            <span>T</span>
            <span className="text-[color:var(--accent)] font-semibold">h</span>
            <span>is</span>
          </div>

          {/* Play button */}
          <button
            onClick={handleStart}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[color:var(--accent)] text-white flex items-center justify-center hover:opacity-90 transition-all hover:scale-105 shadow-lg"
            aria-label="Start intro"
          >
            <svg 
              className="w-10 h-10 sm:w-12 sm:h-12 ml-1" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>

          <p className="text-[color:var(--muted)] mt-8 text-sm">
            Press play or hit Space
          </p>
        </div>
      </div>
    )
  }

  // Reading state
  return (
    <div className="fixed inset-0 bg-[color:var(--background)] flex flex-col items-center justify-center">
      {/* Word Display */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="text-center px-8">
          <div 
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-wide"
            style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif' }}
          >
            {renderWord(currentWord, orpIndex)}
          </div>
        </div>
      </div>

      {/* Minimal progress indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="w-48 h-1 bg-[color:var(--border)] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[color:var(--accent)] transition-all duration-100"
            style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
          />
        </div>
        <p className="text-[color:var(--muted)] text-xs mt-3 text-center">
          {wpm} WPM
        </p>
      </div>
    </div>
  )
}
