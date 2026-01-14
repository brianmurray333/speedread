-- SpeedRead Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/regthoepcejfhoccujac/sql

-- Documents table for storing uploaded PDFs
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  text_content TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read public documents
CREATE POLICY "Public documents are viewable by everyone" 
  ON documents 
  FOR SELECT 
  USING (is_public = true);

-- Policy: Anyone can insert documents (since we're open access)
CREATE POLICY "Anyone can insert documents" 
  ON documents 
  FOR INSERT 
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_public ON documents(is_public);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
