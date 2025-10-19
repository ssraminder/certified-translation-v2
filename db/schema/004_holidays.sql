-- Holidays Table - manages company holidays with custom hours
CREATE TABLE IF NOT EXISTS company_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES company_locations(id) ON DELETE CASCADE,
  holiday_name VARCHAR(255) NOT NULL,
  holiday_date DATE NOT NULL,
  description TEXT,
  is_closed BOOLEAN DEFAULT TRUE, -- If true, office is fully closed
  opening_time TIME, -- If not closed, custom opening time
  closing_time TIME, -- If not closed, custom closing time
  is_recurring BOOLEAN DEFAULT FALSE, -- If true, repeats annually on this month/day
  recurring_month SMALLINT, -- 1-12 for recurring holidays
  recurring_day SMALLINT, -- 1-31 for recurring holidays
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  UNIQUE(location_id, holiday_date)
);

-- Create indexes
CREATE INDEX idx_holidays_location ON company_holidays(location_id);
CREATE INDEX idx_holidays_date ON company_holidays(holiday_date);
CREATE INDEX idx_holidays_recurring ON company_holidays(is_recurring, recurring_month, recurring_day);
