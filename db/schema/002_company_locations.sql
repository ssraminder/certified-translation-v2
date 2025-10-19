-- Company Locations Table - supports multiple office locations
CREATE TABLE IF NOT EXISTS company_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL, -- e.g., "Toronto Office", "Vancouver Office"
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,
  timezone VARCHAR(50) DEFAULT 'America/Toronto',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX idx_company_locations_primary ON company_locations(is_primary);

-- Insert default primary location
INSERT INTO company_locations (name, is_primary, timezone) 
VALUES ('Main Office', TRUE, 'America/Toronto')
ON CONFLICT DO NOTHING;
