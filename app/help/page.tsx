'use client'

import Link from 'next/link'
import { BookOpenText } from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      {/* Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between border-b border-[color:var(--border)]">
        <Link href="/" className="flex items-center gap-2">
          <BookOpenText className="w-6 h-6 text-[color:var(--accent)]" />
          <span className="text-xl font-bold">
            <span className="text-[color:var(--foreground)]">speed</span>
            <span className="text-[color:var(--accent)]">read</span>
          </span>
        </Link>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Help & Support</h1>

        <section className="space-y-8">
          {/* Getting Started */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Getting Started</h2>
            <div className="space-y-3 text-[color:var(--muted)]">
              <p>
                SpeedRead uses RSVP (Rapid Serial Visual Presentation) to display one word at a time, 
                helping you read faster while maintaining comprehension.
              </p>
              <p>
                <strong className="text-[color:var(--foreground)]">Using the Chrome Extension:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Select any text on a webpage</li>
                <li>Right-click and choose "SpeedRead Selection"</li>
                <li>Or press <kbd className="px-2 py-0.5 bg-[color:var(--surface)] rounded text-sm">Cmd+Shift+S</kbd> (Mac) / <kbd className="px-2 py-0.5 bg-[color:var(--surface)] rounded text-sm">Ctrl+Shift+S</kbd> (Windows)</li>
              </ol>
            </div>
          </div>

          {/* Keyboard Controls */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Keyboard Controls</h2>
            <div className="bg-[color:var(--surface)] rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[color:var(--muted)]">Play / Pause</span>
                <kbd className="px-2 py-0.5 bg-[color:var(--background)] rounded">Space</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--muted)]">Previous / Next word</span>
                <span><kbd className="px-2 py-0.5 bg-[color:var(--background)] rounded">←</kbd> <kbd className="px-2 py-0.5 bg-[color:var(--background)] rounded">→</kbd></span>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--muted)]">Adjust speed</span>
                <span><kbd className="px-2 py-0.5 bg-[color:var(--background)] rounded">↑</kbd> <kbd className="px-2 py-0.5 bg-[color:var(--background)] rounded">↓</kbd></span>
              </div>
              <div className="flex justify-between">
                <span className="text-[color:var(--muted)]">Exit reader</span>
                <kbd className="px-2 py-0.5 bg-[color:var(--background)] rounded">Esc</kbd>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div>
            <h2 className="text-xl font-semibold mb-3">FAQ</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">What is the orange highlighted letter?</h3>
                <p className="text-[color:var(--muted)] text-sm">
                  That's the Optimal Recognition Point (ORP) — the letter your eye naturally focuses on 
                  when reading a word. By centering this point, your eye doesn't need to move, allowing 
                  for faster reading.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-1">What speed should I use?</h3>
                <p className="text-[color:var(--muted)] text-sm">
                  Start around 250-300 WPM and gradually increase. Most people can comfortably read 
                  at 400-500 WPM with practice. The average reading speed is about 200-250 WPM.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-1">Are my preferences saved?</h3>
                <p className="text-[color:var(--muted)] text-sm">
                  Yes, your WPM and theme preferences are automatically saved and synced across 
                  your browsers via Chrome sync.
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Contact</h2>
            <p className="text-[color:var(--muted)]">
              For questions or feedback, email{' '}
              <a 
                href="mailto:support@speedread.fit" 
                className="text-[color:var(--accent)] hover:underline"
              >
                support@speedread.fit
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
