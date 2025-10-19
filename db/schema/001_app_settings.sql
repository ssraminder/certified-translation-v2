-- App Settings Table - stores configuration like logo, support contact, etc.
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(50) NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'json', 'file_url'
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_app_settings_key ON app_settings(setting_key);

-- Insert default settings
INSERT INTO app_settings (setting_key, setting_value, setting_type, description) VALUES
  ('company_name', 'Cethos Translation Services', 'string', 'Company name for emails and branding'),
  ('logo_url', NULL, 'file_url', 'Company logo URL'),
  ('support_email', 'support@cethos.com', 'string', 'Support email address'),
  ('support_phone', '+1 (555) 123-4567', 'string', 'Support phone number'),
  ('default_turnaround_time', '3-5 business days', 'string', 'Default delivery timeframe for quotes'),
  ('quote_expiry_days', '30', 'number', 'Number of days before a quote expires'),
  ('magic_link_expiry_days', '30', 'number', 'Number of days before a magic link expires')
ON CONFLICT (setting_key) DO NOTHING;
