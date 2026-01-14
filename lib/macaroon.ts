/**
 * L402 Token Service
 * 
 * Simple signed tokens for L402 authentication.
 * Uses HMAC-SHA256 for signing instead of the macaroons.js library
 * for better serverless compatibility.
 */

import { createHmac } from 'crypto'

// Secret key for signing tokens - MUST be set in production
const TOKEN_SECRET = process.env.MACAROON_SECRET || 'speedread-l402-secret-change-in-production'

export interface L402Token {
  macaroon: string // base64 encoded token
  paymentHash: string
  documentId: string
  expiresAt: number // Unix timestamp
}

interface TokenData {
  documentId: string
  paymentHash: string
  expiresAt: number
}

/**
 * Create a signature for token data
 */
function signToken(data: TokenData): string {
  const payload = `${data.documentId}:${data.paymentHash}:${data.expiresAt}`
  return createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('hex')
}

/**
 * Create an L402 token for document access
 */
export function createL402Macaroon(
  documentId: string,
  paymentHash: string,
  expiresInSeconds: number = 86400 // 24 hours default
): L402Token {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds
  
  const data: TokenData = {
    documentId,
    paymentHash,
    expiresAt,
  }
  
  const signature = signToken(data)
  
  // Encode as base64 JSON with signature
  const token = Buffer.from(JSON.stringify({
    ...data,
    sig: signature,
  })).toString('base64')

  return {
    macaroon: token,
    paymentHash,
    documentId,
    expiresAt,
  }
}

/**
 * Verify an L402 token and extract its claims
 */
export function verifyL402Macaroon(
  serializedMacaroon: string,
  expectedDocumentId: string
): { valid: boolean; error?: string; paymentHash?: string } {
  try {
    // Decode the token
    const decoded = Buffer.from(serializedMacaroon, 'base64').toString('utf-8')
    const tokenData = JSON.parse(decoded) as TokenData & { sig: string }
    
    // Verify document ID matches
    if (tokenData.documentId !== expectedDocumentId) {
      return { valid: false, error: 'Document ID mismatch' }
    }

    // Verify not expired
    if (tokenData.expiresAt < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token expired' }
    }

    // Verify signature
    const expectedSig = signToken({
      documentId: tokenData.documentId,
      paymentHash: tokenData.paymentHash,
      expiresAt: tokenData.expiresAt,
    })
    
    if (tokenData.sig !== expectedSig) {
      return { valid: false, error: 'Invalid token signature' }
    }

    return { valid: true, paymentHash: tokenData.paymentHash }
  } catch (error) {
    return { valid: false, error: `Token verification failed: ${error}` }
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
