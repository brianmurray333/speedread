'use client'

import { useState, useEffect } from 'react'
import { supabase, Document } from '@/lib/supabase'
import Header from '@/components/Header'
import SpeedReader from '@/components/SpeedReader'
import { parseTextToWords } from '@/lib/pdfParser'

export default function LibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [words, setWords] = useState<string[]>([])
  const [isReading, setIsReading] = useState(false)

  useEffect(() => {
    fetchDocuments()
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

      setDocuments(data || [])
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleReadDocument = (doc: Document) => {
    const docWords = parseTextToWords(doc.text_content)
    setWords(docWords)
    setSelectedDoc(doc)
    setIsReading(true)
  }

  if (isReading && words.length > 0) {
    return (
      <SpeedReader
        words={words}
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
      
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              Public <span className="text-[color:var(--accent)]">Library</span>
            </h1>
            <p className="text-[color:var(--muted)] text-lg max-w-2xl mx-auto">
              Browse PDFs shared by the community. Click any document to start speed reading.
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
                  className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-xl p-4 text-left hover:bg-[color:var(--surface-hover)] hover:border-[color:var(--accent)] transition-all flex items-center gap-4"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[color:var(--accent)]/10 flex items-center justify-center">
                    <svg 
                      className="w-5 h-5 text-[color:var(--accent)]" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate hover:text-[color:var(--accent)] transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-[color:var(--muted)] text-sm">
                      {doc.word_count.toLocaleString()} words
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
