# Developer Quick Reference

## 🚀 Quick Start

### View Order Details
```
URL: /admin/orders/[orderId]
Example: /admin/orders/550e8400-e29b-41d4-a716-446655440000
```

### Component Imports
```jsx
import OrderDetailsPage from 'pages/admin/orders/[orderId]';
import ChatPanel from 'components/admin/order/ChatPanel';
import PricingFinancialsSection from 'components/admin/order/PricingFinancialsSection';
```

---

## 📂 File Locations

| Component | Location |
|-----------|----------|
| Main Page | `pages/admin/orders/[orderId].jsx` |
| Header | `components/admin/order/PageHeader.jsx` |
| Timeline | `components/admin/order/OrderTimelineSection.jsx` |
| Customer Info | `components/admin/order/CustomerInformationSection.jsx` |
| Project Details | `components/admin/order/ProjectDetailsSection.jsx` |
| Analysis | `components/admin/order/AnalysisResultsSection.jsx` |
| Documents | `components/admin/order/DocumentsSection.jsx` |
| Pricing | `components/admin/order/PricingFinancialsSection.jsx` |
| Chat | `components/admin/order/ChatPanel.jsx` |
| Messages | `components/admin/order/chat/MessageList.jsx` |
| Message Input | `components/admin/order/chat/MessageInput.jsx` |
| Modals | `components/admin/order/modals/*.jsx` |
| Animations | `styles/animations.css` |

---

## 🔌 API Endpoints

### GET Order
```javascript
GET /api/orders/[orderId]
Response: { order: {...} }
```

### Update Order
```javascript
PATCH /api/orders/[orderId]
Body: {
  translation_total?: number,
  certification_total?: number,
  delivery_total?: number,
  shipping_total?: number,
  discount_amount?: number,
  discount_type?: string,
  discount_reason?: string
}
Response: { order: {...} }
```

### Get Messages
```javascript
GET /api/orders/[orderId]/messages
Response: { messages: [...] }
```

### Send Message
```javascript
POST /api/orders/[orderId]/messages
Body: {
  text: string,
  isInternal: boolean,
  files?: File[]
}
Response: { message: {...} }
```

### Mark Messages as Read
```javascript
PATCH /api/orders/[orderId]/messages/mark-read
Response: { success: true }
```

### Get Activity Log
```javascript
GET /api/orders/[orderId]/activity?filter=all|payments|updates|communications
Response: { activities: [...] }
```

### Send Invoice
```javascript
POST /api/orders/[orderId]/send-invoice
Body: {
  amount: number,
  scheduleMode: 'now' | 'scheduled',
  scheduledDate?: string,
  includePaymentLink: boolean,
  sendCopyToAdmin: boolean
}
Response: { order: {...}, message: string }
```

### Process Refund
```javascript
POST /api/orders/[orderId]/refund
Body: {
  amount: number,
  reason: string,
  notes?: string,
  notifyCustomer: boolean
}
Response: { order: {...}, refund: {...} }
```

---

## 🎨 Styling & Colors

### Color Variables
```css
--color-primary: #3B82F6    /* Blue */
--color-success: #10B981    /* Green */
--color-warning: #F59E0B    /* Orange */
--color-error: #EF4444      /* Red */
--color-background: #F9FAFB /* Light Gray */
--color-gray-600: #6B7280   /* Medium Gray */
```

### Common Classes
```html
<!-- Flex layouts -->
<div class="flex items-center justify-between gap-4">

<!-- Grid layouts -->
<div class="grid grid-cols-2 gap-4">

<!-- Spacing -->
<div class="p-6 mb-6 pt-4">

<!-- Buttons -->
<button class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">

<!-- Cards -->
<div class="bg-white rounded-lg p-6 border border-gray-200">

<!-- Badges -->
<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
```

### Animations
```html
<!-- Fade in -->
<div class="animate-fadeIn">

<!-- Slide up -->
<div class="animate-slideUp">

<!-- Scale in -->
<div class="animate-scaleIn">

<!-- Pulse (for badges) -->
<div class="animate-pulse">

<!-- Spin (for loading) -->
<div class="animate-spin">
```

---

## 🔑 Common Props

### Order Object
```typescript
interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: 'pending' | 'processing' | 'in_progress' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  total: number;
  amount_paid: number;
  service_type: string;
  source_language: string;
  target_language: string;
  document_type: string;
  page_count: number;
  word_count: number;
  urgency: 'standard' | 'rush' | 'express';
  assigned_to?: string;
  due_date?: string;
  project_status: string;
  special_instructions?: string;
  internal_notes?: string;
  billing_address?: Address;
  shipping_address?: Address;
  documents?: Document[];
  messages?: Message[];
  activities?: Activity[];
  amendments?: Amendment[];
  refunds?: Refund[];
  created_at: string;
  updated_at: string;
}
```

### Message Object
```typescript
interface Message {
  id: string;
  order_id: string;
  text: string;
  from_customer: boolean;
  is_internal: boolean;
  read: boolean;
  files?: File[];
  created_at: string;
}
```

### Document Object
```typescript
interface Document {
  id: string;
  order_id: string;
  filename: string;
  file_size: number;
  file_url: string;
  type: 'source' | 'delivery';
  analysis_status?: string;
  created_at: string;
}
```

---

## 💡 Common Patterns

### Fetching Order Data
```jsx
const [order, setOrder] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchOrder = async () => {
    try {
      const resp = await fetch(`/api/orders/${orderId}`);
      const data = await resp.json();
      setOrder(data.order);
    } catch (err) {
      console.error('Failed to load order:', err);
    } finally {
      setLoading(false);
    }
  };
  
  fetchOrder();
}, [orderId]);
```

### Updating Order
```jsx
const handleUpdate = async (updates) => {
  try {
    const resp = await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    
    if (!resp.ok) throw new Error('Update failed');
    
    const data = await resp.json();
    setOrder(data.order);
    alert('Changes saved successfully');
  } catch (err) {
    alert('Error: ' + err.message);
  }
};
```

### Sending Message
```jsx
const handleSendMessage = async (text, files, isInternal) => {
  const formData = new FormData();
  formData.append('text', text);
  formData.append('isInternal', isInternal);
  
  if (files) {
    files.forEach((file, idx) => {
      formData.append(`file_${idx}`, file);
    });
  }

  try {
    const resp = await fetch(`/api/orders/${order.id}/messages`, {
      method: 'POST',
      body: formData,
    });
    
    const data = await resp.json();
    setMessages([...messages, data.message]);
  } catch (err) {
    alert('Failed to send message: ' + err.message);
  }
};
```

### Conditional Rendering
```jsx
// Show balance info based on balance state
{balance > 0 && <span className="text-red-600">Balance due</span>}
{balance < 0 && <span className="text-blue-600">Refund due</span>}
{balance === 0 && <span className="text-green-600">Paid in full</span>}
```

---

## 🐛 Debugging Tips

### Check Browser Console
```javascript
// Clear cache if things seem cached
window.location.reload(true);

// Check network tab for API calls
// Look for 400/500 errors in response

// Check order data
console.log('Order:', order);
console.log('Messages:', messages);
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Page not loading | Check `/api/orders/[orderId]` endpoint |
| Chat not appearing | Verify `order.customer_name` is set |
| Edit not saving | Check field is in whitelist in PATCH handler |
| Messages not sending | Check `/api/orders/[orderId]/messages` endpoint |
| Prices not calculating | Verify `order.tax_rate` and totals in DB |
| Animations jerky | Check `prefers-reduced-motion` setting |

---

## �� Responsive Classes

```html
<!-- Hidden on mobile, visible on tablet+ -->
<div class="hidden md:block">

<!-- Hidden on tablet+, visible on mobile -->
<div class="md:hidden">

<!-- Full width on mobile, constrained on desktop -->
<div class="w-full md:w-96">

<!-- Stack on mobile, row on desktop -->
<div class="flex flex-col md:flex-row">

<!-- Adjust padding -->
<div class="px-4 md:px-8">

<!-- Adjust font size -->
<h1 class="text-xl md:text-2xl">
```

---

## 🔍 Accessibility Checklist

### When Adding New Features
- [ ] Add semantic HTML (`<button>`, `<form>`, `<label>`)
- [ ] Add `aria-label` to icon buttons
- [ ] Add `aria-live` to status updates
- [ ] Ensure color contrast 4.5:1
- [ ] Test with keyboard only (Tab, Enter, Escape)
- [ ] Test with screen reader
- [ ] Add focus indicator (outline: 2px solid #3B82F6)
- [ ] Support `prefers-reduced-motion`

### Keyboard Navigation
```jsx
// Close modal with Escape
const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    onClose();
  }
};

// Submit form with Enter
const handleKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
};
```

---

## 📊 Performance Tips

### Optimize Re-renders
```jsx
// Memoize components that don't need to re-render
const MemoizedSection = memo(function Section({ data }) {
  return <div>{data}</div>;
});

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // handler code
}, [dependencies]);
```

### Lazy Load Images
```jsx
// Use next/image for optimization
import Image from 'next/image';

<Image 
  src={url} 
  alt="Description" 
  width={400} 
  height={300}
  loading="lazy"
/>
```

### Code Splitting
```jsx
// Lazy load modals
const EditPricingModal = dynamic(() => 
  import('./modals/EditPricingModal')
);
```

---

## 🧪 Testing Examples

### Test Component Renders
```jsx
import { render } from '@testing-library/react';
import PageHeader from '../PageHeader';

test('renders order number', () => {
  const { getByText } = render(
    <PageHeader order={{ order_number: 'ORD-123' }} />
  );
  expect(getByText('ORD-123')).toBeInTheDocument();
});
```

### Test API Call
```jsx
test('updates order on save', async () => {
  // Mock fetch
  global.fetch = jest.fn(() => 
    Promise.resolve({ ok: true, json: () => ({ order: {} }) })
  );

  // Trigger update
  await handleUpdate({ customer_name: 'John' });

  // Verify API called
  expect(fetch).toHaveBeenCalledWith(
    '/api/orders/123',
    expect.objectContaining({ method: 'PATCH' })
  );
});
```

---

## 📖 Documentation Files

- `ADMIN_ORDER_PAGE_IMPLEMENTATION.md` - Full implementation guide
- `components/admin/order/README.md` - Component documentation
- `DEVELOPER_QUICK_REFERENCE.md` - This file

---

## 🎯 Next Steps

1. **Setup Database** - Create required tables
2. **Test Locally** - Verify all components work
3. **Deploy to Staging** - Test in staging environment
4. **Production Deployment** - Deploy with monitoring
5. **Monitor & Iterate** - Track usage and gather feedback

---

**Last Updated**: 2025
**Version**: 1.0.0
