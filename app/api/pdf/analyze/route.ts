import { NextRequest, NextResponse } from 'next/server'

interface Section {
  name: string
  startPage: number
  endPage: number
  priority: number
  skip: boolean
}

interface AnalysisResult {
  title: string
  sections: Section[]
}

const SYSTEM_PROMPT = `You are a document structure analyzer. Given abbreviated text from each page of a PDF document, identify the major sections and rank them by reading importance.

Rules:
- Identify distinct sections based on headings, topic changes, and content shifts
- Assign priority 1 to the most important/substantive section (the main content), 2 to second most important, etc.
- Mark boilerplate sections as skip: true (legal disclaimers, disclosures, copyright notices, table of contents pages with just page numbers, cover pages that are just a title)
- For research reports: the main analysis/thesis is priority 1, supporting analysis is 2-3, company background/history is 3-4, management bios are 4-5
- For articles: the main body is priority 1, introduction is 2, conclusion is 3
- If a section spans multiple pages, include the full page range
- Every page must belong to exactly one section
- Provide a clean, descriptive title for the document

Return ONLY valid JSON in this exact format:
{
  "title": "Document Title",
  "sections": [
    { "name": "Section Name", "startPage": 1, "endPage": 5, "priority": 1, "skip": false },
    { "name": "Legal Disclaimers", "startPage": 40, "endPage": 45, "priority": 99, "skip": true }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const { pageTexts } = await req.json() as { pageTexts: Record<string, string> }

    const groqApiKey = process.env.GROQ_API_KEY
    if (!groqApiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Build abbreviated text for AI analysis (first 300 chars per page)
    const pageEntries = Object.entries(pageTexts).sort(
      ([a], [b]) => parseInt(a) - parseInt(b)
    )

    let userPrompt = `Document has ${pageEntries.length} pages. Here is abbreviated text from each page:\n\n`
    for (const [pageNum, text] of pageEntries) {
      const abbreviated = (text as string).substring(0, 300).replace(/\n/g, ' ')
      userPrompt += `--- Page ${pageNum} ---\n${abbreviated}\n\n`
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[PDF Analyze] Groq API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'AI analysis failed' },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 502 }
      )
    }

    const analysis: AnalysisResult = JSON.parse(content)

    // Validate the response structure
    if (!analysis.sections || !Array.isArray(analysis.sections)) {
      return NextResponse.json(
        { error: 'Invalid AI response structure' },
        { status: 502 }
      )
    }

    // Sort sections by page order (reading order follows the document)
    analysis.sections.sort((a, b) => a.startPage - b.startPage)

    console.log(`[PDF Analyze] "${analysis.title}" - ${analysis.sections.length} sections detected`)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('[PDF Analyze] Error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze document' },
      { status: 500 }
    )
  }
}
