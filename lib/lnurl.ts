/**
 * LNURL-pay Client
 * 
 * Fetches Lightning invoices from Lightning Addresses (e.g., user@getalby.com)
 * This allows users to receive payments directly to their own wallets.
 */

interface LNURLPayResponse {
  callback: string
  maxSendable: number // millisats
  minSendable: number // millisats
  metadata: string
  tag: 'payRequest'
  commentAllowed?: number
}

interface LNURLInvoiceResponse {
  pr: string // payment request (bolt11 invoice)
  routes: unknown[]
  verify?: string // URL to check payment status
  successAction?: {
    tag: string
    message?: string
    url?: string
  }
}

/**
 * Parse a Lightning Address into a LNURL-pay endpoint
 * user@domain.com -> https://domain.com/.well-known/lnurlp/user
 */
export function lightningAddressToLNURL(address: string): string {
  const [user, domain] = address.split('@')
  if (!user || !domain) {
    throw new Error('Invalid Lightning Address format')
  }
  return `https://${domain}/.well-known/lnurlp/${user}`
}

/**
 * Validate a Lightning Address format
 */
export function isValidLightningAddress(address: string): boolean {
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return regex.test(address)
}

/**
 * Check if a domain is private/internal (SSRF protection)
 */
function isBlockedDomain(domain: string): boolean {
  const lowerDomain = domain.toLowerCase()
  
  // Block localhost and common internal hostnames
  const blockedHosts = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '169.254.169.254', // AWS metadata
    'metadata.google.internal', // GCP metadata
    '::1',
  ]
  
  if (blockedHosts.some(h => lowerDomain.includes(h))) {
    return true
  }
  
  // Block private IP ranges
  const privateIPPatterns = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^fc00:/i,
    /^fe80:/i,
  ]
  
  if (privateIPPatterns.some(p => p.test(lowerDomain))) {
    return true
  }
  
  return false
}

/**
 * Fetch LNURL-pay metadata from a Lightning Address
 */
export async function fetchLNURLPayInfo(lightningAddress: string): Promise<LNURLPayResponse> {
  // Extract domain for SSRF check
  const [, domain] = lightningAddress.split('@')
  if (domain && isBlockedDomain(domain)) {
    throw new Error('Invalid Lightning Address: blocked domain')
  }
  
  const lnurlEndpoint = lightningAddressToLNURL(lightningAddress)
  
  const response = await fetch(lnurlEndpoint, {
    headers: {
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch LNURL-pay info: ${response.status}`)
  }

  const data = await response.json()
  
  if (data.tag !== 'payRequest') {
    throw new Error('Invalid LNURL-pay response')
  }

  return data as LNURLPayResponse
}

/**
 * Request an invoice from a Lightning Address for a specific amount
 */
export async function requestInvoiceFromLightningAddress(
  lightningAddress: string,
  amountSats: number,
  comment?: string
): Promise<{ paymentRequest: string; paymentHash: string; verifyUrl?: string }> {
  // First, fetch the LNURL-pay metadata
  const payInfo = await fetchLNURLPayInfo(lightningAddress)

  // Convert sats to millisats
  const amountMsats = amountSats * 1000

  // Validate amount is within bounds
  // Note: maxSendable of 0 means the wallet can't receive yet (no inbound liquidity)
  if (payInfo.maxSendable === 0) {
    throw new Error(
      `Lightning Address cannot receive payments yet (no inbound liquidity). The wallet owner needs to set up channels.`
    )
  }
  
  if (amountMsats < payInfo.minSendable || amountMsats > payInfo.maxSendable) {
    throw new Error(
      `Amount must be between ${payInfo.minSendable / 1000} and ${payInfo.maxSendable / 1000} sats`
    )
  }

  // Build callback URL with amount
  const callbackUrl = new URL(payInfo.callback)
  callbackUrl.searchParams.set('amount', amountMsats.toString())
  
  if (comment && payInfo.commentAllowed && comment.length <= payInfo.commentAllowed) {
    callbackUrl.searchParams.set('comment', comment)
  }

  // Request the invoice
  const invoiceResponse = await fetch(callbackUrl.toString(), {
    headers: {
      'Accept': 'application/json',
    },
  })

  if (!invoiceResponse.ok) {
    throw new Error(`Failed to get invoice: ${invoiceResponse.status}`)
  }

  const invoiceData = await invoiceResponse.json() as LNURLInvoiceResponse

  if (!invoiceData.pr) {
    throw new Error('No invoice returned from LNURL endpoint')
  }

  // Extract payment hash from the bolt11 invoice
  // The payment hash is encoded in the invoice, we'll extract it via simple parsing
  const paymentHash = extractPaymentHash(invoiceData.pr)

  return {
    paymentRequest: invoiceData.pr,
    paymentHash,
    verifyUrl: invoiceData.verify, // URL to poll for payment status
  }
}

/**
 * Extract payment hash from a BOLT11 invoice using proper decoding
 */
function extractPaymentHash(invoice: string): string {
  // Use bolt11 library to properly decode the invoice
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bolt11 = require('bolt11')
  
  try {
    const decoded = bolt11.decode(invoice)
    
    // The payment hash is in the tags
    const paymentHashTag = decoded.tags.find((t: { tagName: string }) => t.tagName === 'payment_hash')
    if (paymentHashTag && paymentHashTag.data) {
      return paymentHashTag.data as string
    }
    
    // Fallback: some invoices have it as a direct property
    if (decoded.paymentHash) {
      return decoded.paymentHash
    }
    
    throw new Error('No payment hash found in invoice')
  } catch (error) {
    console.error('Failed to decode BOLT11 invoice:', error)
    throw new Error('Invalid BOLT11 invoice format')
  }
}

/**
 * Check if an invoice has been paid using the LNURL verify endpoint
 */
export async function checkLNURLPaymentStatus(verifyUrl: string): Promise<{
  paid: boolean
  preimage?: string
}> {
  try {
    const response = await fetch(verifyUrl, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      return { paid: false }
    }

    const data = await response.json()
    
    // The verify endpoint returns { settled: true, preimage: "..." } when paid
    if (data.settled === true) {
      return { paid: true, preimage: data.preimage }
    }
    
    return { paid: false }
  } catch (error) {
    console.error('LNURL verify check failed:', error)
    return { paid: false }
  }
}

/**
 * Check if a Lightning Address is reachable and supports LNURL-pay
 */
export async function validateLightningAddress(address: string): Promise<{
  valid: boolean
  error?: string
  minSats?: number
  maxSats?: number
}> {
  if (!isValidLightningAddress(address)) {
    return { valid: false, error: 'Invalid Lightning Address format' }
  }

  try {
    const payInfo = await fetchLNURLPayInfo(address)
    return {
      valid: true,
      minSats: Math.ceil(payInfo.minSendable / 1000),
      maxSats: Math.floor(payInfo.maxSendable / 1000),
    }
  } catch (error) {
    return {
      valid: false,
      error: `Could not reach Lightning Address: ${error}`,
    }
  }
}
