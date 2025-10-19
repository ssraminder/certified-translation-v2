-- Quote Ready Emails Table - tracks when quote ready emails are sent
CREATE TABLE IF NOT EXISTS quote_ready_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quote_submissions(quote_id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  magic_link_token VARCHAR(255) NOT NULL UNIQUE,
  magic_link_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_link_at TIMESTAMP WITH TIME ZONE,
  created_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_quote_ready_emails_quote ON quote_ready_emails(quote_id);
CREATE INDEX idx_quote_ready_emails_token ON quote_ready_emails(magic_link_token);
CREATE INDEX idx_quote_ready_emails_sent ON quote_ready_emails(sent_at);
