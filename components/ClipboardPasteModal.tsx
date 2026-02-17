'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface ClipboardPasteModalProps {
  isOpen: boolean
  onClose: () => void
  onPaste: (text: string) => void
}

/**
 * A modal that provides a fallback for pasting text on mobile browsers
 * where navigator.clipboard.readText() is not supported (iOS Safari, etc.)
 * 
 * The user can paste into a textarea using the native paste gesture or Cmd/Ctrl+V
 */
export default function ClipboardPasteModal({ isOpen, onClose, onPaste }: ClipboardPasteModalProps) {
  const [pastedText, setPastedText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus the textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPastedText('')
    }
  }, [isOpen])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData?.getData('text')
    if (text && text.trim().length > 0) {
      e.preventDefault()
      setPastedText(text)
      // Auto-submit after a brief moment to show the user what was pasted
      setTimeout(() => {
        onPaste(text)
        onClose()
      }, 300)
    }
  }, [onPaste, onClose])

  const handleSubmit = useCallback(() => {
    if (pastedText.trim().length > 0) {
      onPaste(pastedText)
      onClose()
    }
  }, [pastedText, onPaste, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="w-full max-w-md bg-[color:var(--background)] rounded-2xl shadow-2xl border border-[color:var(--border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[color:var(--border)]">
          <h2 className="text-lg font-semibold">Paste Text</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[color:var(--surface)] transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-[color:var(--muted)] text-sm mb-4">
            Tap the box below and paste your text using the keyboard or context menu.
          </p>
          
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              onPaste={handlePaste}
              placeholder="Tap here, then paste (⌘V or long-press → Paste)"
              className="w-full h-40 p-4 rounded-xl bg-[color:var(--surface)] border-2 border-[color:var(--border)] 
                focus:border-[color:var(--accent)] focus:outline-none resize-none
                text-base placeholder:text-[color:var(--muted)]"
              style={{ fontSize: '16px' }} // Prevents iOS zoom on focus
            />
            
            {/* Visual hint when empty */}
            {!pastedText && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="text-center opacity-50">
                  <svg className="w-8 h-8 mx-auto mb-2 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Instructions for iOS users */}
          <div className="mt-3 text-xs text-[color:var(--muted)] flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Tap the text box, then long-press and select "Paste" from the menu</span>
          </div>
        </div>

        {/* Footer with action buttons */}
        <div className="flex gap-3 p-4 border-t border-[color:var(--border)]">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-[color:var(--border)] 
              hover:bg-[color:var(--surface)] transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!pastedText.trim()}
            className="flex-1 py-3 px-4 rounded-xl bg-[color:var(--accent)] text-white 
              font-semibold hover:opacity-90 transition-opacity
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to handle clipboard paste with fallback modal
 * Tries async clipboard API first, falls back to modal if not supported
 */
export function useClipboardPaste() {
  const [showModal, setShowModal] = useState(false)
  const [onPasteCallback, setOnPasteCallback] = useState<((text: string) => void) | null>(null)

  const requestPaste = useCallback(async (
    onSuccess: (text: string) => void,
    onError?: (error: string) => void
  ): Promise<boolean> => {
    // Check if async clipboard API is available and might work
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        // First check permissions if available
        if ('permissions' in navigator && 'query' in navigator.permissions) {
          try {
            const permissionStatus = await navigator.permissions.query({ 
              name: 'clipboard-read' as PermissionName 
            })
            
            // If explicitly denied, go straight to fallback
            if (permissionStatus.state === 'denied') {
              // Show fallback modal
              setOnPasteCallback(() => onSuccess)
              setShowModal(true)
              return true
            }
          } catch {
            // Permissions query not supported (e.g., Safari), continue to try direct read
          }
        }

        // Try to read directly
        const text = await navigator.clipboard.readText()
        
        if (text && text.trim().length > 0) {
          onSuccess(text)
          return true
        } else {
          onError?.('Clipboard is empty')
          return false
        }
      } catch (err) {
        // Clipboard API failed - show fallback modal
        console.log('Clipboard API failed, showing fallback modal:', err)
        setOnPasteCallback(() => onSuccess)
        setShowModal(true)
        return true
      }
    } else {
      // Clipboard API not available - show fallback modal
      setOnPasteCallback(() => onSuccess)
      setShowModal(true)
      return true
    }
  }, [])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setOnPasteCallback(null)
  }, [])

  const handleModalPaste = useCallback((text: string) => {
    if (onPasteCallback) {
      onPasteCallback(text)
    }
    closeModal()
  }, [onPasteCallback, closeModal])

  return {
    showModal,
    closeModal,
    handleModalPaste,
    requestPaste,
  }
}
