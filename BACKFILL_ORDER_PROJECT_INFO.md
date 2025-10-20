# Order Project Information Backfill

## Overview

This document explains how to run the backfill script to populate project information for all existing orders from their associated quotes.

## What Gets Populated

The backfill script populates the following fields for each order from its associated quote:

| Field | Source |
|-------|--------|
| `source_language` | `quote_submissions.source_lang` |
| `target_language` | `quote_submissions.target_lang` |
| `document_type` | `quote_sub_orders[0].doc_type` (first line item) |
| `page_count` | Sum of `quote_sub_orders.billable_pages` |
| `urgency` | `quote_submissions.delivery_speed` |
| `due_date` | `quote_submissions.delivery_date` |

## Prerequisites

- Node.js installed
- Environment variables configured:
  - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (has elevated permissions)

**Note:** Ensure the service role key is configured in your environment before running the script.

## Running the Backfill

### Option 1: Run Directly with Node

```bash
node scripts/backfill-order-project-info.js
```

### Option 2: Add NPM Script

Add this to your `package.json` scripts section:

```json
"backfill:order-project-info": "node scripts/backfill-order-project-info.js"
```

Then run:

```bash
npm run backfill:order-project-info
```

## What the Script Does

1. **Fetches all orders** with an associated `quote_id`
2. **For each order:**
   - Retrieves the associated quote submission data
   - Calculates total page count from quote line items
   - Extracts document type from the first line item
   - Updates the order with all extracted project information
3. **Provides detailed logging** showing:
   - Progress (e.g., `[1/150]`)
   - Status of each order (✅ updated, ⚠️ quote not found, ❌ error)
   - Final summary with counts

## Example Output

```
Starting backfill of project information for existing orders...

Found 150 orders with associated quotes.

[1/150] ✅ Order abc123: Updated successfully
[2/150] ✅ Order def456: Updated successfully
[3/150] ⚠️  Order ghi789: Quote not found (quote_id: xyz)
...
[150/150] ✅ Order xyz999: Updated successfully

✨ Backfill completed:
   Total processed: 150
   Successfully updated: 148
   Skipped/Failed: 2
```

## Rollback

If you need to rollback the changes, the script updates the `updated_at` timestamp. You could:

1. **Check when changes were made:**
   ```sql
   SELECT * FROM orders WHERE updated_at = '<timestamp of backfill>'
   ```

2. **Reset specific fields if needed** (manual SQL or through Supabase dashboard)

## Notes

- **Safe to run multiple times:** The script is idempotent and will update orders even if they already have some project information
- **No data loss:** The script only updates specific fields and doesn't delete any information
- **Performance:** For large numbers of orders, may take several minutes depending on database size
- **Existing values:** If an order already has a field populated, it will be overwritten with the quote data

## Troubleshooting

### Environment Variables Not Found
Ensure you've set the required environment variables:
```bash
export NEXT_PUBLIC_SUPABASE_URL="https://..."
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

Or create a `.env.local` file in the root directory with these values.

### Connection Errors
- Verify the Supabase URL is correct
- Verify the service role key is valid and has database access
- Check your network connection

### Quote Not Found
Orders with quotes that no longer exist will be skipped with a warning. These can be reviewed and handled separately if needed.

## Questions?

For issues or questions, check:
1. The order's `quote_id` field to ensure it matches an existing quote
2. The quote submission for the required fields
3. The quote line items for page count and document type data
