# File Retrieval Changes - Using quote_id Filtering

## Summary
This document describes the changes made to ensure files are properly retrieved from the `quote_files` and `quote_reference_materials` tables using `quote_id` filtering, with automatic signed URL regeneration when needed.

## Changes Made

### 1. New Utility File: `lib/fileOperations.js`
Created a centralized utility file for file operations with the following functions:

- **`getQuoteFiles(supabase, quoteId)`**: Fetches all files from `quote_files` table filtered by `quote_id`
- **`getQuoteReferenceMaterials(supabase, quoteId)`**: Fetches all reference materials from `quote_reference_materials` table filtered by `quote_id`
- **`regenerateSignedUrlIfNeeded(supabase, file)`**: Regenerates signed URLs for files if they're expired or missing
- **`getOrderFilesFromQuote(supabase, quoteId)`**: Complete wrapper that fetches both files and reference materials with signed URLs

### 2. Updated API Endpoints

#### `pages/api/orders/create-from-quote.js`
- Uses `getOrderFilesFromQuote()` utility to fetch files by `quote_id`
- Automatically regenerates signed URLs for all files
- Returns `documents` and `reference_materials` arrays in order response

#### `pages/api/admin/quotes/[quoteId]/index.js`
- Uses `getQuoteFiles()` and `getQuoteReferenceMaterials()` utilities
- Uses `regenerateSignedUrlIfNeeded()` for each file
- Properly filters files by `quote_id` before returning

#### `pages/api/quotes/view-by-token.js`
- Uses `getQuoteFiles()` and `getQuoteReferenceMaterials()` utilities
- Uses `regenerateSignedUrlIfNeeded()` for each file
- Returns both `files` and `referenceFiles` with signed URLs

#### `pages/api/dashboard/quotes/[id].js`
- Uses `getQuoteFiles()` and `getQuoteReferenceMaterials()` utilities
- Uses `regenerateSignedUrlIfNeeded()` for each file
- Returns `documents` and `reference_materials` in the enhanced quote response

#### `pages/api/trigger-n8n.js`
- Uses `getQuoteFiles()` utility to fetch files by `quote_id`
- Generates fresh signed URLs for webhook payload

#### `pages/api/admin/quotes/send-magic-link.js`
- Uses `getQuoteFiles()` utility to get file count
- Properly filters files by `quote_id`

#### `pages/api/admin/quotes/send-ready-email.js`
- Uses `getQuoteFiles()` utility to get file count
- Properly filters files by `quote_id`

### 3. Component Improvements: `components/FilesDisplay.jsx`
- Enhanced debug logging to show which files are being received
- Improved handling of files without URLs
- Shows helpful message when URL needs to be generated (click Download)
- Better error handling and display

## How It Works

### File Retrieval Flow
```
1. API receives request with quote_id (either directly or from order.quote_id)
2. Calls getQuoteFiles(supabase, quote_id) to fetch from quote_files table
3. Calls getQuoteReferenceMaterials(supabase, quote_id) to fetch from quote_reference_materials table
4. For each file, calls regenerateSignedUrlIfNeeded() to:
   - Check if URL is expired or missing
   - Generate fresh signed URL from Supabase storage if needed
   - Return file with valid file_url
5. Returns formatted file objects to client
```

### Key Benefits
- **Consistent behavior**: All endpoints use the same utility functions
- **Automatic URL regeneration**: Signed URLs are automatically refreshed when expired
- **Proper filtering**: Files are filtered by quote_id, ensuring only relevant files are returned
- **Error handling**: Failures are logged and don't break the request
- **Maintainability**: Centralized logic makes future updates easier

## For Admin Orders Page

When viewing an admin order:
1. The order record is fetched, which includes `quote_id`
2. `getOrderWithDetails()` uses `getOrderFilesFromQuote(quote_id)` to fetch files
3. Files are returned with valid signed URLs
4. `FilesDisplay` component renders both documents (quote_files) and reference materials (quote_reference_materials)
5. Users can download files directly from the admin panel

## Testing
To verify the changes work:
1. Navigate to an admin order page
2. Scroll to "Files Overview" section
3. Should see both "Uploads" (quote_files) and "Documents" (quote_reference_materials) sections
4. Click "Download" button to generate and download files
5. Check browser console for debug logs showing file data
