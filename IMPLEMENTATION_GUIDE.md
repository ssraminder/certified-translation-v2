# Quote Ready Email & Magic Link Implementation Guide

## Overview
This implementation provides a complete system for enhanced quote management, including app settings, business hours, holidays, and magic link authentication for quote viewing.

## What Was Created

### 1. Database Schema (in `db/schema/`)

#### `001_app_settings.sql`
- **Table**: `app_settings`
- **Purpose**: Store application configuration
- **Key Fields**:
  - `setting_key`: Unique identifier (e.g., 'company_name', 'logo_url', 'support_email')
  - `setting_value`: The configuration value
  - `setting_type`: Type of value ('string', 'number', 'boolean', 'json', 'file_url')
  - `updated_at`, `updated_by_admin_id`: Audit trail

**Default Settings Pre-populated**:
- company_name: "Cethos Translation Services"
- logo_url: NULL (admin uploads)
- support_email: "support@cethos.com"
- support_phone: "+1 (555) 123-4567"
- default_turnaround_time: "3-5 business days"
- quote_expiry_days: "30"
- magic_link_expiry_days: "30"

#### `002_company_locations.sql`
- **Table**: `company_locations`
- **Purpose**: Support multiple office locations
- **Key Fields**:
  - `name`: Location name (e.g., "Toronto Office")
  - `is_primary`: Mark primary location
  - `timezone`: Location timezone

#### `003_location_business_hours.sql`
- **Table**: `location_business_hours`
- **Purpose**: Define business hours for each location and day
- **Key Fields**:
  - `location_id`: FK to company_locations
  - `day_of_week`: 0=Monday, 1=Tuesday, ... 6=Sunday
  - `is_closed`: Boolean for closed days
  - `opening_time`, `closing_time`: HH:MM format

#### `004_holidays.sql`
- **Table**: `company_holidays`
- **Purpose**: Manage company holidays with custom hours
- **Key Fields**:
  - `location_id`: FK to company_locations
  - `holiday_date`: Specific date of holiday
  - `is_closed`: Whether fully closed
  - `opening_time`, `closing_time`: Optional custom hours
  - `is_recurring`: Annual recurring holiday
  - `recurring_month`, `recurring_day`: For annual holidays

#### `005_quote_ready_emails.sql`
- **Table**: `quote_ready_emails`
- **Purpose**: Track quote ready emails and magic links
- **Key Fields**:
  - `quote_id`: FK to quote_submissions
  - `magic_link_token`: Unique token for authentication
  - `magic_link_expires_at`: Expiry timestamp
  - `sent_at`, `opened_at`, `clicked_link_at`: Email tracking

#### `006_extend_quote_results.sql`
- **Extends**: `quote_results` table
- **New Fields**:
  - `estimated_delivery_date`: DATE
  - `delivery_estimate_text`: VARCHAR(255) - e.g., "3-5 business days"
  - `quote_expires_at`: TIMESTAMP - when quote link expires
  - `location_id`: FK to company_locations

---

### 2. API Endpoints

#### Settings Management
**`/api/admin/settings/app-settings.js`**
- `GET` - Fetch all application settings
- `PATCH` - Update a specific setting
- **Permission**: `settings:edit`
- **Response**: Settings as key-value pairs with metadata

**`/api/admin/settings/locations.js`**
- `GET` - Fetch all company locations with their business hours
- `POST` - Create new location
- `PATCH` - Update location and its business hours
- **Permission**: `settings:edit`

**`/api/admin/settings/holidays.js`**
- `GET` - Fetch holidays (with optional location_id and upcoming_only filters)
- `POST` - Create new holiday
- `PATCH` - Update existing holiday
- `DELETE` - Delete holiday
- **Permission**: `settings:edit`

#### Quote Magic Links
**`/api/quotes/magic-link.js`**
- `POST` - Generate/retrieve magic link for quote viewing
  - Creates new token if none exists and not expired
  - Returns existing token if valid and unexpired
  - **Input**: `{ quote_id, email }`
  - **Response**: `{ token, expiresAt, isNew }`
- `GET` - Validate magic link token
  - **Input**: `?token=...`
  - **Response**: Quote details and validation status

**`/api/quotes/view-by-token.js`**
- `GET` - Fetch full quote details using magic link token
- **Input**: `?token=...`
- **Response**: Complete quote with files, line items, certifications, business hours, upcoming holidays

#### Quote Delivery Calculation
**`/api/admin/quotes/calculate-delivery.js`**
- `POST` - Calculate and update delivery estimates and expiry dates
- **Input**: `{ quote_id, location_id (optional) }`
- **Response**: Updated quote_results with delivery info
- **Permission**: `quotes:edit`
- **Features**:
  - Skips weekends automatically
  - Skips company holidays
  - Considers location timezone
  - Returns expiry date based on settings

#### Quote Ready Email
**`/api/admin/quotes/send-ready-email.js`**
- `POST` - Send enhanced quote ready email with magic link
- **Input**: `{ quote_id, recipient_email }`
- **Response**: Email sent confirmation with view URL
- **Permission**: `quotes:edit`
- **Features**:
  - Generates or retrieves existing magic link
  - Pulls all quote details
  - Fetches app settings and branding
  - Loads business hours and upcoming holidays
  - Creates professional HTML email
  - Logs email tracking

---

### 3. Admin User Interface

#### `components/admin/AdminSettingsPanel.jsx`
Comprehensive admin panel with 3 tabs:

**Tab 1: General Settings**
- Company Logo upload (file input)
- Company Name (text)
- Support Email (email input)
- Support Phone (tel input)
- Default Turnaround Time (text)
- Quote Expiry Period (number, days)
- Magic Link Expiry (number, days)

**Tab 2: Business Hours**
- Location selector dropdown
- 7 day grid with:
  - Checkbox for "Closed"
  - Time pickers (opening_time, closing_time) when open
- Save button with validation

**Tab 3: Holidays**
- Location selector
- "Add Holiday" button
- Holiday form with:
  - Holiday Name (required)
  - Holiday Date (required)
  - Description (optional)
  - Closed checkbox
  - Custom hours if not closed
  - Recurring annually checkbox
- Holiday list showing:
  - Name, date, description
  - Custom hours if applicable
  - "Recurring Annually" badge
  - Delete button with confirmation

#### `pages/admin/settings/app-config.jsx`
Main admin page wrapper that:
- Restricts access to `settings:edit` permission
- Shows title and description
- Renders AdminSettingsPanel component

---

### 4. Email Templates

#### `lib/emailTemplates/quoteReadyEmail.js`
Professional HTML email template generator with:

**Header Section**
- Company logo (if uploaded) or company name in gradient header
- Personalized greeting with user's first name

**Quote Summary Box**
- Quote number
- Language pair (source → target)
- Document count
- Total pages
- Certification type
- Estimated delivery timeframe
- Quote expiration date

**Pricing Breakdown**
- Line-by-line itemization:
  - Document name
  - Page count and per-page rate
  - Line total
- Subtotal
- Tax (5% GST)
- Total in CAD currency

**Holiday Notice (if applicable)**
- Yellow alert box if holiday falls within delivery window
- Shows holiday name and date

**Next Steps Section**
Guidance text:
1. Review complete quote details
2. Proceed to checkout
3. Team begins work after payment
4. Available to answer questions

**Contact Information**
- Support email (clickable link)
- Support phone (clickable link)
- Business hours (formatted from settings):
  - "Monday-Friday: 9:00 AM - 5:00 PM"
  - "Saturday-Sunday: Closed"

**Call-to-Action Button**
- Large "View Quote" button
- Links to `/quotes/view?token=...`
- No login required
- Styled in brand color (#00A8CC)

**Footer**
- Copyright with year
- Company name
- Professional footer disclaimer

#### Exported Functions
- `generateQuoteReadyHTML(quoteData)` - HTML email
- `generateQuoteReadyText(quoteData)` - Plain text fallback

---

### 5. Quote Viewing

#### `pages/quotes/view.jsx`
Public page for viewing quotes via magic link

**Features**:
- No authentication required (magic link validates token)
- Automatic redirect if token invalid or expired
- Displays full quote details:
  - Quote number, created date
  - Language pair, document count, total pages
  - List of uploaded documents with download links
  - Line-item pricing breakdown
  - Subtotal, tax, total
  - Estimated delivery date
  - Delivery estimate text
- Expiry warning (highlights if expiring within 7 days)
- Action buttons:
  - "Proceed to Payment" - links to payment
  - "Print Quote" - browser print dialog
- Responsive design
- Error handling:
  - Link expired → Shows message and "Create New Quote" button
  - Quote not found → Friendly error message

---

### 6. Quote Delivery Calculation

#### `lib/quoteDelivery.js`
Utility functions for delivery date calculations:

**Functions**:
- `calculateDeliveryEstimate(businessDays, startDate)` - Basic business day calculation
- `parseBusinessDays(turnaroundString)` - Parse "3-5 business days" format
- `calculateQuoteExpiry(expiryDays, startDate)` - Calculate quote expiration
- `calculateDeliveryWithHolidays(supabase, locationId, businessDays, startDate)` - Smart calculation that skips weekends and holidays
- `getSettingValue(supabase, settingKey, defaultValue)` - Fetch app setting

**Features**:
- Skips Saturdays and Sundays
- Queries database for location-specific holidays
- Graceful fallback if no location specified
- Returns skipped holiday count

#### `lib/quoteEnrichment.js`
Higher-level function for enriching quotes:

**Function**: `enrichQuoteWithDeliveryInfo(supabase, quoteId, locationId)`
- Fetches current quote results
- Gets turnaround time and expiry settings
- Calculates delivery date with holidays
- Calculates quote expiry date
- Updates quote_results with:
  - `estimated_delivery_date`
  - `delivery_estimate_text`
  - `quote_expires_at`
  - `location_id`
- Returns detailed delivery info

---

### 7. Email Integration in lib/email.js

**New Function**: `sendQuoteReadyEmail(options)`
- **Parameters**:
  - `email`: Recipient email
  - `first_name`: Recipient first name
  - `quote_number`: Quote number
  - `quoteData`: Quote details (languages, documents, pricing, etc.)
  - `viewQuoteUrl`: Full URL to view quote page
  - `settings`: App settings object
- **Features**:
  - Uses enhanced HTML template
  - Includes plain text fallback
  - Sends via Brevo
  - Logs email in email_logs table
  - Tags: ['quote-ready', 'transactional']
  - Error handling with logging

**Updated**: `lib/email.js` imports the new email template generator

---

## How to Use

### For Admins

#### 1. Configure App Settings
1. Go to Admin → Settings → App Configuration
2. Fill in company info:
   - Upload logo
   - Set support email/phone
   - Set turnaround time (e.g., "3-5 business days")
   - Set quote expiry (days)
3. Configure business hours:
   - Select location
   - Toggle "Closed" for days not open
   - Set opening/closing times for open days
4. Manage holidays:
   - Add holiday with date and name
   - Choose if fully closed or custom hours
   - Mark as recurring if annual event

#### 2. Send Quote Ready Email
1. Create/finalize a quote
2. Go to quote details
3. Click "Send Quote Ready Email"
4. System automatically:
   - Generates magic link (or reuses unexpired one)
   - Creates professional HTML email
   - Includes company branding
   - Adds magic link for viewing
   - Sends via Brevo
5. Email is logged and tracked

#### 3. Calculate Delivery Estimates
Via API (called internally or manually):
```bash
POST /api/admin/quotes/calculate-delivery
{
  "quote_id": "uuid",
  "location_id": "uuid" // optional
}
```

### For Customers

#### 1. Click Magic Link in Email
- Click "View Quote" button in email
- Automatically authenticated (no login needed)
- Redirected to `/quotes/view?token=...`

#### 2. Review Quote
- See all quote details
- Download documents
- View pricing breakdown
- See delivery estimate

#### 3. Expired Quote
- If link expired, message shown
- Button to request new quote
- Can contact support

---

## Database Relationships

```
company_locations (1) ← (N) location_business_hours
                     ← (N) company_holidays
                     ← (N) quote_results

app_settings ← (N) updated_by_admin_id → admin_users

quote_submissions (1) ← (N) quote_ready_emails
                     ← (1) quote_results

quote_results (1) → (N) quote_sub_orders (line items)
               → (N) quote_certifications
               → (N) quote_adjustments
               → (N) quote_files
```

---

## Integration Points

### When Creating/Updating a Quote
1. After quote_results is saved, call `enrichQuoteWithDeliveryInfo()` to calculate delivery estimates
2. Location ID should be stored in quote_results

### When Sending Quote Ready Email
1. Call `POST /api/admin/quotes/send-ready-email`
2. System handles all details automatically
3. Magic link is generated or reused

### When Customer Views Quote
1. They click email link with magic token
2. Page validates token via `GET /api/quotes/view-by-token?token=...`
3. If valid, quote details are fetched
4. If expired (> 30 days), friendly message shown

---

## Permission Model

- **Settings Access**: Only `super_admin` and `manager` roles
- **Quote Emails**: Requires `quotes:edit` permission
- **Magic Link Validation**: No permission required (public endpoint)
- **Quote Viewing**: Magic token validates access (no permission needed)

---

## Customization

### Change Turnaround Time
Edit `app_settings` table or via admin UI:
- Default: "3-5 business days"
- System parses "X-Y business days" format

### Change Quote Expiry
Edit `app_settings` table or via admin UI:
- Default: 30 days
- Magic links also expire after this period

### Add Holidays Retroactively
Use admin UI:
1. Go to Settings → Holidays
2. Select location
3. Add holiday with date
4. Automatic delivery calculation will respect it

### Customize Email Template
Edit `lib/emailTemplates/quoteReadyEmail.js`:
- Colors, fonts, layout
- Contact information sections
- Next steps wording
- Business hours formatting

---

## Testing Checklist

- [ ] Admin can upload company logo
- [ ] Admin can set business hours for each day
- [ ] Admin can add/edit/delete holidays
- [ ] Magic link generates successfully
- [ ] Magic link works multiple times (same token)
- [ ] Magic link expires after configured days
- [ ] Quote view page shows all details
- [ ] Email template renders correctly
- [ ] Delivery dates skip weekends
- [ ] Delivery dates skip holidays
- [ ] Quote expiry date calculated correctly
- [ ] Expired quote shows friendly message
- [ ] Business hours display in email
- [ ] Holiday notice shows in email when applicable
- [ ] Documents are downloadable from quote view
- [ ] Pricing breakdown is accurate
- [ ] Tax calculation is correct (5% GST)
- [ ] Print functionality works

---

## File Structure

```
db/schema/
  001_app_settings.sql
  002_company_locations.sql
  003_location_business_hours.sql
  004_holidays.sql
  005_quote_ready_emails.sql
  006_extend_quote_results.sql

lib/
  email.js (updated with new function)
  emailTemplates/
    quoteReadyEmail.js
  quoteDelivery.js
  quoteEnrichment.js

pages/
  admin/settings/
    app-config.jsx
  api/admin/settings/
    app-settings.js
    locations.js
    holidays.js
  api/admin/quotes/
    send-ready-email.js
    calculate-delivery.js
  api/quotes/
    magic-link.js
    view-by-token.js
  quotes/
    view.jsx

components/admin/
  AdminSettingsPanel.jsx
```

---

## Notes

- All timestamps are ISO 8601 format
- Timezone handling uses location_business_hours, not hardcoded
- Delivery calculation is conservative (uses max of range, e.g., "3-5" = 5 days)
- Magic links stored in quote_ready_emails for audit trail
- Email logging happens automatically
- No cleanup job needed (links auto-expire based on timestamp)
