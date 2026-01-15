'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

interface BitcoinInfoModalProps {
  isOpen: boolean
  onClose: () => void
}

interface TipInvoice {
  paymentRequest: string
  paymentHash: string
  amount: number
}

const TIP_AMOUNTS = [100, 500, 1000, 5000]

export default function BitcoinInfoModal({ isOpen, onClose }: BitcoinInfoModalProps) {
  const [showTip, setShowTip] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState(500)
  const [customAmount, setCustomAmount] = useState('')
  const [invoice, setInvoice] = useState<TipInvoice | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [hasWebLN, setHasWebLN] = useState(false)
  const [webLNPaying, setWebLNPaying] = useState(false)
  const [paid, setPaid] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setHasWebLN(typeof window !== 'undefined' && !!window.webln)
  }, [])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShowTip(false)
      setInvoice(null)
      setQrCodeUrl('')
      setError(null)
      setPaid(false)
    }
  }, [isOpen])

  // Generate QR code when we have an invoice
  useEffect(() => {
    if (invoice?.paymentRequest) {
      QRCode.toDataURL(invoice.paymentRequest.toUpperCase(), {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }).then(setQrCodeUrl)
    }
  }, [invoice?.paymentRequest])

  // Poll for payment
  useEffect(() => {
    if (!invoice || paid) return

    console.log('Starting payment poll for hash:', invoice.paymentHash)
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/tip/check?paymentHash=${invoice.paymentHash}`)
        const data = await response.json()
        console.log('Poll response:', data)
        if (data.paid) {
          setPaid(true)
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [invoice, paid])

  const generateInvoice = async () => {
    const amount = customAmount ? parseInt(customAmount) : selectedAmount
    if (!amount || amount < 1) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/tip/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log('Invoice generated:', data.paymentHash)
        setInvoice({
          paymentRequest: data.paymentRequest,
          paymentHash: data.paymentHash,
          amount,
        })
      } else {
        setError(data.error || 'Failed to generate invoice')
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleWebLNPayment = async () => {
    if (!window.webln || !invoice) return

    setWebLNPaying(true)
    setError(null)

    try {
      await window.webln.enable()
      await window.webln.sendPayment(invoice.paymentRequest)
      setPaid(true)
    } catch {
      setError('Payment cancelled. You can still pay using the QR code.')
    } finally {
      setWebLNPaying(false)
    }
  }

  const copyInvoice = () => {
    if (invoice?.paymentRequest) {
      navigator.clipboard.writeText(invoice.paymentRequest)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {paid ? (
          // Thank you screen
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-[color:var(--muted)]">
              Your tip of <span className="text-[#F7931A] font-semibold">{invoice?.amount} sats</span> has been received.
            </p>
            <p className="text-[color:var(--muted)] mt-2">
              We appreciate your support! ⚡
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-[#F7931A] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        ) : showTip ? (
          // Tip flow
          <div>
            <button
              onClick={() => {
                setShowTip(false)
                setInvoice(null)
                setError(null)
              }}
              className="flex items-center gap-1 text-[color:var(--muted)] hover:text-[color:var(--foreground)] mb-4 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="text-center mb-4">
              <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-[#F7931A]/20 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-[#F7931A] flex items-center justify-center">
                  <svg className="w-6 h-6" viewBox="0 0 64 64" fill="none">
                    <path fill="#ffffff" d="M46.11 27.44c.63-4.23-2.6-6.5-7.03-8.02l1.44-5.76-3.51-.88-1.4 5.61c-.92-.23-1.87-.45-2.81-.66l1.41-5.64-3.51-.88-1.44 5.75c-.76-.17-1.5-.34-2.23-.52l-4.84-1.2-.93 3.75s2.6.6 2.54.63c1.42.36 1.67 1.3 1.63 2.04l-1.64 6.56c.1.03.23.07.37.12l-.38-.09-2.3 9.2c-.17.43-.62 1.08-1.62.83.04.05-2.54-.63-2.54-.63l-1.74 4.02 4.57 1.14c.85.21 1.68.44 2.5.65l-1.45 5.84 3.5.88 1.44-5.77c.96.26 1.89.5 2.8.73l-1.43 5.74 3.51.88 1.45-5.83c5.99 1.13 10.49.68 12.38-4.74 1.53-4.36-.08-6.88-3.23-8.52 2.3-.53 4.03-2.04 4.49-5.15zm-8.03 11.26c-1.09 4.36-8.44 2-10.83 1.41l1.93-7.74c2.39.6 10.02 1.78 8.9 6.33zm1.08-11.33c-.99 3.97-7.1 1.95-9.09 1.46l1.75-7.02c1.99.5 8.36 1.42 7.34 5.56z"/>
                  </svg>
                </div>
              </div>
              <h2 className="text-lg font-bold mb-0.5">Tip SpeedRead</h2>
              <p className="text-[color:var(--muted)] text-xs">
                Support the project with a Lightning tip
              </p>
            </div>

            {!invoice ? (
              // Amount selection
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TIP_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        setSelectedAmount(amount)
                        setCustomAmount('')
                      }}
                      className={`py-3 sm:py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                        selectedAmount === amount && !customAmount
                          ? 'bg-[#F7931A] text-white border-[#F7931A]'
                          : 'border-[color:var(--border)] hover:border-[#F7931A] hover:text-[#F7931A]'
                      }`}
                    >
                      {amount} sats
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full px-4 py-2 bg-[color:var(--background)] border border-[color:var(--border)] rounded-lg focus:outline-none focus:border-[#F7931A] text-center"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--muted)] text-sm">
                    sats
                  </span>
                </div>

                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}

                <button
                  onClick={generateInvoice}
                  disabled={loading}
                  className="w-full py-3 bg-[#F7931A] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Invoice
                    </>
                  )}
                </button>
              </div>
            ) : (
              // Invoice display
              <div className="space-y-3">
                <div className="text-center">
                  <span className="text-xl font-bold text-[#F7931A]">{invoice.amount}</span>
                  <span className="text-[color:var(--muted)] ml-1 text-sm">sats</span>
                </div>

                {hasWebLN && (
                  <>
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
                    <div className="flex items-center gap-4 text-[color:var(--muted)] text-sm">
                      <div className="flex-1 h-px bg-[color:var(--border)]" />
                      <span>or scan QR</span>
                      <div className="flex-1 h-px bg-[color:var(--border)]" />
                    </div>
                  </>
                )}

                {qrCodeUrl && (
                  <div className="flex justify-center">
                    <div className="bg-white p-2 rounded-xl">
                      <img src={qrCodeUrl} alt="Lightning Invoice QR" className="w-36 h-36" />
                    </div>
                  </div>
                )}

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

                <div className="flex items-center justify-center gap-2 text-[color:var(--muted)] text-sm">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  Waiting for payment...
                </div>

                {error && (
                  <p className="text-center text-yellow-400 text-sm">{error}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          // Info screen
          <div>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#F7931A]/20 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#F7931A] flex items-center justify-center">
                  <svg className="w-7 h-7" viewBox="0 0 64 64" fill="none">
                    <path fill="#ffffff" d="M46.11 27.44c.63-4.23-2.6-6.5-7.03-8.02l1.44-5.76-3.51-.88-1.4 5.61c-.92-.23-1.87-.45-2.81-.66l1.41-5.64-3.51-.88-1.44 5.75c-.76-.17-1.5-.34-2.23-.52l-4.84-1.2-.93 3.75s2.6.6 2.54.63c1.42.36 1.67 1.3 1.63 2.04l-1.64 6.56c.1.03.23.07.37.12l-.38-.09-2.3 9.2c-.17.43-.62 1.08-1.62.83.04.05-2.54-.63-2.54-.63l-1.74 4.02 4.57 1.14c.85.21 1.68.44 2.5.65l-1.45 5.84 3.5.88 1.44-5.77c.96.26 1.89.5 2.8.73l-1.43 5.74 3.51.88 1.45-5.83c5.99 1.13 10.49.68 12.38-4.74 1.53-4.36-.08-6.88-3.23-8.52 2.3-.53 4.03-2.04 4.49-5.15zm-8.03 11.26c-1.09 4.36-8.44 2-10.83 1.41l1.93-7.74c2.39.6 10.02 1.78 8.9 6.33zm1.08-11.33c-.99 3.97-7.1 1.95-9.09 1.46l1.75-7.02c1.99.5 8.36 1.42 7.34 5.56z"/>
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold mb-1">Powered by Bitcoin</h2>
            </div>

            {/* Content */}
            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F7931A]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#F7931A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Private & Permissionless</h3>
                  <p className="text-[color:var(--muted)] text-sm">
                    No accounts or signups required. Pay with Bitcoin over Lightning for instant, private access to premium content.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F7931A]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#F7931A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">L402 Protocol</h3>
                  <p className="text-[color:var(--muted)] text-sm">
                    We use L402 (formerly LSAT) — a Bitcoin-native authentication protocol that lets you pay for access without creating an account.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F7931A]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#F7931A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Creator Monetization</h3>
                  <p className="text-[color:var(--muted)] text-sm">
                    Content creators can set prices for their documents and receive payments directly to their Lightning wallet — no middlemen.
                  </p>
                </div>
              </div>
            </div>

            {/* Tip Button */}
            <button
              onClick={() => setShowTip(true)}
              className="w-full py-3 bg-[#F7931A] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="32" fill="currentColor" fillOpacity="0.2"/>
                <path fill="currentColor" d="M46.11 27.44c.63-4.23-2.6-6.5-7.03-8.02l1.44-5.76-3.51-.88-1.4 5.61c-.92-.23-1.87-.45-2.81-.66l1.41-5.64-3.51-.88-1.44 5.75c-.76-.17-1.5-.34-2.23-.52l-4.84-1.2-.93 3.75s2.6.6 2.54.63c1.42.36 1.67 1.3 1.63 2.04l-1.64 6.56c.1.03.23.07.37.12l-.38-.09-2.3 9.2c-.17.43-.62 1.08-1.62.83.04.05-2.54-.63-2.54-.63l-1.74 4.02 4.57 1.14c.85.21 1.68.44 2.5.65l-1.45 5.84 3.5.88 1.44-5.77c.96.26 1.89.5 2.8.73l-1.43 5.74 3.51.88 1.45-5.83c5.99 1.13 10.49.68 12.38-4.74 1.53-4.36-.08-6.88-3.23-8.52 2.3-.53 4.03-2.04 4.49-5.15zm-8.03 11.26c-1.09 4.36-8.44 2-10.83 1.41l1.93-7.74c2.39.6 10.02 1.78 8.9 6.33zm1.08-11.33c-.99 3.97-7.1 1.95-9.09 1.46l1.75-7.02c1.99.5 8.36 1.42 7.34 5.56z"/>
              </svg>
              Tip the Project
            </button>

            <p className="text-center text-[color:var(--muted)] text-xs mt-3">
              Tips go directly to the SpeedRead Lightning node
            </p>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
