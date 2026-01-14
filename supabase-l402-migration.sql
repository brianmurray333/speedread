-- L402 Migration for SpeedRead
-- Run this in your Supabase SQL Editor to add paid document support

-- Add pricing column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS price_sats INTEGER DEFAULT 0;

-- Add lightning address for creator payments
ALTER TABLE documents ADD COLUMN IF NOT EXISTS lightning_address TEXT;

-- Add creator display name (optional)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS creator_name TEXT;

-- Add index for querying paid documents
CREATE INDEX IF NOT EXISTS idx_documents_price ON documents(price_sats);

-- Example: View all documents with their pricing and creator info
-- SELECT id, title, price_sats, lightning_address, creator_name, word_count 
-- FROM documents 
-- ORDER BY created_at DESC;
