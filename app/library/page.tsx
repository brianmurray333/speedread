'use client'

import { useState, useEffect } from 'react'
import { supabase, Document } from '@/lib/supabase'
import Header from '@/components/Header'
import SpeedReader from '@/components/SpeedReader'
import PaymentModal from '@/components/PaymentModal'
import { parseTextToWords } from '@/lib/pdfParser'

// Store paid document macaroons in memory (would use localStorage in production)
const paidDocuments = new Map<string, string>()

export default function LibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [words, setWords] = useState<string[]>([])
  const [isReading, setIsReading] = useState(false)
  
  // Payment state
  const [paymentDoc, setPaymentDoc] = useState<Document | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    fetchDocuments()
    // Load paid documents from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('speedread_paid_docs')
      if (stored) {
        const parsed = JSON.parse(stored)
        Object.entries(parsed).forEach(([id, macaroon]) => {
          paidDocuments.set(id, macaroon as string)
        })
      }
    }
  }, [])

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching documents:', error)
        return
      }

      // Sort Bitcoin whitepaper to the top
      const sorted = (data || []).sort((a, b) => {
        if (a.title.includes('Bitcoin')) return -1
        if (b.title.includes('Bitcoin')) return 1
        return 0
      })

      setDocuments(sorted)
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleReadDocument = async (doc: Document) => {
    // Check if document requires payment
    if (doc.price_sats && doc.price_sats > 0) {
      // Check if already paid
      if (paidDocuments.has(doc.id)) {
        // Fetch content with macaroon
        await fetchPaidContent(doc, paidDocuments.get(doc.id)!)
      } else {
        // Show payment modal
        setPaymentDoc(doc)
        setShowPaymentModal(true)
      }
    } else {
      // Free document - read directly
      const docWords = parseTextToWords(doc.text_content)
      setWords(docWords)
      setSelectedDoc(doc)
      setIsReading(true)
    }
  }

  const fetchPaidContent = async (doc: Document, macaroon: string) => {
    try {
      const response = await fetch(
        `/api/documents/${doc.id}/content?macaroon=${encodeURIComponent(macaroon)}`
      )
      
      if (response.ok) {
        const data = await response.json()
        const docWords = parseTextToWords(data.textContent)
        setWords(docWords)
        setSelectedDoc(doc)
        setIsReading(true)
      } else if (response.status === 402) {
        // Payment expired or invalid, need to pay again
        paidDocuments.delete(doc.id)
        savePaidDocuments()
        setPaymentDoc(doc)
        setShowPaymentModal(true)
      } else {
        console.error('Failed to fetch paid content')
      }
    } catch (e) {
      console.error('Error fetching paid content:', e)
    }
  }

  const savePaidDocuments = () => {
    if (typeof window !== 'undefined') {
      const obj: Record<string, string> = {}
      paidDocuments.forEach((macaroon, id) => {
        obj[id] = macaroon
      })
      localStorage.setItem('speedread_paid_docs', JSON.stringify(obj))
    }
  }

  const handlePaymentComplete = async (macaroon: string) => {
    if (!paymentDoc) return

    // Store the macaroon
    paidDocuments.set(paymentDoc.id, macaroon)
    savePaidDocuments()

    // Close modal and fetch content
    setShowPaymentModal(false)
    await fetchPaidContent(paymentDoc, macaroon)
    setPaymentDoc(null)
  }

  const isPaid = (doc: Document) => paidDocuments.has(doc.id)

  if (isReading && words.length > 0) {
    return (
      <SpeedReader
        words={words}
        autoStart={true}
        onComplete={() => {}}
        onExit={() => {
          setIsReading(false)
          setSelectedDoc(null)
          setWords([])
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <Header />
      
      <main className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">
              Public <span className="text-[color:var(--accent)]">Library</span>
            </h1>
            <p className="text-[color:var(--muted)] text-base sm:text-lg max-w-2xl mx-auto px-2">
              Browse PDFs shared by the community. Tap any document to start speed reading.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-12 h-12 border-4 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16">
              <svg 
                className="w-24 h-24 mx-auto mb-6 text-[color:var(--muted)]" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <h2 className="text-2xl font-semibold mb-2">No documents yet</h2>
              <p className="text-[color:var(--muted)]">
                Be the first to share a PDF with the community!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleReadDocument(doc)}
                  className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-3 sm:p-4 text-left hover:bg-[color:var(--surface-hover)] hover:border-[color:var(--accent)] transition-all flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 relative"
                >
                  {/* Paid badge */}
                  {doc.price_sats > 0 && (
                    <div className="absolute top-2 right-2 sm:top-2 sm:right-2">
                      {isPaid(doc) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#F7931A]/10 text-[#F7931A] border border-[#F7931A]/20">
                          <svg className="w-3 h-3" viewBox="0 0 64 64" fill="none">
                            <circle cx="32" cy="32" r="32" fill="currentColor"/>
                            <path fill="#ffffff" transform="scale(0.7) translate(14, 14)" d="M46.11 27.44c.63-4.23-2.6-6.5-7.03-8.02l1.44-5.76-3.51-.88-1.4 5.61c-.92-.23-1.87-.45-2.81-.66l1.41-5.64-3.51-.88-1.44 5.75c-.76-.17-1.5-.34-2.23-.52l-4.84-1.2-.93 3.75s2.6.6 2.54.63c1.42.36 1.67 1.3 1.63 2.04l-1.64 6.56c.1.03.23.07.37.12l-.38-.09-2.3 9.2c-.17.43-.62 1.08-1.62.83.04.05-2.54-.63-2.54-.63l-1.74 4.02 4.57 1.14c.85.21 1.68.44 2.5.65l-1.45 5.84 3.5.88 1.44-5.77c.96.26 1.89.5 2.8.73l-1.43 5.74 3.51.88 1.45-5.83c5.99 1.13 10.49.68 12.38-4.74 1.53-4.36-.08-6.88-3.23-8.52 2.3-.53 4.03-2.04 4.49-5.15zm-8.03 11.26c-1.09 4.36-8.44 2-10.83 1.41l1.93-7.74c2.39.6 10.02 1.78 8.9 6.33zm1.08-11.33c-.99 3.97-7.1 1.95-9.09 1.46l1.75-7.02c1.99.5 8.36 1.42 7.34 5.56z"/>
                          </svg>
                          {doc.price_sats} sats
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 sm:gap-4 w-full">
                    <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-[color:var(--accent)]/10 flex items-center justify-center">
                      <svg 
                        className="w-6 h-6 sm:w-7 sm:h-7 text-[color:var(--accent)]" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 
                        className="font-semibold line-clamp-2 hover:text-[color:var(--accent)] transition-colors text-sm sm:text-base leading-tight"
                        title={doc.title}
                      >
                        {doc.title}
                      </h3>
                      <p className="text-[color:var(--muted)] text-xs sm:text-sm mt-1">
                        {doc.word_count.toLocaleString()} words
                        {doc.creator_name && (
                          <span className="ml-1 sm:ml-2">• {doc.creator_name}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false)
          setPaymentDoc(null)
        }}
        onPaymentComplete={handlePaymentComplete}
        documentId={paymentDoc?.id || ''}
        documentTitle={paymentDoc?.title || ''}
      />
    </div>
  )
}
