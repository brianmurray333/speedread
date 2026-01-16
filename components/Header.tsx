'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpenText, LibraryBig, Gauge } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import BitcoinInfoModal from './BitcoinInfoModal'

export default function Header() {
  const { theme, toggleTheme } = useTheme()
  const [showBitcoinModal, setShowBitcoinModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[color:var(--background)]/80 backdrop-blur-md border-b border-[color:var(--border)] hidden sm:block">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <BookOpenText className="w-6 h-6 sm:w-7 sm:h-7 text-[color:var(--accent)]" />
          <span className="text-xl sm:text-2xl font-bold">
            <span className="text-[color:var(--foreground)]">speed</span>
            <span className="text-[color:var(--accent)]">read</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex items-center gap-2">
          <Link 
            href="/library" 
            className="p-2 rounded-lg text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--surface)] transition-colors"
            aria-label="Library"
          >
            <LibraryBig className="w-5 h-5" />
          </Link>
          <Link 
            href="/how-it-works" 
            className="p-2 rounded-lg text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--surface)] transition-colors"
            aria-label="How it works"
          >
            <Gauge className="w-5 h-5" />
          </Link>
          <button
            onClick={() => setShowBitcoinModal(true)}
            className="p-1.5 rounded-lg hover:bg-[color:var(--surface)] transition-colors"
            aria-label="Bitcoin info"
          >
            <div className="relative w-6 h-6">
              <div className="absolute inset-0 rounded-full bg-[#F7931A]/25 scale-[1.35]" />
              <svg className="relative w-6 h-6" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="32" fill="#F7931A"/>
                <path fill="#ffffff" transform="scale(0.65) translate(17, 17)" d="M46.11 27.44c.63-4.23-2.6-6.5-7.03-8.02l1.44-5.76-3.51-.88-1.4 5.61c-.92-.23-1.87-.45-2.81-.66l1.41-5.64-3.51-.88-1.44 5.75c-.76-.17-1.5-.34-2.23-.52l-4.84-1.2-.93 3.75s2.6.6 2.54.63c1.42.36 1.67 1.3 1.63 2.04l-1.64 6.56c.1.03.23.07.37.12l-.38-.09-2.3 9.2c-.17.43-.62 1.08-1.62.83.04.05-2.54-.63-2.54-.63l-1.74 4.02 4.57 1.14c.85.21 1.68.44 2.5.65l-1.45 5.84 3.5.88 1.44-5.77c.96.26 1.89.5 2.8.73l-1.43 5.74 3.51.88 1.45-5.83c5.99 1.13 10.49.68 12.38-4.74 1.53-4.36-.08-6.88-3.23-8.52 2.3-.53 4.03-2.04 4.49-5.15zm-8.03 11.26c-1.09 4.36-8.44 2-10.83 1.41l1.93-7.74c2.39.6 10.02 1.78 8.9 6.33zm1.08-11.33c-.99 3.97-7.1 1.95-9.09 1.46l1.75-7.02c1.99.5 8.36 1.42 7.34 5.56z"/>
              </svg>
            </div>
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-[color:var(--surface)] transition-colors"
            aria-label="Toggle theme"
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
        </nav>

        {/* Mobile Navigation Controls */}
        <div className="flex sm:hidden items-center gap-1">
          <button
            onClick={() => setShowBitcoinModal(true)}
            className="p-1.5 rounded-lg hover:bg-[color:var(--surface)] transition-colors"
            aria-label="Bitcoin info"
          >
            <div className="relative w-6 h-6">
              <div className="absolute inset-0 rounded-full bg-[#F7931A]/25 scale-[1.35]" />
              <svg className="relative w-6 h-6" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="32" fill="#F7931A"/>
                <path fill="#ffffff" transform="scale(0.65) translate(17, 17)" d="M46.11 27.44c.63-4.23-2.6-6.5-7.03-8.02l1.44-5.76-3.51-.88-1.4 5.61c-.92-.23-1.87-.45-2.81-.66l1.41-5.64-3.51-.88-1.44 5.75c-.76-.17-1.5-.34-2.23-.52l-4.84-1.2-.93 3.75s2.6.6 2.54.63c1.42.36 1.67 1.3 1.63 2.04l-1.64 6.56c.1.03.23.07.37.12l-.38-.09-2.3 9.2c-.17.43-.62 1.08-1.62.83.04.05-2.54-.63-2.54-.63l-1.74 4.02 4.57 1.14c.85.21 1.68.44 2.5.65l-1.45 5.84 3.5.88 1.44-5.77c.96.26 1.89.5 2.8.73l-1.43 5.74 3.51.88 1.45-5.83c5.99 1.13 10.49.68 12.38-4.74 1.53-4.36-.08-6.88-3.23-8.52 2.3-.53 4.03-2.04 4.49-5.15zm-8.03 11.26c-1.09 4.36-8.44 2-10.83 1.41l1.93-7.74c2.39.6 10.02 1.78 8.9 6.33zm1.08-11.33c-.99 3.97-7.1 1.95-9.09 1.46l1.75-7.02c1.99.5 8.36 1.42 7.34 5.56z"/>
              </svg>
            </div>
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-[color:var(--surface)] transition-colors"
            aria-label="Toggle theme"
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
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-[color:var(--surface)] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-[color:var(--background)] border-b border-[color:var(--border)]">
          <nav className="flex flex-col px-4 py-2 space-y-1">
            <Link 
              href="/library"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 text-[color:var(--foreground)] hover:text-[color:var(--accent)] transition-colors py-3 border-b border-[color:var(--border)]"
            >
              <LibraryBig className="w-5 h-5" />
              Library
            </Link>
            <Link 
              href="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 text-[color:var(--foreground)] hover:text-[color:var(--accent)] transition-colors py-3"
            >
              <Gauge className="w-5 h-5" />
              How It Works
            </Link>
          </nav>
        </div>
      )}

      <BitcoinInfoModal 
        isOpen={showBitcoinModal} 
        onClose={() => setShowBitcoinModal(false)} 
      />
    </header>
  )
}
