# SpeedRead URL Parsing Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
         ┌──────────┐    ┌──────────┐   ┌──────────┐
         │  Paste   │    │   URL    │   │   PDF    │
         │  Button  │    │  Button  │   │  Upload  │
         └──────────┘    └──────────┘   └──────────┘
                │               │               │
                │               │               │
┌───────────────┼───────────────┼───────────────┼──────────────────┐
│               │               │               │                  │
│   ┌───────────▼──────────┐    │               │                  │
│   │ Read Clipboard       │    │               │                  │
│   │ via Navigator API    │    │               │                  │
│   └───────────┬──────────┘    │               │                  │
│               │               │               │                  │
│   ┌───────────▼──────────┐    │               │                  │
│   │ Smart Detection:     │    │               │                  │
│   │ - Is it a URL?       │    │               │                  │
│   │ - Is it text?        │    │               │                  │
│   └───────────┬──────────┘    │               │                  │
│               │               │               │                  │
│        ┌──────┼──────┐        │               │                  │
│        │      │      │        │               │                  │
│   ┌────▼───┐ ┌▼─────▼────────▼──────────┐    │                  │
│   │  Text  │ │    URL Detected          │    │                  │
│   │Processing│ └────────┬──────────────┘    │                  │
│   └────┬───┘          │                     │                  │
│        │              │                     │                  │
│        │   ┌──────────▼──────────┐          │                  │
│        │   │ POST /api/url/parse │          │                  │
│        │   └──────────┬──────────┘          │                  │
│        │              │                     │                  │
│        │   ┌──────────▼──────────┐          │                  │
│        │   │ Server-side Fetch   │          │                  │
│        │   │ - 10s timeout       │          │                  │
│        │   │ - User-Agent header │          │                  │
│        │   └──────────┬──────────┘          │                  │
│        │              │                     │                  │
│        │   ┌──────────▼──────────┐          │                  │
│        │   │ JSDOM Parse HTML    │          │                  │
│        │   └──────────┬──────────┘          │                  │
│        │              │                     │                  │
│        │   ┌──────────▼──────────┐          │                  │
│        │   │ Readability Extract │          │                  │
│        │   │ (Mozilla Algorithm) │          │                  │
│        │   └──────────┬──────────┘          │                  │
│        │              │                     │                  │
│        │   ┌──────────▼──────────┐   ┌──────▼──────┐          │
│        │   │ Return JSON:        │   │ Extract PDF │          │
│        │   │ - title             │   │ Content     │          │
│        │   │ - textContent       │   └──────┬──────┘          │
│        │   │ - wordCount         │          │                  │
│        │   │ - siteName          │          │                  │
│        │   └──────────┬──────────┘          │                  │
│        │              │                     │                  │
│        └──────┬───────┴─────────────────────┘                  │
│               │                                                │
│   ┌───────────▼──────────┐                                    │
│   │ parseTextToContent   │                                    │
│   │ - Split into words   │                                    │
│   │ - Filter noise       │                                    │
│   │ - Create ContentItems│                                    │
│   └───────────┬──────────┘                                    │
│               │                                                │
└───────────────┼────────────────────────────────────────────────┘
                │
                ▼
     ┌────────────────────┐
     │  SpeedReader       │
     │  Component         │
     │  - RSVP Display    │
     │  - ORP Highlighting│
     │  - Controls        │
     └────────────────────┘
```

## Component Structure

```
app/
├── api/
│   └── url/
│       └── parse/
│           └── route.ts ─────────── NEW: URL parsing endpoint
│
├── page.tsx ─────────────────────── Orchestrates upload flow
│
components/
├── PDFUploader.tsx ──────────────── REDESIGNED: 3-option UI
│   ├── Paste Mode
│   │   ├── Smart clipboard preview
│   │   ├── Permission handling
│   │   └── Auto URL detection
│   │
│   ├── URL Mode
│   │   ├── Input form
│   │   ├── Validation
│   │   └── Submit handler
│   │
│   └── PDF Mode
│       └── File upload (existing)
│
├── SpeedReader.tsx ──────────────── Unchanged (receives words)
└── Toast.tsx ────────────────────── Error/success notifications

lib/
└── pdfParser.ts ─────────────────── Text parsing utilities (existing)
```

## State Management Flow

```typescript
// Initial State
{
  mode: 'initial',           // 'initial' | 'url'
  isLoading: false,
  clipboardPreview: null,    // Smart preview text
  urlInput: '',
  extractionProgress: null
}

// User clicks "Paste" button
↓
navigator.clipboard.readText()
↓
isUrl(text) ? handleUrlSubmit(text) : handlePastedText(text)

// User clicks "URL" button
↓
mode = 'url'
↓
User enters URL
↓
handleUrlSubmit(url)

// URL Submission Flow
↓
POST /api/url/parse { url }
↓
{ title, textContent, wordCount, siteName }
↓
parseTextToContentItems(textContent)
↓
onContentExtracted(contentItems, title, textContent)
↓
Parent component starts SpeedReader
```

## API Contract

### POST /api/url/parse

**Request:**
```json
{
  "url": "https://example.com/article"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "title": "Article Title",
  "textContent": "Full article text...",
  "excerpt": "First 200 chars...",
  "siteName": "example.com",
  "wordCount": 1234
}
```

**Error Response (400/408/500):**
```json
{
  "error": "Descriptive error message"
}
```

## Error Handling Matrix

| Error Type | HTTP Code | User Message |
|------------|-----------|--------------|
| Invalid URL format | 400 | "Invalid URL format" |
| Non-HTTP(S) protocol | 400 | "Only HTTP and HTTPS URLs are supported" |
| Fetch timeout (>10s) | 408 | "Request timeout - the URL took too long to respond" |
| Network error | 502 | "Failed to fetch URL - it may be inaccessible or blocked" |
| Non-HTML content | 400 | "URL does not contain readable HTML content" |
| Empty response | 400 | "URL returned empty content" |
| Readability failed | 400 | "Could not extract readable content from this page" |
| Too little text (<50 chars) | 400 | "Not enough readable text found on this page" |
| Server error | 500 | "An unexpected error occurred" |

## Browser Compatibility

### Clipboard API Support
| Browser | Read Support | Permission |
|---------|-------------|------------|
| Chrome 76+ | ✅ Yes | Prompt/Persistent |
| Firefox 87+ | ✅ Yes | Prompt |
| Safari 13.1+ | ✅ Yes | Prompt per-use |
| Edge 79+ | ✅ Yes | Prompt/Persistent |

### Fallback Behavior
- No clipboard API → Hide paste button
- Permission denied → Show error message
- Still works via: URL button, Cmd/Ctrl+V paste event

## Performance Characteristics

| Operation | Avg Time | Max Time |
|-----------|----------|----------|
| Clipboard read | <50ms | 200ms |
| URL validation | <1ms | 5ms |
| URL fetch | 500ms-3s | 10s (timeout) |
| HTML parse | 100ms-500ms | 2s |
| Readability extract | 50ms-200ms | 1s |
| Text parsing | 50ms-300ms | 1s |
| **Total (URL to read)** | **1-4s** | **10s** |

## Security Considerations

### Server-Side Protection
- ✅ URL validation (protocol check)
- ✅ Timeout protection (10 seconds)
- ✅ Content-type validation (HTML only)
- ✅ No URL storage/logging
- ✅ User-Agent identification

### Client-Side Protection
- ✅ Clipboard permission required
- ✅ No automatic clipboard reading
- ✅ Input sanitization
- ✅ HTTPS enforcement (for production)

### Not Protected Against
- ⚠️ Rate limiting (add if needed)
- ⚠️ Malicious HTML content (JSDOM is safe but resource-heavy)
- ⚠️ DDoS via many URL requests (add rate limiting)

## Monitoring & Debugging

### Useful Console Logs
```javascript
// In PDFUploader.tsx
console.log('Clipboard preview:', clipboardPreview)
console.log('URL detected:', isUrl(text))
console.log('Extraction progress:', extractionProgress)

// In /api/url/parse
console.log('Parsing URL:', url)
console.error('Readability parsing error:', error)
```

### Performance Monitoring
```javascript
// Add to API route for monitoring
const startTime = Date.now()
// ... parsing logic ...
const duration = Date.now() - startTime
console.log(`URL parsed in ${duration}ms`)
```

## Testing Endpoints

### Quick Test Commands
```bash
# Test API directly
curl -X POST http://localhost:3000/api/url/parse \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Test with various sites
curl -X POST http://localhost:3000/api/url/parse \
  -H "Content-Type: application/json" \
  -d '{"url": "https://en.wikipedia.org/wiki/Speed_reading"}'
```

### Browser Console Tests
```javascript
// Test clipboard preview
navigator.clipboard.writeText('https://example.com')
// Observe paste button update

// Test URL parsing
fetch('/api/url/parse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com' })
}).then(r => r.json()).then(console.log)
```
