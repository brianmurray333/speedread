'use client'

import Link from 'next/link'
import { Book } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export default function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[color:var(--background)]/80 backdrop-blur-md border-b border-[color:var(--border)]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Book className="w-7 h-7 text-[color:var(--accent)]" />
          <span className="text-2xl font-bold">
            <span className="text-[color:var(--foreground)]">speed</span>
            <span className="text-[color:var(--accent)]">read</span>
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link 
            href="/library" 
            className="text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors"
          >
            Library
          </Link>
          <Link 
            href="/#how-it-works" 
            className="text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors"
          >
            How It Works
          </Link>
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
      </div>
    </header>
  )
}
