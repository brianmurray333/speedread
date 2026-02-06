import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import LibraryClient from './LibraryClient'
import { matchesSlug } from '@/lib/slug'

// Force dynamic rendering to ensure metadata is generated fresh for each request
export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Build default metadata
function getDefaultMetadata(): Metadata {
  return {
    title: 'Public Library - SpeedRead',
    description: 'Browse and speed read documents from the SpeedRead public library. Free and paid content available.',
    openGraph: {
      title: 'Public Library - SpeedRead',
      description: 'Browse and speed read documents from the SpeedRead public library.',
      type: 'website',
      siteName: 'SpeedRead',
    },
    twitter: {
      card: 'summary',
      title: 'Public Library - SpeedRead',
      description: 'Browse and speed read documents from the SpeedRead public library.',
    },
  }
}

// Generate dynamic metadata based on the shared document
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  try {
    const params = await searchParams
    const docSlug = params.doc as string | undefined
    const readSlug = params.read as string | undefined
    const slug = docSlug || readSlug

    // If no document slug, return default metadata
    if (!slug) {
      return getDefaultMetadata()
    }

    // Check if env vars are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase env vars for metadata generation')
      return getDefaultMetadata()
    }

    // Fetch all public documents to find by slug
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, title, word_count, price_sats, creator_name')
      .eq('is_public', true)

    if (error) {
      console.error('Supabase error in generateMetadata:', error)
      return getDefaultMetadata()
    }

    if (!documents || documents.length === 0) {
      console.error('No documents found in generateMetadata')
      return getDefaultMetadata()
    }

    // Find the document by matching slug
    const doc = documents.find(d => matchesSlug(d.title, slug))

    if (!doc) {
      console.error('Document not found for slug:', slug)
      return getDefaultMetadata()
    }

    // Calculate reading time range (300 WPM slow, 500 WPM fast)
    const formatReadingTime = (wordCount: number): string => {
      const fastMinutes = wordCount / 500 // faster reader = less time
      const slowMinutes = wordCount / 300 // slower reader = more time
      
      const formatTime = (minutes: number): string => {
        if (minutes >= 1) {
          return `${Math.round(minutes)} min`
      } else {
          return `${Math.round(minutes * 60)} sec`
        }
      }
      
      const fastStr = formatTime(fastMinutes)
      const slowStr = formatTime(slowMinutes)
      
      // If same formatted string, show just one
      if (fastStr === slowStr) {
        return fastStr
      }
      
      return `${fastStr} to ${slowStr}`
    }

    // Build description with word count, price, and reading time
    let description = `${doc.word_count.toLocaleString()} words`
    if (doc.creator_name) {
      description += ` by ${doc.creator_name}`
    }
    if (doc.price_sats && doc.price_sats > 0) {
      description += ` • ${doc.price_sats} sats`
    } else {
      description += ' • Free to read'
    }
    description += ` • ${formatReadingTime(doc.word_count)}`

    const title = `${doc.title} - SpeedRead`

    return {
      title,
      description,
      openGraph: {
        title: doc.title,
        description,
        type: 'article',
        siteName: 'SpeedRead',
      },
      twitter: {
        card: 'summary',
        title: doc.title,
        description,
      },
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return getDefaultMetadata()
  }
}

export default function LibraryPage() {
  return <LibraryClient />
}
