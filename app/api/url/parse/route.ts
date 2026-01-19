import { NextResponse } from 'next/server'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()
    
    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return NextResponse.json(
          { error: 'Only HTTP and HTTPS URLs are supported' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Fetch the URL with timeout and headers
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    let response: Response
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SpeedReadBot/1.0; +https://speedread.app)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow',
      })
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout - the URL took too long to respond' },
          { status: 408 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch URL - it may be inaccessible or blocked' },
        { status: 502 }
      )
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    // Check content type
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return NextResponse.json(
        { error: 'URL does not contain readable HTML content' },
        { status: 400 }
      )
    }

    // Get HTML content
    const html = await response.text()
    
    if (!html || html.trim().length === 0) {
      return NextResponse.json(
        { error: 'URL returned empty content' },
        { status: 400 }
      )
    }

    // Parse with Readability
    try {
      const dom = new JSDOM(html, { url: parsedUrl.href })
      const reader = new Readability(dom.window.document)
      const article = reader.parse()

      if (!article) {
        return NextResponse.json(
          { error: 'Could not extract readable content from this page' },
          { status: 400 }
        )
      }

      // Clean up the text content
      const textContent = (article.textContent || '')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()

      if (!textContent || textContent.length < 50) {
        return NextResponse.json(
          { error: 'Not enough readable text found on this page' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        title: article.title || parsedUrl.hostname,
        textContent,
        excerpt: article.excerpt || textContent.slice(0, 200) + '...',
        siteName: parsedUrl.hostname.replace('www.', ''),
        wordCount: textContent.split(/\s+/).length,
      })
    } catch (error) {
      console.error('Readability parsing error:', error)
      return NextResponse.json(
        { error: 'Failed to parse content from this page' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('URL parse error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
