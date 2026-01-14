'use client'

import { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'

// WebLN type declarations
declare global {
  interface Window {
    webln?: {
      enable: () => Promise<void>
      sendPayment: (paymentRequest: string) => Promise<{ preimage: string }>
    }
  }
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onPaymentComplete: (macaroon: string) => void
  documentId: string
  documentTitle: string
}

interface L402Challenge {
  paymentHash: string
  paymentRequest: string
  macaroon: string
  expiresAt: number
  priceSats: number
  creatorName?: string
  paymentType: 'creator' | 'platform'
}

export default function PaymentModal({
  isOpen,
  onClose,
  onPaymentComplete,
  documentId,
  documentTitle,
}: PaymentModalProps) {
  const [challenge, setChallenge] = useState<L402Challenge | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hasWebLN, setHasWebLN] = useState(false)
  const [webLNPaying, setWebLNPaying] = useState(false)

  // Check for WebLN support (Alby, etc.)
  useEffect(() => {
    setHasWebLN(typeof window !== 'undefined' && !!window.webln)
  }, [])

  // Fetch L402 challenge when modal opens
  useEffect(() => {
    if (isOpen && documentId) {
      fetchChallenge()
    }
  }, [isOpen, documentId])

  // Generate QR code when we have an invoice
  useEffect(() => {
    if (challenge?.paymentRequest) {
      QRCode.toDataURL(challenge.paymentRequest.toUpperCase(), {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).then(setQrCodeUrl)
    }
  }, [challenge?.paymentRequest])

  const fetchChallenge = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/l402/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })

      const data = await response.json()

      if (response.status === 402) {
        setChallenge(data)
      } else {
        setError(data.error || 'Failed to get payment details')
      }
    } catch (e) {
      setError('Failed to connect to payment server')
      console.error('Challenge fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  // Poll for payment completion (only works for platform payments)
  const checkPayment = useCallback(async (preimage?: string) => {
    if (!challenge) return false

    try {
      const response = await fetch('/api/l402/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          macaroon: challenge.macaroon,
          documentId,
          preimage, // Include preimage for creator payments
        }),
      })

      const data = await response.json()
      return data.paid === true
    } catch {
      return false
    }
  }, [challenge, documentId])

  // Start polling when challenge is available (only for platform payments)
  useEffect(() => {
    // Only poll for platform payments - creator payments need preimage from WebLN
    if (!challenge || checking || challenge.paymentType === 'creator') return

    const pollInterval = setInterval(async () => {
      setChecking(true)
      const paid = await checkPayment()
      setChecking(false)

      if (paid) {
        clearInterval(pollInterval)
        onPaymentComplete(challenge.macaroon)
      }
    }, 2000) // Check every 2 seconds

    return () => clearInterval(pollInterval)
  }, [challenge, checking, checkPayment, onPaymentComplete])

  const handleWebLNPayment = async () => {
    if (!window.webln || !challenge) return

    setWebLNPaying(true)
    setError(null)

    try {
      await window.webln.enable()
      const result = await window.webln.sendPayment(challenge.paymentRequest)
      
      // Payment successful via WebLN
      // For creator payments, verify with the preimage
      if (challenge.paymentType === 'creator' && result.preimage) {
        const paid = await checkPayment(result.preimage)
        if (paid) {
          onPaymentComplete(challenge.macaroon)
        } else {
          setError('Payment verification failed. Please try again.')
        }
      } else {
        // Platform payment - give a moment for the node to register
        await new Promise(resolve => setTimeout(resolve, 1000))
        onPaymentComplete(challenge.macaroon)
      }
    } catch (e) {
      // User cancelled or payment failed - they can still pay via QR
      console.log('WebLN payment cancelled or failed:', e)
      setError('WebLN payment cancelled. You can still pay using the QR code.')
    } finally {
      setWebLNPaying(false)
    }
  }

  const copyInvoice = () => {
    if (challenge?.paymentRequest) {
      navigator.clipboard.writeText(challenge.paymentRequest)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
      <div className="relative bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
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
        <div className="text-center mb-4 sm:mb-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3 rounded-full bg-[#F7931A]/20 flex items-center justify-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#F7931A] flex items-center justify-center">
              <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 64 64" fill="none">
                <path fill="#ffffff" d="M46.11 27.44c.63-4.23-2.6-6.5-7.03-8.02l1.44-5.76-3.51-.88-1.4 5.61c-.92-.23-1.87-.45-2.81-.66l1.41-5.64-3.51-.88-1.44 5.75c-.76-.17-1.5-.34-2.23-.52l-4.84-1.2-.93 3.75s2.6.6 2.54.63c1.42.36 1.67 1.3 1.63 2.04l-1.64 6.56c.1.03.23.07.37.12l-.38-.09-2.3 9.2c-.17.43-.62 1.08-1.62.83.04.05-2.54-.63-2.54-.63l-1.74 4.02 4.57 1.14c.85.21 1.68.44 2.5.65l-1.45 5.84 3.5.88 1.44-5.77c.96.26 1.89.5 2.8.73l-1.43 5.74 3.51.88 1.45-5.83c5.99 1.13 10.49.68 12.38-4.74 1.53-4.36-.08-6.88-3.23-8.52 2.3-.53 4.03-2.04 4.49-5.15zm-8.03 11.26c-1.09 4.36-8.44 2-10.83 1.41l1.93-7.74c2.39.6 10.02 1.78 8.9 6.33zm1.08-11.33c-.99 3.97-7.1 1.95-9.09 1.46l1.75-7.02c1.99.5 8.36 1.42 7.34 5.56z"/>
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold mb-1">Pay with Bitcoin</h2>
          <p className="text-[color:var(--muted)] text-sm">
            {documentTitle}
          </p>
          {challenge?.creatorName && (
            <p className="text-[color:var(--muted)] text-xs mt-1">
              by {challenge.creatorName}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-8">
            <div className="w-10 h-10 border-4 border-[#F7931A] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[color:var(--muted)]">Generating invoice...</p>
          </div>
        ) : error && !challenge ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchChallenge}
              className="px-4 py-2 bg-[#F7931A] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        ) : challenge ? (
          <div className="space-y-4">
            {/* Price */}
            <div className="text-center">
              <span className="text-3xl font-bold text-[#F7931A]">
                {challenge.priceSats}
              </span>
              <span className="text-[color:var(--muted)] ml-2">sats</span>
            </div>

            {/* WebLN Button */}
            {hasWebLN && (
              <button
                onClick={handleWebLNPayment}
                disabled={webLNPaying}
                className="w-full py-3 bg-[#F7931A] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {webLNPaying ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 64 64" fill="none">
                      <circle cx="32" cy="32" r="32" fill="currentColor" fillOpacity="0.2"/>
                      <path fill="currentColor" d="M46.11 27.44c.63-4.23-2.6-6.5-7.03-8.02l1.44-5.76-3.51-.88-1.4 5.61c-.92-.23-1.87-.45-2.81-.66l1.41-5.64-3.51-.88-1.44 5.75c-.76-.17-1.5-.34-2.23-.52l-4.84-1.2-.93 3.75s2.6.6 2.54.63c1.42.36 1.67 1.3 1.63 2.04l-1.64 6.56c.1.03.23.07.37.12l-.38-.09-2.3 9.2c-.17.43-.62 1.08-1.62.83.04.05-2.54-.63-2.54-.63l-1.74 4.02 4.57 1.14c.85.21 1.68.44 2.5.65l-1.45 5.84 3.5.88 1.44-5.77c.96.26 1.89.5 2.8.73l-1.43 5.74 3.51.88 1.45-5.83c5.99 1.13 10.49.68 12.38-4.74 1.53-4.36-.08-6.88-3.23-8.52 2.3-.53 4.03-2.04 4.49-5.15zm-8.03 11.26c-1.09 4.36-8.44 2-10.83 1.41l1.93-7.74c2.39.6 10.02 1.78 8.9 6.33zm1.08-11.33c-.99 3.97-7.1 1.95-9.09 1.46l1.75-7.02c1.99.5 8.36 1.42 7.34 5.56z"/>
                    </svg>
                    Pay with Alby / WebLN
                  </>
                )}
              </button>
            )}

            {hasWebLN && (
              <div className="flex items-center gap-4 text-[color:var(--muted)] text-sm">
                <div className="flex-1 h-px bg-[color:var(--border)]" />
                <span>or scan QR code</span>
                <div className="flex-1 h-px bg-[color:var(--border)]" />
              </div>
            )}

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="flex justify-center">
                <div className="bg-white p-2 sm:p-3 rounded-xl">
                  <img src={qrCodeUrl} alt="Lightning Invoice QR" className="w-40 h-40 sm:w-48 sm:h-48" />
                </div>
              </div>
            )}

            {/* Copy Invoice */}
            <button
              onClick={copyInvoice}
              className="w-full py-2 border border-[color:var(--border)] rounded-lg text-sm hover:bg-[color:var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Invoice
                </>
              )}
            </button>

            {/* Status */}
            <div className="flex flex-col items-center gap-2 text-[color:var(--muted)] text-sm">
              <div className="flex items-center gap-2">
                {checking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#F7931A] border-t-transparent rounded-full animate-spin" />
                    Checking payment...
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    Waiting for payment...
                  </>
                )}
              </div>
              {challenge.paymentType === 'creator' && (
                <p className="text-xs text-center">
                  Payment goes directly to the creator
                </p>
              )}
            </div>

            {error && (
              <p className="text-center text-yellow-400 text-sm">{error}</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
