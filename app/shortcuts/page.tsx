'use client'

import Header from '@/components/Header'
import Link from 'next/link'
import { useState } from 'react'

export default function ShortcutsPage() {
  const [copied, setCopied] = useState(false)
  
  const siteUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://speedread.app'

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(`${siteUrl}/?text=`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
                <div className="w-8 h-8 rounded-full bg-[color:var(--accent)] text-white flex items-center justify-center flex-shrink-0 font-semibold">1</div>
                <div>
                  <p className="font-medium">Select text in any app</p>
                  <p className="text-[color:var(--muted)] text-sm">Safari, Chrome, Notes, Mail, Twitter, etc.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[color:var(--accent)] text-white flex items-center justify-center flex-shrink-0 font-semibold">2</div>
                <div>
                  <p className="font-medium">Tap Share → SpeedRead</p>
                  <p className="text-[color:var(--muted)] text-sm">The shortcut appears in your Share Sheet</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-[color:var(--accent)] text-white flex items-center justify-center flex-shrink-0 font-semibold">3</div>
                <div>
                  <p className="font-medium">Start reading instantly</p>
                  <p className="text-[color:var(--muted)] text-sm">SpeedRead opens and begins immediately</p>
                </div>
              </div>
            </div>
          </section>

          {/* Setup Instructions */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
            <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-6">
              <ol className="space-y-6 text-sm sm:text-base">
                <li>
                  <p className="font-medium mb-2">1. Open the Shortcuts app on your iPhone</p>
                  <p className="text-[color:var(--muted)]">It comes pre-installed on iOS. If you deleted it, re-download from the App Store.</p>
                </li>
                <li>
                  <p className="font-medium mb-2">2. Tap the + button to create a new shortcut</p>
                </li>
                <li>
                  <p className="font-medium mb-2">3. Add these actions in order:</p>
                  <div className="bg-[color:var(--background)] rounded-lg p-4 mt-2 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Action 1</span>
                      <span><strong>Receive</strong> Text from Share Sheet</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Action 2</span>
                      <span><strong>URL Encode</strong> the Shortcut Input</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Action 3</span>
                      <span><strong>Open URL:</strong></span>
                    </div>
                    <div className="bg-[color:var(--surface)] rounded p-3 font-mono text-xs break-all">
                      {siteUrl}/?text=<span className="text-[color:var(--accent)]">[URL Encoded Text]</span>
                    </div>
                  </div>
                </li>
                <li>
                  <p className="font-medium mb-2">4. Name it &quot;SpeedRead&quot;</p>
                  <p className="text-[color:var(--muted)]">Tap the name at the top to rename it.</p>
                </li>
                <li>
                  <p className="font-medium mb-2">5. Enable &quot;Show in Share Sheet&quot;</p>
                  <p className="text-[color:var(--muted)]">Tap the info (i) button at the bottom → toggle on &quot;Show in Share Sheet&quot;</p>
                </li>
              </ol>
            </div>
          </section>

          {/* URL Format */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4">URL Format</h2>
            <p className="text-[color:var(--muted)] mb-4">
              SpeedRead accepts text via the <code className="bg-[color:var(--surface)] px-2 py-1 rounded">text</code> URL parameter:
            </p>
            <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
              <code className="text-sm break-all">
                {siteUrl}/?text=<span className="text-[color:var(--accent)]">Your%20URL%20encoded%20text%20here</span>
              </code>
            </div>
            <button
              onClick={handleCopyUrl}
              className="mt-4 text-sm text-[color:var(--accent)] hover:underline flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? 'Copied!' : 'Copy base URL'}
            </button>
          </section>

          {/* Tips */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Tips</h2>
            <div className="space-y-3">
              <div className="flex gap-3 items-start bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
                <span className="text-xl">💡</span>
                <div>
                  <p className="font-medium">Add to Home Screen</p>
                  <p className="text-[color:var(--muted)] text-sm">Long-press the shortcut → Add to Home Screen for one-tap access</p>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
                <span className="text-xl">🎤</span>
                <div>
                  <p className="font-medium">Use with Siri</p>
                  <p className="text-[color:var(--muted)] text-sm">&quot;Hey Siri, SpeedRead&quot; - works after copying text</p>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4">
                <span className="text-xl">⌚</span>
                <div>
                  <p className="font-medium">Works with Apple Watch</p>
                  <p className="text-[color:var(--muted)] text-sm">Trigger from your watch when paired with your iPhone</p>
                </div>
              </div>
            </div>
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
