'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Share, Check } from 'lucide-react'
import { calculateORP, ContentItem } from '@/lib/pdfParser'
import { useTheme } from './ThemeProvider'

interface SpeedReaderProps {
  // Support both legacy string[] and new ContentItem[]
  words?: string[]
  content?: ContentItem[]
  initialWpm?: number
  autoStart?: boolean  // If true, show countdown and autoplay
  documentId?: string  // If provided, copies share link directly
  onRequestPublish?: () => void  // Called when user wants to share unsaved content
  onComplete?: () => void
  onExit?: () => void
  isLoadingMore?: boolean  // True when more content is being loaded progressively
}

export default function SpeedReader({ 
  words,
  content,
  initialWpm = 300, 
  autoStart = false,
  documentId,
  onRequestPublish,
  onComplete,
  onExit,
  isLoadingMore = false
}: SpeedReaderProps) {
  // Convert legacy words array to content items if needed
  const contentItems: ContentItem[] = content || (words?.map(w => ({ type: 'word' as const, value: w })) || [])
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [wpm, setWpm] = useState(initialWpm)
  const [showControls, setShowControls] = useState(!autoStart) // Hide controls if autoStart
  const [countdown, setCountdown] = useState<number | null>(autoStart ? 3 : null)
  const [showCopied, setShowCopied] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [waitingForImageClick, setWaitingForImageClick] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasEnteredFullscreen = useRef(false)
  const { theme, toggleTheme } = useTheme()

  const currentItem = contentItems[currentIndex]
  const isCurrentImage = currentItem?.type === 'image'
  const isCurrentSection = currentItem?.type === 'section'
  
  // Calculate progress based on word count (images/sections don't count toward reading progress the same way)
  const wordCount = contentItems.filter(item => item.type === 'word').length
  const wordsRead = contentItems.slice(0, currentIndex + 1).filter(item => item.type === 'word').length
  const progress = wordCount > 0 ? (wordsRead / wordCount) * 100 : 0

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (e) {
      console.error('Fullscreen error:', e)
    }
  }, [])

  // Listen for fullscreen changes (user can exit with Escape or browser controls)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Auto-enter fullscreen when component mounts (always, not just autoStart)
  useEffect(() => {
    if (!hasEnteredFullscreen.current && containerRef.current) {
      hasEnteredFullscreen.current = true
      // Small delay to ensure the component is mounted
      const timer = setTimeout(() => {
        containerRef.current?.requestFullscreen().catch(() => {
          // Fullscreen may fail if not triggered by user gesture, that's ok
        })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [])

  // Handle share button click
  const handleShare = useCallback(async () => {
    if (documentId) {
      // Already published - copy share link
      const shareUrl = `${window.location.origin}/library?read=${documentId}`
      try {
        await navigator.clipboard.writeText(shareUrl)
        setShowCopied(true)
        setToastMessage('Link copied to clipboard')
        setTimeout(() => {
          setShowCopied(false)
          setToastMessage(null)
        }, 2000)
      } catch (e) {
        console.error('Failed to copy link:', e)
        setToastMessage('Failed to copy link')
        setTimeout(() => setToastMessage(null), 2000)
      }
    } else if (onRequestPublish) {
      // Not published yet - trigger publish flow
      // First exit fullscreen so the modal can be visible
      setIsPlaying(false)
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
      onRequestPublish()
    }
  }, [documentId, onRequestPublish])

  // Calculate interval from WPM
  const interval = Math.round(60000 / wpm)

  // Calculate time remaining based on WPM and words left
  const wordsRemaining = wordCount - wordsRead
  const minutesRemaining = wordsRemaining / wpm
  const totalSecondsRemaining = Math.ceil(minutesRemaining * 60)
  const displayMinutes = Math.floor(totalSecondsRemaining / 60)
  const displaySeconds = totalSecondsRemaining % 60
  const timeRemainingText = `${displayMinutes}:${displaySeconds.toString().padStart(2, '0')}`

  // Handle continuing past an image
  const handleImageContinue = useCallback(() => {
    setWaitingForImageClick(false)
    setCurrentIndex(prev => {
      if (prev >= contentItems.length - 1) {
        setIsPlaying(false)
        onComplete?.()
        return prev
      }
      return prev + 1
    })
  }, [contentItems.length, onComplete])

  // Countdown timer for autoStart
  useEffect(() => {
    if (countdown === null) return

    if (countdown === 0) {
      setCountdown(null)
      setIsPlaying(true)
      return
    }

    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null))
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown])

  // Auto-advance words (but pause on images, auto-advance sections)
  useEffect(() => {
    if (!isPlaying || waitingForImageClick) return

    // Check if current item is an image
    if (isCurrentImage) {
      setIsPlaying(false)
      setWaitingForImageClick(true)
      setShowControls(true)
      return
    }

    // Check if current item is a section title — show briefly then auto-advance
    if (isCurrentSection) {
      const sectionTimer = setTimeout(() => {
        setCurrentIndex(prev => {
          if (prev >= contentItems.length - 1) {
            setIsPlaying(false)
            onComplete?.()
            return prev
          }
          return prev + 1
        })
      }, 2000) // Show section title for 2 seconds
      return () => clearTimeout(sectionTimer)
    }

    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = prev + 1
        
        if (nextIndex >= contentItems.length) {
          setIsPlaying(false)
          onComplete?.()
          return prev
        }
        
        // Check if next item is an image - if so, we'll handle it in the next render
        return nextIndex
      })
    }, interval)

    return () => clearInterval(timer)
  }, [isPlaying, interval, contentItems, isCurrentImage, isCurrentSection, onComplete, waitingForImageClick])

  // Hide controls after inactivity during playback
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true)
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current)
    }
    if ((isPlaying || countdown !== null) && !waitingForImageClick) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false)
      }, 1000)
    }
  }, [isPlaying, countdown, waitingForImageClick])

  useEffect(() => {
    if (isPlaying || countdown !== null) {
      // Set up hide timer when playback starts or countdown is active
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current)
      }
      if (!waitingForImageClick) {
        hideControlsTimeout.current = setTimeout(() => {
          setShowControls(false)
        }, 1000)
      }
    } else {
      // When stopped, ensure controls are visible
      setShowControls(true)
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current)
      }
    }
  }, [isPlaying, countdown, waitingForImageClick])

  // Mouse/touch handlers for showing controls
  const handleInteraction = useCallback(() => {
    resetControlsTimeout()
  }, [resetControlsTimeout])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleInteraction()
      
      // Cancel countdown on any key press
      if (countdown !== null) {
        setCountdown(null)
      }
      
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault()
          if (waitingForImageClick) {
            handleImageContinue()
          } else {
            setIsPlaying(prev => !prev)
          }
          break
        case 'ArrowRight':
          if (waitingForImageClick) {
            handleImageContinue()
          } else {
            setIsPlaying(false)
            setCurrentIndex(prev => Math.min(prev + 1, contentItems.length - 1))
          }
          break
        case 'ArrowLeft':
          setWaitingForImageClick(false)
          setIsPlaying(false)
          setCurrentIndex(prev => Math.max(prev - 1, 0))
          break
        case 'ArrowUp':
          setWpm(prev => Math.min(prev + 50, 1000))
          break
        case 'ArrowDown':
          setWpm(prev => Math.max(prev - 50, 50))
          break
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen()
          } else {
            onExit?.()
          }
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'r':
          setCurrentIndex(0)
          setIsPlaying(false)
          setWaitingForImageClick(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, countdown, contentItems.length, onExit, handleInteraction, waitingForImageClick, handleImageContinue, toggleFullscreen])

  // Render word with ORP at fixed center position
  const renderWord = () => {
    if (!currentItem || currentItem.type !== 'word') return null
    
    const currentWord = currentItem.value
    const orpIndex = calculateORP(currentWord)
    const before = currentWord.slice(0, orpIndex)
    const orp = currentWord[orpIndex] || ''
    const after = currentWord.slice(orpIndex + 1)

    // Use invisible padding to center the ORP letter while maintaining natural letter spacing.
    // By adding invisible "after" on the left and invisible "before" on the right,
    // the visible word is balanced around the ORP letter.
    return (
      <div className="relative w-full h-[1.2em] overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex whitespace-nowrap">
            {/* Invisible padding: width of "after" text */}
            <span className="invisible" aria-hidden="true">{after}</span>
            {/* Visible word with highlighted ORP */}
            <span className="text-[color:var(--foreground)]">{before}</span>
            <span className="text-[color:var(--accent)] font-semibold">{orp}</span>
            <span className="text-[color:var(--foreground)]">{after}</span>
            {/* Invisible padding: width of "before" text */}
            <span className="invisible" aria-hidden="true">{before}</span>
          </span>
        </div>
        {/* Left fade mask for overflow */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-20 pointer-events-none z-20"
          style={{ 
            background: 'linear-gradient(to right, var(--background), transparent)' 
          }}
        />
        {/* Right fade mask for overflow */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-20 pointer-events-none z-20"
          style={{ 
            background: 'linear-gradient(to left, var(--background), transparent)' 
          }}
        />
      </div>
    )
  }

  // Render image with continue button
  const renderImage = () => {
    if (!currentItem || currentItem.type !== 'image') return null

    return (
      <div className="flex flex-col items-center gap-6 max-w-4xl mx-auto px-4">
        {/* Image container */}
        <div className="relative w-full flex justify-center">
          <img
            src={currentItem.src}
            alt={currentItem.alt || 'Document image'}
            className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
            style={{
              maxWidth: currentItem.width ? Math.min(currentItem.width, 800) : '100%'
            }}
          />
        </div>
        
        {/* Image caption */}
        {currentItem.alt && (
          <p className="text-[color:var(--muted)] text-sm text-center">
            {currentItem.alt}
          </p>
        )}
        
        {/* Continue button */}
        <button
          onClick={handleImageContinue}
          className="btn-primary flex items-center gap-2 px-8 py-4 text-lg"
        >
          Continue Reading
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
        
        <p className="text-[color:var(--muted)] text-sm">
          Press Space, Enter, or → to continue
        </p>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 bg-[color:var(--background)] flex flex-col items-center justify-center ${(isPlaying || countdown !== null) && !showControls ? 'reading-mode' : ''}`}
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
      onClick={handleInteraction}
    >
      {/* Top right buttons */}
      <div className={`absolute top-6 right-6 flex items-center gap-2 transition-all duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        {/* Share button - shown when document is shareable OR can be published */}
        {(documentId || onRequestPublish) && (
          <button
            onClick={handleShare}
            className="relative w-10 h-10 flex items-center justify-center rounded-full bg-[color:var(--surface)] border border-[color:var(--border)] hover:bg-[color:var(--surface-hover)] transition-colors"
            aria-label={documentId ? "Share" : "Publish to share"}
          >
            {showCopied ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Share className="w-5 h-5" />
            )}
          </button>
        )}
        
        {/* Exit button */}
        <button
          onClick={onExit}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[color:var(--surface)] border border-[color:var(--border)] hover:bg-[color:var(--surface-hover)] transition-colors"
          aria-label="Exit"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Toast notification */}
      {toastMessage && (
        <div className="absolute top-20 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div className="bg-green-500/90 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-toast-in">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Countdown display - top of screen, horizontally centered */}
      {countdown !== null && (
        <div className="absolute top-12 left-0 right-0 flex justify-center pointer-events-none">
          <span className="text-6xl font-bold text-[color:var(--accent)]">{countdown}</span>
        </div>
      )}

      {/* Time remaining - top center, subtle text, shows/hides with controls */}
      {countdown === null && wordsRemaining > 0 && !isCurrentImage && !isCurrentSection && (
        <div className={`absolute top-6 left-0 right-0 flex justify-center pointer-events-none transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}>
          <span className="text-sm text-[color:var(--muted)]">{timeRemainingText}</span>
        </div>
      )}

      {/* Content Display - Word, Image, or Section Title */}
      <div className="flex-1 flex items-center justify-center w-full pb-[10vh]">
        {isCurrentSection ? (
          <div className="flex flex-col items-center gap-4 px-6 animate-fade-in">
            <div className="w-12 h-1 bg-[color:var(--accent)] rounded-full" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center text-[color:var(--foreground)]">
              {currentItem.type === 'section' ? currentItem.title : ''}
            </h2>
            <div className="w-12 h-1 bg-[color:var(--accent)] rounded-full" />
          </div>
        ) : isCurrentImage ? (
          renderImage()
        ) : (
          <div 
            className="relative w-full max-w-4xl px-4 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-wide"
            style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif' }}
          >
            {/* Top guide line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-screen h-px pointer-events-none" style={{ background: 'var(--guide)' }}>
              <div className="absolute top-0 left-1/2 w-px h-6" style={{ background: 'var(--guide)' }} />
            </div>
            {renderWord()}
            {/* Bottom guide line */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-screen h-px pointer-events-none" style={{ background: 'var(--guide)' }}>
              <div className="absolute bottom-0 left-1/2 w-px h-6" style={{ background: 'var(--guide)' }} />
            </div>
          </div>
        )}
      </div>

      {/* Controls - fade in/out based on interaction (hidden when viewing images or sections) */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-6 transition-opacity duration-300 ${
          showControls && !isCurrentImage && !isCurrentSection ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress bar - clickable to seek */}
        <div 
          className="progress-bar mb-6 max-w-2xl mx-auto cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            const percentage = clickX / rect.width
            const newIndex = Math.floor(percentage * contentItems.length)
            setCurrentIndex(Math.max(0, Math.min(newIndex, contentItems.length - 1)))
            setWaitingForImageClick(false)
          }}
        >
          <div 
            className="progress-fill pointer-events-none" 
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap px-2">
          {/* WPM control */}
          <div className="flex items-center gap-1 sm:gap-2 bg-[color:var(--surface)] rounded-lg px-2 sm:px-4 py-2">
            <button
              onClick={() => setWpm(prev => Math.max(prev - 50, 50))}
              className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-[color:var(--surface-hover)] transition-colors text-lg"
            >
              −
            </button>
            <span className="w-16 sm:w-20 text-center font-medium text-sm sm:text-base">{wpm} WPM</span>
            <button
              onClick={() => setWpm(prev => Math.min(prev + 50, 1000))}
              className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-[color:var(--surface-hover)] transition-colors text-lg"
            >
              +
            </button>
          </div>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(prev => !prev)}
            className="w-12 h-12 flex items-center justify-center rounded-lg bg-[color:var(--accent)] hover:opacity-90 transition-opacity"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Restart */}
          <button
            onClick={() => {
              setCurrentIndex(0)
              setIsPlaying(false)
              setWaitingForImageClick(false)
            }}
            className="w-12 h-12 flex items-center justify-center rounded-lg bg-[color:var(--surface)] border border-[color:var(--border)] hover:bg-[color:var(--surface-hover)] transition-colors"
            aria-label="Restart"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-12 h-12 flex items-center justify-center rounded-lg bg-[color:var(--surface)] border border-[color:var(--border)] hover:bg-[color:var(--surface-hover)] transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
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

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="w-12 h-12 flex items-center justify-center rounded-lg bg-[color:var(--surface)] border border-[color:var(--border)] hover:bg-[color:var(--surface-hover)] transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9H4m5 0V4m0 5L4 4m11 11h5m-5 0v5m0-5l5 5M9 15H4m5 0v5m0-5l-5 5m11-11h5m-5 0V4m0 5l5-5" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5" />
              </svg>
            )}
          </button>
        </div>

        {/* Keyboard shortcuts hint - desktop */}
        <p className="hidden sm:block text-center text-[color:var(--muted)] text-sm mt-4">
          Space: play/pause • ←→: navigate • ↑↓: speed • F: fullscreen
        </p>
        {/* Touch hint - mobile */}
        <p className="sm:hidden text-center text-[color:var(--muted)] text-sm mt-4">
          Tap screen to show/hide controls
        </p>

        {/* Word count */}
        <p className="text-center text-[color:var(--muted)] text-xs mt-2">
          Word {wordsRead} of {wordCount}
          {isLoadingMore && (
            <span className="ml-2 inline-flex items-center gap-1">
              • <span className="w-2 h-2 border border-[color:var(--accent)] border-t-transparent rounded-full animate-spin inline-block" />
              Loading more...
            </span>
          )}
          {!isLoadingMore && contentItems.some(item => item.type === 'image') && (
            <span className="ml-2">• Includes images</span>
          )}
        </p>
      </div>
    </div>
  )
}
