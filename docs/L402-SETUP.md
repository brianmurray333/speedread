# L402 Lightning Paywall Setup

This guide explains how to set up L402 (Lightning HTTP 402) payments for SpeedRead.

## Overview

L402 enables per-document micropayments using the Lightning Network. SpeedRead supports two payment modes:

1. **Creator Payments** - Users uploading PDFs can add their Lightning Address. Payments go directly to them.
2. **Platform Payments** - Fallback to your Voltage node for documents without a creator Lightning Address.

The payment flow:

1. User clicks on a paid document
2. App requests an invoice from your Voltage node
3. User pays via Lightning wallet (Alby, Phoenix, etc.)
4. App verifies payment and grants access
5. Access token (macaroon) stored locally for future visits

## Prerequisites

- A Voltage node (LND) - [voltage.cloud](https://voltage.cloud)
- Node.js 18+ for the app
- A Lightning wallet for testing (recommended: [Alby](https://getalby.com) browser extension)

## Voltage Node Setup

### 1. Get Your Node Credentials

From your Voltage dashboard:

1. Go to your node → **Connect**
2. Note your **REST Host** (e.g., `your-node.m.voltageapp.io:8080`)
3. Download your **Admin Macaroon** (you'll need the hex version)

### 2. Convert Macaroon to Hex

If you have a `.macaroon` file, convert it to hex:

```bash
# macOS/Linux
xxd -p -c 1000 admin.macaroon

# Or using Node.js
node -e "console.log(require('fs').readFileSync('admin.macaroon').toString('hex'))"
```

## Environment Variables

Add these to your `.env.local` file:

```bash
# Voltage LND Connection
LND_REST_HOST=your-node.m.voltageapp.io:8080
LND_MACAROON_HEX=0201036c6e6402f801030a10... # Your admin macaroon in hex

# Macaroon Secret (generate a random string for production)
MACAROON_SECRET=your-secure-random-secret-min-32-chars

# Optional: App URL for macaroon location
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Existing Supabase config
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For server-side operations
```

### Generate a Secure Macaroon Secret

```bash
# Generate a 32-byte random secret
openssl rand -hex 32
```

## Database Migration

Run the migration to add paid document support:

```sql
-- In Supabase SQL Editor
ALTER TABLE documents ADD COLUMN IF NOT EXISTS price_sats INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS lightning_address TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS creator_name TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_price ON documents(price_sats);
```

Or run the provided migration file: `supabase-l402-migration.sql`

## How Creator Payments Work

When a user uploads a PDF and publishes it to the library:

1. They can optionally enable a Lightning paywall
2. They enter their **Lightning Address** (e.g., `user@getalby.com`)
3. They set a price in sats
4. When someone pays to read the document, the payment goes **directly to the creator**

This is powered by LNURL-pay - no node credentials are stored.

### Getting a Lightning Address

Users can get a free Lightning Address from:
- [Alby](https://getalby.com) - Can connect to their own Voltage node
- [Wallet of Satoshi](https://walletofsatoshi.com)
- [Phoenix](https://phoenix.acinq.co)
- Many other Lightning wallets

### For Voltage Node Users

If a creator has a Voltage node, they can:
1. Install the [Alby browser extension](https://getalby.com)
2. Connect Alby to their Voltage node
3. Use their Alby Lightning Address (e.g., `username@getalby.com`)

This way, payments go directly to their Voltage node!

## Setting Document Prices (Admin)

To manually make a document paid:

```sql
UPDATE documents 
SET price_sats = 100,
    lightning_address = 'creator@getalby.com',
    creator_name = 'Creator Name'
WHERE title = 'Your Premium Document Title';
```

To view all documents with pricing:

```sql
SELECT id, title, price_sats, lightning_address, creator_name, word_count 
FROM documents 
ORDER BY price_sats DESC, created_at DESC;
```

## Testing

### 1. Install Alby Browser Extension

[Alby](https://getalby.com) provides WebLN support for seamless in-browser payments:

1. Install from [getalby.com](https://getalby.com)
2. Create or connect a Lightning wallet
3. Add some sats for testing (you can use testnet or small mainnet amounts)

### 2. Test the Flow

1. Start the app: `npm run dev`
2. Go to the Library page
3. Click on a paid document (shows ⚡ 100 sats badge)
4. Payment modal appears with:
   - **WebLN button** (if Alby installed) - one-click payment
   - **QR code** - scan with any Lightning wallet
   - **Copy invoice** - paste into wallet manually
5. After payment, document content loads automatically

### 3. Verify Payments

Check your Voltage dashboard to see incoming payments, or use `lncli`:

```bash
lncli listinvoices --pending_only
```

## API Endpoints

### POST /api/l402/challenge
Request a payment challenge for a document.

```json
// Request
{ "documentId": "uuid-here" }

// Response (402 Payment Required)
{
  "paymentHash": "abc123...",
  "paymentRequest": "lnbc1000n1...",
  "macaroon": "base64-macaroon",
  "expiresAt": 1234567890,
  "priceSats": 100
}
```

### POST /api/l402/verify
Verify a payment was completed.

```json
// Request
{ "macaroon": "base64-macaroon", "documentId": "uuid-here" }

// Response
{ "paid": true, "documentId": "uuid-here" }
```

### GET /api/documents/[id]/content
Get document content (requires macaroon for paid docs).

```
GET /api/documents/uuid-here/content?macaroon=base64-macaroon
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend                             │
│  Library Page → Payment Modal → WebLN/QR → SpeedReader  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                 Next.js API Routes                       │
│  /api/l402/challenge - Generate invoice + macaroon      │
│  /api/l402/verify    - Check payment status             │
│  /api/documents/[id] - Protected content delivery       │
└──────────┬─────────────────────────────┬────────────────┘
           │                             │
           │ (Creator payments)          │ (Platform payments)
           ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   LNURL-pay Endpoint    │   │    Voltage LND Node     │
│   (creator@wallet.com)  │   │   (your-node.voltage)   │
│   Payment → Creator     │   │   Payment → Platform    │
└─────────────────────────┘   └─────────────────────────┘
```

## Security Notes

1. **Never expose your admin macaroon** - it has full node access
2. **Use HTTPS in production** - macaroons are bearer tokens
3. **Set a strong MACAROON_SECRET** - this signs your L402 tokens
4. **Consider invoice-only macaroon** - create a limited macaroon that can only create/check invoices

### Creating a Limited Macaroon (Recommended)

```bash
lncli bakemacaroon invoices:read invoices:write --save_to=invoice.macaroon
```

## Troubleshooting

### "LND configuration missing"
Ensure `LND_REST_HOST` and `LND_MACAROON_HEX` are set in `.env.local`

### "Certificate error" or SSL issues
Voltage uses valid SSL certs, but if you see issues:
- Verify the REST host is correct
- Check if your node is online in Voltage dashboard

### "Invoice not paid" even after payment
- Check your node's invoice list in Voltage
- Ensure payment completed (not pending)
- Payment might be on a different path; check `lncli listinvoices`

### WebLN not detected
- Install Alby browser extension
- Ensure Alby is unlocked
- Refresh the page after installing

## Production Considerations

1. **Rate limiting** - Add rate limits to prevent invoice spam
2. **Monitoring** - Track payment success/failure rates
3. **Fallback** - Consider a backup payment method
4. **Refunds** - Lightning payments are final; be clear about this
5. **Pricing** - 100 sats is ~$0.10 at current prices; adjust as needed
