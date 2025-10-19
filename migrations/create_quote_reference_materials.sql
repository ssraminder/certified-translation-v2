-- Create quote_reference_materials table for reference files and notes
CREATE TABLE IF NOT EXISTS quote_reference_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quote_submissions(quote_id) ON DELETE CASCADE,
  job_id VARCHAR(20),
  
  -- File information
  file_id UUID,
  filename VARCHAR(255),
  storage_path VARCHAR(500),
  storage_key VARCHAR(500),
  file_url TEXT,
  signed_url TEXT,
  bytes BIGINT,
  content_type VARCHAR(100),
  file_purpose VARCHAR(50) DEFAULT 'reference', -- 'reference', 'template', 'certification', 'glossary', etc.
  file_url_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  status VARCHAR(50) DEFAULT 'uploaded',
  upload_session_id UUID,
  source_lang VARCHAR(100),
  target_lang VARCHAR(100),
  country_of_issue VARCHAR(100),
  
  -- Notes/instructions
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quote_reference_materials_quote_id ON quote_reference_materials(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_reference_materials_job_id ON quote_reference_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_quote_reference_materials_file_purpose ON quote_reference_materials(file_purpose);

-- Enable RLS if needed
ALTER TABLE quote_reference_materials ENABLE ROW LEVEL SECURITY;

-- Add constraint to ensure quote_files only has 'translate' purpose
ALTER TABLE quote_files ADD CONSTRAINT quote_files_purpose_check 
  CHECK (file_purpose = 'translate') NOT VALID;
