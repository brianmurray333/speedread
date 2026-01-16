'use client'

import Header from '@/components/Header'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function ShortcutsPage() {
  const [copiedSimple, setCopiedSimple] = useState(false)
  const [copiedAdvanced, setCopiedAdvanced] = useState(false)
  const [siteUrl, setSiteUrl] = useState('https://speedread.fit')
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteUrl(window.location.origin)
    }
  }, [])

  const handleCopySimple = () => {
    navigator.clipboard.writeText(`${siteUrl}/?paste=true`)
    setCopiedSimple(true)
    setTimeout(() => setCopiedSimple(false), 2000)
  }

  const handleCopyAdvanced = () => {
    navigator.clipboard.writeText(`${siteUrl}/?text=`)
    setCopiedAdvanced(true)
    setTimeout(() => setCopiedAdvanced(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <Header />
      
      <main className="pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              iOS Shortcuts
            </h1>
            <p className="text-[color:var(--muted)] text-lg">
              Speed read any text from anywhere on your iPhone
            </p>
          </div>

          {/* How it works */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4">How It Works</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[color:var(--accent)] text-white flex items-center justify-center shrink-0 font-semibold">1</div>
                <div>
                  <p className="font-medium">Copy text in any app</p>
                  <p className="text-[color:var(--muted)] text-sm">Safari, Chrome, Notes, Mail, Twitter, etc.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[color:var(--accent)] text-white flex items-center justify-center shrink-0 font-semibold">2</div>
                <div>
                  <p className="font-medium">Tap the SpeedRead shortcut</p>
                  <p className="text-[color:var(--muted)] text-sm">From your home screen, widget, or Siri</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[color:var(--accent)] text-white flex items-center justify-center shrink-0 font-semibold">3</div>
                <div>
                  <p className="font-medium">Start reading instantly</p>
                  <p className="text-[color:var(--muted)] text-sm">SpeedRead reads your clipboard and begins immediately</p>
                </div>
              </div>
            </div>
          </section>

          {/* Simple Setup - Primary */}
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">Easy Setup</h2>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Recommended</span>
            </div>
            <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-6">
              <p className="text-[color:var(--muted)] mb-6">
                Create a simple one-action shortcut that reads from your clipboard:
              </p>
              <ol className="space-y-6 text-sm sm:text-base">
                <li>
                  <p className="font-medium mb-2">1. Open the Shortcuts app</p>
                  <p className="text-[color:var(--muted)]">Tap the + button to create a new shortcut</p>
                </li>
                <li>
                  <p className="font-medium mb-2">2. Search for &quot;Open URLs&quot; and add it</p>
                </li>
                <li>
                  <p className="font-medium mb-2">3. Enter this URL:</p>
                  <div className="bg-[color:var(--background)] rounded-lg p-4 mt-2">
                    <code className="text-sm break-all text-[color:var(--accent)]">
                      {siteUrl}/?paste=true
                    </code>
                  </div>
                  <button
                    onClick={handleCopySimple}
                    className="mt-3 text-sm text-[color:var(--accent)] hover:underline flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copiedSimple ? 'Copied!' : 'Copy URL'}
                  </button>
                </li>
                <li>
                  <p className="font-medium mb-2">4. Name it &quot;SpeedRead&quot;</p>
                  <p className="text-[color:var(--muted)]">Tap the dropdown at the top → Rename</p>
                </li>
                <li>
                  <p className="font-medium mb-2">5. Add to Home Screen (optional)</p>
                  <p className="text-[color:var(--muted)]">Tap the dropdown → Add to Home Screen for one-tap access</p>
                </li>
              </ol>
            </div>
          </section>

          {/* Tips */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Tips</h2>
            <div className="space-y-3">
              <div className="flex gap-3 items-start bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
                <span className="text-xl">📱</span>
                <div>
                  <p className="font-medium">Add to Home Screen</p>
                  <p className="text-[color:var(--muted)] text-sm">Tap shortcut dropdown → Add to Home Screen for one-tap access</p>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
                <span className="text-xl">🎤</span>
                <div>
                  <p className="font-medium">Use with Siri</p>
                  <p className="text-[color:var(--muted)] text-sm">&quot;Hey Siri, SpeedRead&quot; after copying text</p>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
                <span className="text-xl">🔲</span>
                <div>
                  <p className="font-medium">Add as Widget</p>
                  <p className="text-[color:var(--muted)] text-sm">Add the Shortcuts widget to your home screen for quick access</p>
                </div>
              </div>
            </div>
          </section>

          {/* Advanced Setup */}
          <section className="mb-12">
            <details className="group">
              <summary className="text-xl font-semibold mb-4 cursor-pointer list-none flex items-center gap-2">
                <svg className="w-5 h-5 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Advanced: Share Sheet Integration
              </summary>
              <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-6 mt-4">
                <p className="text-[color:var(--muted)] mb-6">
                  For power users: Create a shortcut that appears in the Share Sheet (no copying needed):
                </p>
                <ol className="space-y-4 text-sm">
                  <li>
                    <p className="font-medium">1. Add action: &quot;Receive input from Share Sheet&quot;</p>
                    <p className="text-[color:var(--muted)]">Set to accept Text</p>
                  </li>
                  <li>
                    <p className="font-medium">2. Add action: &quot;URL Encode&quot;</p>
                    <p className="text-[color:var(--muted)]">Encode the Shortcut Input</p>
                  </li>
                  <li>
                    <p className="font-medium">3. Add action: &quot;Text&quot;</p>
                    <p className="text-[color:var(--muted)]">Type the URL and insert the encoded variable:</p>
                    <code className="block mt-2 text-xs bg-[color:var(--background)] p-2 rounded break-all">
                      {siteUrl}/?text=[URL Encoded Text]
                    </code>
                  </li>
                  <li>
                    <p className="font-medium">4. Add action: &quot;Open URLs&quot;</p>
                    <p className="text-[color:var(--muted)]">Use the Text from step 3</p>
                  </li>
                  <li>
                    <p className="font-medium">5. Enable &quot;Show in Share Sheet&quot;</p>
                    <p className="text-[color:var(--muted)]">Tap info (i) button → toggle on</p>
                  </li>
                </ol>
                <button
                  onClick={handleCopyAdvanced}
                  className="mt-4 text-sm text-[color:var(--accent)] hover:underline flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copiedAdvanced ? 'Copied!' : 'Copy base URL'}
                </button>
              </div>
            </details>
          </section>

          {/* Back link */}
          <div className="text-center">
            <Link 
              href="/" 
              className="text-[color:var(--accent)] hover:underline font-medium"
            >
              ← Back to SpeedRead
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
