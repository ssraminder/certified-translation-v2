-- Add delivery and expiry columns to quote_results
ALTER TABLE quote_results ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;
ALTER TABLE quote_results ADD COLUMN IF NOT EXISTS delivery_estimate_text VARCHAR(255);
ALTER TABLE quote_results ADD COLUMN IF NOT EXISTS quote_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quote_results ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES company_locations(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_quote_results_expiry ON quote_results(quote_expires_at);
CREATE INDEX IF NOT EXISTS idx_quote_results_location ON quote_results(location_id);
