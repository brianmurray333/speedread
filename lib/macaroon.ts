/**
 * Macaroon Service for L402 Authentication
 * 
 * Macaroons are bearer tokens with caveats (conditions) that can be verified.
 * For L402, we create a macaroon tied to a specific document and payment hash.
 */

import { MacaroonsBuilder, MacaroonsVerifier, Macaroon } from 'macaroons.js'

// Secret key for signing macaroons - MUST be set in production
const MACAROON_SECRET = process.env.MACAROON_SECRET || 'speedread-l402-secret-change-in-production'
const MACAROON_LOCATION = process.env.NEXT_PUBLIC_APP_URL || 'https://speedread.app'

export interface L402Token {
  macaroon: string // base64 encoded macaroon
  paymentHash: string
  documentId: string
  expiresAt: number // Unix timestamp
}

/**
 * Create an L402 macaroon for document access
 * 
 * The macaroon contains caveats that specify:
 * - Which document it grants access to
 * - The payment hash that must be paid
 * - When it expires
 */
export function createL402Macaroon(
  documentId: string,
  paymentHash: string,
  expiresInSeconds: number = 86400 // 24 hours default
): L402Token {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds
  
  // Create unique identifier for this macaroon
  const identifier = `l402:${documentId}:${paymentHash.substring(0, 16)}`
  
  // Build macaroon with caveats
  const macaroon = new MacaroonsBuilder(MACAROON_LOCATION, MACAROON_SECRET, identifier)
    .add_first_party_caveat(`document_id = ${documentId}`)
    .add_first_party_caveat(`payment_hash = ${paymentHash}`)
    .add_first_party_caveat(`expires_at = ${expiresAt}`)
    .getMacaroon()

  return {
    macaroon: macaroon.serialize(),
    paymentHash,
    documentId,
    expiresAt,
  }
}

/**
 * Verify an L402 macaroon and extract its claims
 */
export function verifyL402Macaroon(
  serializedMacaroon: string,
  expectedDocumentId: string
): { valid: boolean; error?: string; paymentHash?: string } {
  try {
    const macaroon = Macaroon.deserialize(serializedMacaroon)
    
    // Extract caveats
    let documentId: string | null = null
    let paymentHash: string | null = null
    let expiresAt: number | null = null
    
    for (const caveat of macaroon.caveatPackets) {
      if (caveat.type === 0) { // First-party caveat
        const caveatStr = caveat.getValueAsText()
        
        if (caveatStr.startsWith('document_id = ')) {
          documentId = caveatStr.substring('document_id = '.length)
        } else if (caveatStr.startsWith('payment_hash = ')) {
          paymentHash = caveatStr.substring('payment_hash = '.length)
        } else if (caveatStr.startsWith('expires_at = ')) {
          expiresAt = parseInt(caveatStr.substring('expires_at = '.length), 10)
        }
      }
    }

    // Verify document ID matches
    if (documentId !== expectedDocumentId) {
      return { valid: false, error: 'Document ID mismatch' }
    }

    // Verify not expired
    if (expiresAt && expiresAt < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Macaroon expired' }
    }

    // Verify signature
    const verifier = new MacaroonsVerifier(macaroon)
    
    // Add caveat verifiers
    verifier.satisfyExact(`document_id = ${expectedDocumentId}`)
    if (paymentHash) {
      verifier.satisfyExact(`payment_hash = ${paymentHash}`)
    }
    if (expiresAt) {
      verifier.satisfyExact(`expires_at = ${expiresAt}`)
    }

    if (!verifier.isValid(MACAROON_SECRET)) {
      return { valid: false, error: 'Invalid macaroon signature' }
    }

    return { valid: true, paymentHash: paymentHash || undefined }
  } catch (error) {
    return { valid: false, error: `Macaroon verification failed: ${error}` }
  }
}

/**
 * Parse the L402 Authorization header
 * Format: L402 <macaroon>:<preimage>
 */
export function parseL402Header(authHeader: string): { macaroon: string; preimage: string } | null {
  if (!authHeader.startsWith('L402 ')) {
    return null
  }

  const token = authHeader.substring(5) // Remove "L402 " prefix
  const colonIndex = token.indexOf(':')
  
  if (colonIndex === -1) {
    return null
  }

  return {
    macaroon: token.substring(0, colonIndex),
    preimage: token.substring(colonIndex + 1),
  }
}

/**
 * Build the WWW-Authenticate header for 402 response
 */
export function buildL402Challenge(macaroon: string, invoice: string): string {
  return `L402 macaroon="${macaroon}", invoice="${invoice}"`
}
