-- Location Business Hours Table - tracks opening hours for each location and day
CREATE TABLE IF NOT EXISTS location_business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES company_locations(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL, -- 0=Monday, 1=Tuesday, ..., 6=Sunday
  is_closed BOOLEAN DEFAULT FALSE,
  opening_time TIME, -- e.g., '09:00'
  closing_time TIME, -- e.g., '17:00'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(location_id, day_of_week)
);

-- Create indexes
CREATE INDEX idx_business_hours_location ON location_business_hours(location_id);

-- Insert default business hours (Monday-Friday 9:00 AM to 5:00 PM, Saturday-Sunday closed)
INSERT INTO location_business_hours (location_id, day_of_week, is_closed, opening_time, closing_time)
SELECT id, day, false, '09:00'::TIME, '17:00'::TIME
FROM company_locations, LATERAL (VALUES (0), (1), (2), (3), (4)) AS t(day)
WHERE company_locations.is_primary = TRUE
ON CONFLICT DO NOTHING;

INSERT INTO location_business_hours (location_id, day_of_week, is_closed, opening_time, closing_time)
SELECT id, day, true, NULL, NULL
FROM company_locations, LATERAL (VALUES (5), (6)) AS t(day)
WHERE company_locations.is_primary = TRUE
ON CONFLICT DO NOTHING;
