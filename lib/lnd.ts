/**
 * LND Client for Voltage Node
 * 
 * Connects to your Voltage LND node via REST API to create and check invoices.
 * 
 * Required environment variables:
 * - LND_REST_HOST: Your Voltage node REST endpoint (e.g., "your-node.m.voltageapp.io:8080")
 * - LND_MACAROON_HEX: Your admin macaroon in hex format
 */

const LND_REST_HOST = process.env.LND_REST_HOST || ''
const LND_MACAROON_HEX = process.env.LND_MACAROON_HEX || ''

interface AddInvoiceResponse {
  r_hash: string // base64 encoded
  payment_request: string
  add_index: string
  payment_addr: string // base64 encoded
}

interface LookupInvoiceResponse {
  memo: string
  r_preimage: string
  r_hash: string
  value: string
  value_msat: string
  settled: boolean
  creation_date: string
  settle_date: string
  payment_request: string
  state: 'OPEN' | 'SETTLED' | 'CANCELED' | 'ACCEPTED'
}

async function lndRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!LND_REST_HOST || !LND_MACAROON_HEX) {
    throw new Error('LND configuration missing. Set LND_REST_HOST and LND_MACAROON_HEX environment variables.')
  }

  // Remove https:// if user included it in the host
  const cleanHost = LND_REST_HOST.replace(/^https?:\/\//, '')
  const url = `https://${cleanHost}${path}`
  
  console.log('LND Request URL:', url)
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Grpc-Metadata-macaroon': LND_MACAROON_HEX,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('LND API error response:', error)
    throw new Error(`LND API error: ${response.status} - ${error}`)
  }

  return response.json()
}

/**
 * Create a Lightning invoice for document access
 */
export async function createInvoice(
  amountSats: number,
  memo: string,
  expirySecs: number = 3600
): Promise<{ paymentRequest: string; paymentHash: string }> {
  const response = await lndRequest<AddInvoiceResponse>('/v1/invoices', {
    method: 'POST',
    body: JSON.stringify({
      value: amountSats.toString(),
      memo,
      expiry: expirySecs.toString(),
    }),
  })

  // Convert base64 r_hash to hex for easier handling
  const paymentHash = Buffer.from(response.r_hash, 'base64').toString('hex')
  
  console.log('Invoice created - r_hash from LND:', response.r_hash, '-> hex:', paymentHash)

  return {
    paymentRequest: response.payment_request,
    paymentHash,
  }
}

/**
 * Check if an invoice has been paid
 */
export async function checkInvoicePaid(paymentHashHex: string): Promise<boolean> {
  // LND REST API expects base64url-encoded hash in path
  // Convert hex to bytes, then to base64url (no padding)
  const hashBytes = Buffer.from(paymentHashHex, 'hex')
  const base64url = hashBytes.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '') // Remove padding
  
  console.log('Looking up invoice - hex:', paymentHashHex, 'base64url:', base64url)
  
  const response = await lndRequest<LookupInvoiceResponse>(
    `/v1/invoice/${base64url}`
  )

  return response.settled || response.state === 'SETTLED'
}

/**
 * Get invoice details
 */
export async function getInvoice(paymentHashHex: string): Promise<LookupInvoiceResponse> {
  const hashBytes = Buffer.from(paymentHashHex, 'hex')
  const base64url = hashBytes.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  
  return lndRequest<LookupInvoiceResponse>(`/v1/invoice/${base64url}`)
}
