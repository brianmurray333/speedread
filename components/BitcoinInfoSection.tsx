'use client'

import { useState } from 'react'
import BitcoinInfoModal from './BitcoinInfoModal'

export default function BitcoinInfoSection() {
  const [showBitcoinModal, setShowBitcoinModal] = useState(false)

  return (
    <>
      <section className="py-12 px-4 sm:px-6 bg-[color:var(--surface)] border-t border-[color:var(--border)] sm:hidden">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#F7931A]/20 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-[#F7931A] flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 64 64" fill="none">
                  <path fill="#ffffff" d="M46.11 27.44c.63-4.23-2.6-6.5-7.03-8.02l1.44-5.76-3.51-.88-1.4 5.61c-.92-.23-1.87-.45-2.81-.66l1.41-5.64-3.51-.88-1.44 5.75c-.76-.17-1.5-.34-2.23-.52l-4.84-1.2-.93 3.75s2.6.6 2.54.63c1.42.36 1.67 1.3 1.63 2.04l-1.64 6.56c.1.03.23.07.37.12l-.38-.09-2.3 9.2c-.17.43-.62 1.08-1.62.83.04.05-2.54-.63-2.54-.63l-1.74 4.02 4.57 1.14c.85.21 1.68.44 2.5.65l-1.45 5.84 3.5.88 1.44-5.77c.96.26 1.89.5 2.8.73l-1.43 5.74 3.51.88 1.45-5.83c5.99 1.13 10.49.68 12.38-4.74 1.53-4.36-.08-6.88-3.23-8.52 2.3-.53 4.03-2.04 4.49-5.15zm-8.03 11.26c-1.09 4.36-8.44 2-10.83 1.41l1.93-7.74c2.39.6 10.02 1.78 8.9 6.33zm1.08-11.33c-.99 3.97-7.1 1.95-9.09 1.46l1.75-7.02c1.99.5 8.36 1.42 7.34 5.56z"/>
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold mb-1">Powered by Bitcoin</h2>
            <p className="text-[color:var(--muted)] text-sm">
              Private payments via Lightning Network
            </p>
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
                <h3 className="font-semibold text-sm mb-1">Private & Permissionless</h3>
                <p className="text-[color:var(--muted)] text-xs">
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
                <h3 className="font-semibold text-sm mb-1">L402 Protocol</h3>
                <p className="text-[color:var(--muted)] text-xs">
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
                <h3 className="font-semibold text-sm mb-1">Creator Monetization</h3>
                <p className="text-[color:var(--muted)] text-xs">
                  Content creators can set prices for their documents and receive payments directly to their Lightning wallet — no middlemen.
                </p>
              </div>
            </div>
          </div>

          {/* Tip Button */}
          <button
            onClick={() => setShowBitcoinModal(true)}
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
      </section>

      {/* Bitcoin Modal for Tipping */}
      <BitcoinInfoModal 
        isOpen={showBitcoinModal} 
        onClose={() => setShowBitcoinModal(false)} 
      />
    </>
  )
}
