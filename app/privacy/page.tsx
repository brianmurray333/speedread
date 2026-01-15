'use client'

import Link from 'next/link'
import { BookOpenText } from 'lucide-react'

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-[color:var(--muted)] mb-8">Last updated: January 15, 2026</p>

        <section className="space-y-8">
          {/* Introduction */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Introduction</h2>
            <p className="text-[color:var(--muted)]">
              SpeedRead (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, and safeguard your information when you 
              use our website at speedread.fit and our Chrome extension.
            </p>
          </div>

          {/* Information We Collect */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
            <div className="space-y-4 text-[color:var(--muted)]">
              <div>
                <h3 className="font-medium text-[color:var(--foreground)] mb-2">Information You Provide</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Documents you upload for speed reading</li>
                  <li>Content you choose to publish to our library</li>
                  <li>Contact information when you reach out to support</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-[color:var(--foreground)] mb-2">Automatically Collected Information</h3>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Reading preferences (words per minute, theme settings)</li>
                  <li>Reading progress within documents</li>
                  <li>Basic usage analytics to improve the service</li>
                </ul>
              </div>
            </div>
          </div>

          {/* How We Use Your Information */}
          <div>
            <h2 className="text-xl font-semibold mb-3">How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-[color:var(--muted)] ml-2">
              <li>To provide and maintain our speed reading service</li>
              <li>To save your reading preferences and progress</li>
              <li>To display documents in our public library (only if you choose to publish)</li>
              <li>To process payments for premium content via Lightning Network</li>
              <li>To respond to your inquiries and support requests</li>
              <li>To improve and optimize our services</li>
            </ul>
          </div>

          {/* Data Storage */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Data Storage & Security</h2>
            <div className="space-y-3 text-[color:var(--muted)]">
              <p>
                <strong className="text-[color:var(--foreground)]">Local Storage:</strong> Your reading 
                preferences (WPM, theme) are stored locally in your browser and synced via Chrome sync 
                if you use our extension.
              </p>
              <p>
                <strong className="text-[color:var(--foreground)]">Cloud Storage:</strong> Documents you 
                upload and publish are stored securely on our servers. We use industry-standard encryption 
                and security measures to protect your data.
              </p>
              <p>
                <strong className="text-[color:var(--foreground)]">Payments:</strong> We use the Lightning 
                Network for payments. We do not store your payment credentials or wallet information.
              </p>
            </div>
          </div>

          {/* Chrome Extension */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Chrome Extension</h2>
            <div className="space-y-3 text-[color:var(--muted)]">
              <p>
                Our Chrome extension only activates when you explicitly select text and choose to speed read it. 
                The extension:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Does not track your browsing history</li>
                <li>Does not collect data from pages you visit</li>
                <li>Only processes text you explicitly select</li>
                <li>Stores preferences locally using Chrome&apos;s storage API</li>
              </ul>
            </div>
          </div>

          {/* Third-Party Services */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Third-Party Services</h2>
            <p className="text-[color:var(--muted)]">
              We may use third-party services for hosting, analytics, and payment processing. 
              These services have their own privacy policies governing the use of your information. 
              We only share the minimum data necessary for these services to function.
            </p>
          </div>

          {/* Your Rights */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
            <p className="text-[color:var(--muted)] mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-[color:var(--muted)] ml-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent for data processing</li>
              <li>Request removal of published documents from our library</li>
            </ul>
          </div>

          {/* Children's Privacy */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Children&apos;s Privacy</h2>
            <p className="text-[color:var(--muted)]">
              Our service is not directed to children under 13. We do not knowingly collect 
              personal information from children under 13. If you believe we have collected 
              information from a child under 13, please contact us immediately.
            </p>
          </div>

          {/* Changes to This Policy */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Changes to This Policy</h2>
            <p className="text-[color:var(--muted)]">
              We may update this Privacy Policy from time to time. We will notify you of any 
              changes by posting the new Privacy Policy on this page and updating the 
              &quot;Last updated&quot; date.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
            <p className="text-[color:var(--muted)]">
              If you have any questions about this Privacy Policy or our data practices, 
              please contact us at{' '}
              <a 
                href="mailto:support@speedread.fit" 
                className="text-[color:var(--accent)] hover:underline"
              >
                support@speedread.fit
              </a>
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-[color:var(--border)] text-center">
          <Link 
            href="/"
            className="text-[color:var(--accent)] hover:underline"
          >
            ← Back to SpeedRead
          </Link>
        </div>
      </main>
    </div>
  )
}
