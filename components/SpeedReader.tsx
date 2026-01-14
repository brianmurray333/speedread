'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { calculateORP } from '@/lib/pdfParser'
import { useTheme } from './ThemeProvider'

interface SpeedReaderProps {
  words: string[]
  initialWpm?: number
  onComplete?: () => void
  onExit?: () => void
}

export default function SpeedReader({ 
  words, 
  initialWpm = 300, 
  onComplete,
  onExit 
}: SpeedReaderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [wpm, setWpm] = useState(initialWpm)
  const [showControls, setShowControls] = useState(true)
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()

  const currentWord = words[currentIndex] || ''
  const progress = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0
  const orpIndex = calculateORP(currentWord)

  // Calculate interval from WPM
  const interval = Math.round(60000 / wpm)

  // Auto-advance words
  useEffect(() => {
    if (!isPlaying) return

    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= words.length - 1) {
          setIsPlaying(false)
          onComplete?.()
          return prev
        }
        return prev + 1
      })
    }, interval)

    return () => clearInterval(timer)
  }, [isPlaying, interval, words.length, onComplete])

  // Hide controls after inactivity during playback
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true)
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current)
    }
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false)
      }, 2000)
    }
  }, [isPlaying])

  useEffect(() => {
    if (isPlaying) {
      resetControlsTimeout()
    } else {
      setShowControls(true)
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current)
      }
    }
  }, [isPlaying, resetControlsTimeout])

  // Mouse/touch handlers for showing controls
  const handleInteraction = useCallback(() => {
    resetControlsTimeout()
  }, [resetControlsTimeout])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleInteraction()
      
      switch (e.key) {
        case ' ':
          e.preventDefault()
          setIsPlaying(prev => !prev)
          break
        case 'ArrowRight':
          if (!isPlaying) {
            setCurrentIndex(prev => Math.min(prev + 1, words.length - 1))
          }
          break
        case 'ArrowLeft':
          if (!isPlaying) {
            setCurrentIndex(prev => Math.max(prev - 1, 0))
          }
          break
        case 'ArrowUp':
          setWpm(prev => Math.min(prev + 50, 1000))
          break
        case 'ArrowDown':
          setWpm(prev => Math.max(prev - 50, 50))
          break
        case 'Escape':
          onExit?.()
          break
        case 'r':
          setCurrentIndex(0)
          setIsPlaying(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, words.length, onExit, handleInteraction])

  // Render word with ORP at fixed center position
  const renderWord = () => {
    if (!currentWord) return null

    const before = currentWord.slice(0, orpIndex)
    const orp = currentWord[orpIndex] || ''
    const after = currentWord.slice(orpIndex + 1)

    return (
      <div className="w-full flex justify-center">
        {/* Three-column layout: before | ORP | after */}
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
    <div 
      ref={containerRef}
      className={`fixed inset-0 bg-[color:var(--background)] flex flex-col items-center justify-center ${isPlaying && !showControls ? 'reading-mode' : ''}`}
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
      onClick={handleInteraction}
    >
      {/* Word Display - ORP always at exact center */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div 
          className="w-full max-w-4xl px-4 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-wide"
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif' }}
        >
          {renderWord()}
        </div>
      </div>

      {/* Controls - fade in/out based on interaction */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-6 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress bar */}
        <div className="progress-bar mb-6 max-w-2xl mx-auto">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* WPM control */}
          <div className="flex items-center gap-2 bg-[color:var(--surface)] rounded-lg px-4 py-2">
            <button
              onClick={() => setWpm(prev => Math.max(prev - 50, 50))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[color:var(--surface-hover)] transition-colors"
            >
              −
            </button>
            <span className="w-20 text-center font-medium">{wpm} WPM</span>
            <button
              onClick={() => setWpm(prev => Math.min(prev + 50, 1000))}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[color:var(--surface-hover)] transition-colors"
            >
              +
            </button>
          </div>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(prev => !prev)}
            className="btn-primary w-24 flex items-center justify-center gap-2"
          >
            {isPlaying ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play
              </>
            )}
          </button>

          {/* Restart */}
          <button
            onClick={() => {
              setCurrentIndex(0)
              setIsPlaying(false)
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Restart
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="btn-secondary flex items-center gap-2"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" />
                <path strokeLinecap="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>

          {/* Exit */}
          <button
            onClick={onExit}
            className="btn-secondary"
          >
            Exit
          </button>
        </div>

        {/* Keyboard shortcuts hint */}
        <p className="text-center text-[color:var(--muted)] text-sm mt-4">
          Space: play/pause • ←→: navigate • ↑↓: speed • R: restart • Esc: exit
        </p>

        {/* Word count */}
        <p className="text-center text-[color:var(--muted)] text-xs mt-2">
          Word {currentIndex + 1} of {words.length}
        </p>
      </div>
    </div>
  )
}
