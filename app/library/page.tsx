import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import LibraryClient, { createSlug, matchesSlug } from './LibraryClient'

// Create a server-side Supabase client for metadata generation
function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseAnonKey)
}

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Generate dynamic metadata based on the shared document
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const docSlug = params.doc as string | undefined
  const readSlug = params.read as string | undefined
  const slug = docSlug || readSlug

  // Default metadata for the library page
  const defaultMetadata: Metadata = {
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

  // If no document slug, return default metadata
  if (!slug) {
    return defaultMetadata
  }

  try {
    // Fetch all public documents to find by slug
    const supabase = getServerSupabase()
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, title, word_count, price_sats, creator_name')
      .eq('is_public', true)

    if (error || !documents) {
      return defaultMetadata
    }

    // Find the document by matching slug
    const doc = documents.find(d => matchesSlug(d.title, slug))

    if (!doc) {
      return defaultMetadata
    }

    // Build description with word count and price
    let description = `${doc.word_count.toLocaleString()} words`
    if (doc.creator_name) {
      description += ` by ${doc.creator_name}`
    }
    if (doc.price_sats && doc.price_sats > 0) {
      description += ` • ${doc.price_sats} sats`
    } else {
      description += ' • Free to read'
    }
    description += ' • Speed read on SpeedRead'

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
        card: 'summary_large_image',
        title: doc.title,
        description,
      },
    }
  } catch (e) {
    console.error('Error generating metadata:', e)
    return defaultMetadata
  }
}

export default function LibraryPage() {
  return <LibraryClient />
}
