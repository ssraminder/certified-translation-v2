# Admin Order Details Page

A comprehensive, professional order management interface for a translation/certification service with message-based chat, complete pricing management, and full order lifecycle tracking.

## Features

### 1. **Order Timeline Section**
- Visual progress indicator with 5 stages
- Animated current status indicator
- Color-coded completed/pending states
- Timestamps for each milestone

### 2. **Customer Information**
- Editable customer details (name, email, phone)
- Verified email badge
- Phone number auto-formatting
- Quick stats (total orders, lifetime value)
- Quick action buttons (email, call, view history)

### 3. **Project Details**
- Service type selection (Translation, Certification, Notarization, Interpretation)
- Language pair selection with flags
- Document type categorization
- Page and word count tracking
- Urgency level selection
- Translator assignment
- Due date picker with overdue warnings
- Project status tracking
- Special instructions (visible to translator)
- Internal notes (PM only, with lock icon)

### 4. **Document Analysis Results**
- Collapsible analysis section
- Summary statistics (pages, words, complexity, time estimate)
- Recommended pricing
- File-wise breakdown table
- Page-wise detail nested table
- Complexity color coding

### 5. **Documents & Files**
- Drag-and-drop file upload
- Upload progress bars
- File type validation (PDF, DOC, DOCX, JPG, PNG, ZIP)
- 25MB per file limit
- Separate source/delivery document sections
- Download and delete functionality

### 6. **Pricing & Financials** (Most Complex)
- Original order breakdown
- Line items for translation, certification, delivery, shipping
- Tax calculation
- Amendment tracking with reasons
- Payment details with transaction IDs
- Balance calculation and display
- Refund history
- Three modal dialogs:
  - Edit Pricing Modal
  - Send Invoice Modal
  - Process Refund Modal

### 7. **Billing Address**
- Editable address form
- Full address display
- Phone and email fields

### 8. **Shipping Address**
- Same as billing checkbox
- Separate shipping form when different
- Auto-fill from billing when checked

### 9. **Shipping Options**
- Multiple shipping method selection
- Price display for each option
- Tracking number support
- Estimated delivery dates

### 10. **Activity Log**
- Chronological event timeline
- Filter by activity type (All, Payments, Updates, Communications)
- Icon-based event categorization
- Metadata display for each event
- Lazy loading of old entries

### 11. **Message-Based Chat**
- Fixed expandable panel (bottom-right)
- Customer/Admin message distinction
- Internal note mode (PM only)
- System messages for important events
- File attachment support
- Auto-refresh every 60 seconds (configurable)
- Unread message counter
- Quick reply templates
- Formatting toolbar (Bold, Italic, Link, Emoji)

### 12. **Sticky Action Bar**
- Always-visible order total
- Balance due/refund due indicator
- Context-aware action buttons
- Three-dot menu for additional options
- Responsive mobile layout

## Component Structure

```
components/admin/order/
├── PageHeader.jsx                 # Sticky header with status badges
├── OrderTimelineSection.jsx       # Timeline visualization
├── CustomerInformationSection.jsx # Customer details (editable)
├── ProjectDetailsSection.jsx      # Project info form
├── AnalysisResultsSection.jsx     # N8N analysis data
├── DocumentsSection.jsx           # File management
├── PricingFinancialsSection.jsx   # Pricing overview
├── BillingAddressSection.jsx      # Billing address form
├── ShippingAddressSection.jsx     # Shipping address form
├── ShippingOptionsSection.jsx     # Shipping method selection
├── ActivityLogSection.jsx         # Event timeline
├── ChatPanel.jsx                  # Chat container
├── StickyActionBar.jsx            # Bottom action bar
├── ResponsiveWrapper.jsx          # Mobile/tablet utilities
├── AccessibilityUtils.jsx         # A11y helpers
│
├── chat/
│   ├── MessageList.jsx            # Messages display
│   └── MessageInput.jsx           # Message composer
│
└── modals/
    ├── EditPricingModal.jsx       # Price editing
    ├── SendInvoiceModal.jsx       # Invoice sending
    └── ProcessRefundModal.jsx     # Refund processing
```

## API Endpoints

### Messages
- `GET /api/orders/[orderId]/messages` - Fetch messages
- `POST /api/orders/[orderId]/messages` - Send message
- `PATCH /api/orders/[orderId]/messages/mark-read` - Mark messages as read

### Orders
- `GET /api/orders/[orderId]` - Get order details
- `PATCH /api/orders/[orderId]` - Update order fields
- `POST /api/orders/[orderId]/send-invoice` - Send invoice
- `POST /api/orders/[orderId]/refund` - Process refund
- `GET /api/orders/[orderId]/activity` - Get activity log

## Responsive Design

### Mobile (< 768px)
- Single column layout
- Collapsible sections (accordion)
- Compact header with abbreviated info
- Full-screen chat overlay
- Touch-optimized buttons (min 44px)

### Tablet (768px - 1024px)
- Adjusted spacing
- Two-column forms where appropriate
- Chat panel at 60% width

### Desktop (> 1024px)
- Full layout as designed
- Sticky header and footer
- Side-by-side sections
- 400px chat panel

## Accessibility

### WCAG 2.1 Level AA Compliance
- Semantic HTML structure
- ARIA labels for icon buttons
- Keyboard navigation support
- Focus indicators (2px blue outline)
- Color contrast ratios (4.5:1 for normal text)
- Form labels associated with inputs
- Error messages linked to form fields
- Skip navigation support

### Keyboard Shortcuts
- `Escape` - Close modals/chat
- `Enter` - Submit forms/send messages
- `Shift+Enter` - New line in textareas
- `Ctrl/Cmd+K` - Open chat (future)
- `Ctrl/Cmd+S` - Save changes (future)

### Screen Reader Support
- Live regions for notifications
- Announcements for async operations
- Proper role attributes
- Status indicators

## Animations

All animations respect `prefers-reduced-motion` media query for accessibility.

### Supported Animations
- `animate-fadeIn` - Fade in effect
- `animate-slideUp` - Slide up from bottom
- `animate-scaleIn` - Scale up from center
- `animate-pulse` - Pulsing effect (unread badges)
- `animate-spin` - Loading spinner
- `animate-shake` - Error indication

## Styling

### Color Palette
- Primary Blue: `#3B82F6`
- Success Green: `#10B981`
- Warning Orange: `#F59E0B`
- Error Red: `#EF4444`
- Neutral Gray: `#6B7280`
- Background: `#F9FAFB`

### Typography
- Font Family: `Inter`, system-ui, sans-serif
- Headings: 18px (semi-bold), 24px (bold)
- Body: 14px (regular)
- Small: 12px (regular)

## Usage

### Basic Implementation
```jsx
import OrderDetailsPage from 'pages/admin/orders/[orderId]';

// The page component handles all routing and data fetching
export default OrderDetailsPage;
```

### Updating Order Data
```jsx
const handleUpdate = async (updatedData) => {
  const resp = await fetch(`/api/orders/${order.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData),
  });
  const data = await resp.json();
  setOrder(data.order); // Update state
};
```

### Sending Messages
```jsx
const handleSendMessage = async (text, files, isInternal) => {
  const formData = new FormData();
  formData.append('text', text);
  formData.append('isInternal', isInternal);
  
  const resp = await fetch(`/api/orders/${order.id}/messages`, {
    method: 'POST',
    body: formData,
  });
  const data = await resp.json();
  // Update messages list
};
```

## Environment Variables

Required:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Optional:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
BREVO_API_KEY
```

## Database Schema

### Required Tables
- `orders` - Order data
- `order_messages` - Chat messages
- `order_activity` - Activity log
- `order_refunds` - Refund records
- `order_documents` - File attachments

### Fields (Orders Table)
```sql
id, order_number, customer_name, customer_email, customer_phone,
status, payment_status, total, amount_paid,
service_type, source_language, target_language,
document_type, page_count, word_count,
urgency, due_date, project_status,
special_instructions, internal_notes,
billing_address (JSONB), shipping_address (JSONB),
created_at, updated_at
```

## Performance Optimizations

- Lazy loading of activity log (50 items per page)
- Virtualized message list for long conversations
- Debounced auto-save for form changes
- Optimized image loading
- Code splitting for modals
- Memoized components to prevent unnecessary re-renders

## Testing

### Unit Tests
- Component rendering
- Form validation
- State management
- Button click handlers

### Integration Tests
- API calls for CRUD operations
- Message sending and receiving
- File uploads
- Balance calculations

### E2E Tests
- Complete order workflow
- Chat interaction
- Modal operations
- Responsive behavior

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Known Limitations

1. Real-time updates use polling (60s interval) - consider WebSocket for larger scale
2. Single file upload at a time - batch upload can be added
3. No offline support - could add service worker caching
4. Chat history limited to current session - pagination needed for large histories

## Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] Advanced search and filtering
- [ ] Order templates
- [ ] Bulk operations
- [ ] Export to PDF with detailed formatting
- [ ] Email integration
- [ ] Analytics dashboard
- [ ] Webhook notifications
- [ ] Multi-language UI
- [ ] Dark mode

## Support & Maintenance

For issues or improvements, please refer to the project documentation and issue tracker.
