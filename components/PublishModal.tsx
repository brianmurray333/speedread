'use client'

import { useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { isValidLightningAddress, validateLightningAddress } from '@/lib/lnurl'

interface PublishModalProps {
  isOpen: boolean
  onClose: () => void
  onPublished: () => void
  title: string
  textContent: string
  wordCount: number
}

export default function PublishModal({
  isOpen,
  onClose,
  onPublished,
  title,
  textContent,
  wordCount,
}: PublishModalProps) {
  const [docTitle, setDocTitle] = useState(title)
  const [creatorName, setCreatorName] = useState('')
  const [lightningAddress, setLightningAddress] = useState('')
  const [priceSats, setPriceSats] = useState(0)
  const [isPaid, setIsPaid] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addressValid, setAddressValid] = useState<boolean | null>(null)

  const validateAddress = async () => {
    if (!lightningAddress) {
      setAddressValid(null)
      return
    }

    if (!isValidLightningAddress(lightningAddress)) {
      setAddressValid(false)
      setError('Invalid Lightning Address format (e.g., user@getalby.com)')
      return
    }

    setValidating(true)
    setError(null)

    try {
      const result = await validateLightningAddress(lightningAddress)
      setAddressValid(result.valid)
      if (!result.valid) {
        setError(result.error || 'Could not validate Lightning Address')
      } else if (result.minSats && priceSats < result.minSats) {
        setError(`Minimum amount is ${result.minSats} sats for this address`)
      }
    } catch {
      setAddressValid(false)
      setError('Could not validate Lightning Address')
    } finally {
      setValidating(false)
    }
  }

  const handlePublish = async () => {
    setError(null)

    // Validation
    if (!docTitle.trim()) {
      setError('Please enter a title')
      return
    }

    if (isPaid) {
      if (priceSats < 1) {
        setError('Price must be at least 1 sat')
        return
      }
      if (!lightningAddress) {
        setError('Lightning Address is required for paid documents')
        return
      }
      if (!isValidLightningAddress(lightningAddress)) {
        setError('Invalid Lightning Address format')
        return
      }
    }

    setPublishing(true)

    try {
      const { error: dbError } = await getSupabase().from('documents').insert({
        title: docTitle.trim(),
        text_content: textContent,
        word_count: wordCount,
        is_public: true,
        price_sats: isPaid ? priceSats : 0,
        lightning_address: isPaid ? lightningAddress : null,
        creator_name: creatorName.trim() || null,
      })

      if (dbError) {
        throw dbError
      }

      onPublished()
    } catch (e) {
      console.error('Publish error:', e)
      setError('Failed to publish document. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-1">Publish to Library</h2>
          <p className="text-[color:var(--muted)] text-sm">
            Share this document with the community
          </p>
        </div>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Document Title</label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg focus:outline-none focus:border-[color:var(--accent)] transition-colors"
              placeholder="Enter title..."
            />
          </div>

          {/* Creator Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Your Name (optional)</label>
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg focus:outline-none focus:border-[color:var(--accent)] transition-colors"
              placeholder="Anonymous"
            />
          </div>

          {/* Word count display */}
          <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {wordCount.toLocaleString()} words
          </div>

          {/* Paid toggle */}
          <div className="border border-[color:var(--border)] rounded-xl p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[color:var(--accent)]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[color:var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Add Lightning Paywall</div>
                  <div className="text-sm text-[color:var(--muted)]">Earn sats when people read</div>
                </div>
              </div>
              <div 
                className={`w-12 h-7 rounded-full transition-colors relative ${isPaid ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--border)]'}`}
                onClick={() => setIsPaid(!isPaid)}
              >
                <div 
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${isPaid ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </div>
            </label>

            {/* Paid options */}
            {isPaid && (
              <div className="mt-4 pt-4 border-t border-[color:var(--border)] space-y-4">
                {/* Price */}
                <div>
                  <label className="block text-sm font-medium mb-2">Price (sats)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={priceSats || ''}
                      onChange={(e) => setPriceSats(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg focus:outline-none focus:border-[color:var(--accent)] transition-colors pr-16"
                      placeholder="100"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--muted)]">sats</span>
                  </div>
                  <p className="text-xs text-[color:var(--muted)] mt-1">
                    Suggested: 10-500 sats depending on content length
                  </p>
                </div>

                {/* Lightning Address */}
                <div>
                  <label className="block text-sm font-medium mb-2">Your Lightning Address</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={lightningAddress}
                      onChange={(e) => {
                        setLightningAddress(e.target.value)
                        setAddressValid(null)
                      }}
                      onBlur={validateAddress}
                      className={`w-full px-4 py-2.5 bg-[color:var(--background)] border rounded-lg focus:outline-none transition-colors pr-10 ${
                        addressValid === true 
                          ? 'border-green-500' 
                          : addressValid === false 
                            ? 'border-red-500' 
                            : 'border-[color:var(--border)] focus:border-[color:var(--accent)]'
                      }`}
                      placeholder="you@getalby.com"
                    />
                    {validating && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {!validating && addressValid === true && (
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {!validating && addressValid === false && (
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-[color:var(--muted)] mt-1">
                    Get one free at <a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="text-[color:var(--accent)] hover:underline">getalby.com</a> or use your Voltage node
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="w-full py-3 bg-[color:var(--accent)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {publishing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Publish to Library
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
