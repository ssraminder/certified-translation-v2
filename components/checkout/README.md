# Checkout Components Guide

Reusable components for quote and order checkout flows.

## Components

### AddressDisplay

Displays formatted address information with optional contact details.

**Import:**
```jsx
import AddressDisplay from './checkout/AddressDisplay';
```

**Basic Usage:**
```jsx
<AddressDisplay address={address} />
```

**With Contact Info:**
```jsx
<AddressDisplay 
  address={order.billing_address} 
  showEmail 
  showPhone 
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `address` | Object | Required | Address object with full_name, address_line1, city, etc. |
| `showEmail` | Boolean | false | Display email with icon |
| `showPhone` | Boolean | false | Display formatted phone number with icon |

**Expected Address Object:**
```js
{
  full_name: string,
  email?: string,
  phone?: string,
  address_line1: string,
  address_line2?: string,
  city: string,
  province_state: string,
  postal_code: string,
  country: string
}
```

---

### OrderSummaryCard

Card displaying order/quote summary with documents and translation details.

**Import:**
```jsx
import OrderSummaryCard from './checkout/OrderSummaryCard';
```

**Usage:**
```jsx
<OrderSummaryCard order={order} quote={quote} />
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `order` | Object | Required | Order object (must have documents array) |
| `quote` | Object | undefined | Quote details (optional, uses order.quote if not provided) |

**Features:**
- ✅ Displays Order ID
- ✅ Shows translation language pair
- ✅ Lists documents with file sizes
- ✅ Shows intended use/purpose
- ✅ Responsive design
- ✅ Document icons with truncated filenames

**Expected Order Object:**
```js
{
  order_number: string,
  id: string,
  quote_id?: string,
  documents: [
    {
      filename: string,
      bytes: number,
      content_type?: string
    }
  ],
  quote?: {
    source_lang: string,
    target_lang: string,
    intended_use: string
  }
}
```

---

### PricingBreakdown

Itemized pricing display with subtotal, shipping, tax, and total.

**Import:**
```jsx
import PricingBreakdown from './checkout/PricingBreakdown';
```

**Basic Usage:**
```jsx
<PricingBreakdown 
  subtotal={100}
  shipping={10}
  taxRate={0.05}
/>
```

**With Options:**
```jsx
<PricingBreakdown 
  subtotal={94.50}
  shipping={4.55}
  taxRate={0.05}
  showShipping={true}
  showDetails={true}
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `subtotal` | Number | 0 | Subtotal before shipping and tax |
| `shipping` | Number | 0 | Shipping cost |
| `taxRate` | Number | 0.05 | Tax rate as decimal (0.05 = 5%) |
| `showShipping` | Boolean | true | Show shipping line item |
| `showDetails` | Boolean | true | Show subtotal and tax breakdown |

**Display:**
- Subtotal (optional)
- Shipping (optional)
- Subtotal + Shipping
- Tax calculation
- **Final Total** (bold, large)

---

### ShippingMethodSelector

Radio button selector for shipping method options with pricing and details.

**Import:**
```jsx
import ShippingMethodSelector from './checkout/ShippingMethodSelector';
```

**Usage:**
```jsx
<ShippingMethodSelector 
  options={shippingOptions}
  selectedId={selectedShipping}
  onSelect={setSelectedShipping}
/>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | Array | [] | Array of shipping option objects |
| `selectedId` | String\|Number | undefined | Currently selected option ID |
| `onSelect` | Function | Required | Callback: `(id) => void` |
| `requiresAddress` | Boolean | false | Future use for address validation |

**Expected Option Object:**
```js
{
  id: string | number,
  name: string,
  price: number,
  description?: string,
  delivery_time?: string,
  is_active: boolean,
  is_always_selected?: boolean,
  require_shipping_address?: boolean
}
```

**Features:**
- ✅ Always-selected options highlighted in blue
- ✅ Optional methods with radio buttons
- ✅ Unavailable options shown with strikethrough
- ✅ Price display (FREE for $0)
- ✅ Delivery time and description
- ✅ Responsive layout

---

## Utilities

### checkoutUtils.js

Validation, formatting, and helper functions.

**Import:**
```jsx
import {
  validateEmail,
  validatePhone,
  validateAddress,
  validateBillingAddress,
  formatCurrency,
  round2,
  formatBytes,
  updateAddressField,
  GST_RATE,
  DEFAULT_COUNTRY
} from '../lib/checkoutUtils';
```

### Validation Functions

**validateEmail(email)**
- Returns: `Boolean`
- Pattern: `.+@.+\..+`

```jsx
if (!validateEmail(email)) {
  throw new Error('Invalid email');
}
```

**validatePhone(phone, country)**
- Returns: `Boolean`
- Uses libphonenumber-js validation

```jsx
if (!validatePhone(phone, 'Canada')) {
  throw new Error('Invalid phone');
}
```

**validateAddress(address, country)**
- Returns: `Boolean`
- Checks: full_name, address_line1, city, province_state, postal_code, country

```jsx
if (!validateAddress(billing)) {
  throw new Error('Incomplete address');
}
```

**validateBillingAddress(address)**
- Returns: `Boolean`
- Validates address + email + phone

```jsx
if (!validateBillingAddress(billing)) {
  throw new Error('Invalid billing address');
}
```

### Formatting Functions

**formatCurrency(value)**
- Returns: `String` (e.g., "$99.23")
- Format: en-CA, CAD currency

```jsx
<div>${formatCurrency(99.23)}</div>
```

**round2(value)**
- Returns: `Number`
- Rounds to 2 decimal places

```jsx
const tax = round2(subtotal * 0.05);
```

**formatBytes(bytes)**
- Returns: `String` (e.g., "2.3 MB", "512 KB")

```jsx
<span>{formatBytes(2400000)}</span> // "2.3 MB"
```

### Helper Functions

**updateAddressField(setter, key, value)**
- Updates form state for address object

```jsx
function updateField(key, value) {
  updateAddressField(setBilling, key, value);
}
```

### Constants

```jsx
GST_RATE        // 0.05 (5%)
DEFAULT_COUNTRY // 'Canada'
```

---

## Examples

### Complete Quote Checkout Form

```jsx
import { useState } from 'react';
import ShippingMethodSelector from './checkout/ShippingMethodSelector';
import PricingBreakdown from './checkout/PricingBreakdown';
import { validateBillingAddress } from '../lib/checkoutUtils';

export default function QuoteCheckout() {
  const [billing, setBilling] = useState({...});
  const [shipping, setShipping] = useState({...});
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [shippingOptions, setShippingOptions] = useState([]);

  const handleSubmit = () => {
    if (!validateBillingAddress(billing)) {
      throw new Error('Invalid billing address');
    }
    // Create order...
  };

  return (
    <div className="grid grid-cols-3">
      <div className="col-span-2">
        {/* Address forms... */}
        <ShippingMethodSelector
          options={shippingOptions}
          selectedId={selectedShipping}
          onSelect={setSelectedShipping}
        />
      </div>
      <div>
        <PricingBreakdown
          subtotal={100}
          shipping={5}
          taxRate={0.05}
        />
        <button onClick={handleSubmit}>Continue</button>
      </div>
    </div>
  );
}
```

### Complete Order Checkout Page

```jsx
import OrderSummaryCard from './checkout/OrderSummaryCard';
import AddressDisplay from './checkout/AddressDisplay';
import PricingBreakdown from './checkout/PricingBreakdown';

export default function Checkout({ order }) {
  return (
    <div className="grid grid-cols-3">
      <div className="col-span-2">
        <OrderSummaryCard order={order} />
        
        <div>
          <h3>Billing Address</h3>
          <AddressDisplay 
            address={order.billing_address} 
            showEmail 
            showPhone 
          />
        </div>
        
        <div>
          <h3>Shipping Address</h3>
          <AddressDisplay 
            address={order.shipping_address} 
          />
        </div>
      </div>
      <div>
        <PricingBreakdown
          subtotal={order.subtotal}
          shipping={order.shipping_total}
          taxRate={order.tax_rate}
        />
      </div>
    </div>
  );
}
```

---

## Styling

All components use **Tailwind CSS** classes and follow this design system:

- **Primary Color:** `blue-600` (#2563EB)
- **Text:** `gray-900` (dark), `gray-600` (secondary)
- **Borders:** `gray-200`, `gray-300`
- **Background:** `gray-50`, `white`, `blue-50`
- **Spacing:** Consistent 6px-8px gaps
- **Shadows:** `shadow-sm` for cards

Components are fully responsive with:
- Mobile-first design
- `md:` breakpoints for tablets
- `lg:` breakpoints for desktops
- Flex and grid layouts

---

## Development

### Testing Components

```jsx
import { render, screen } from '@testing-library/react';
import AddressDisplay from './AddressDisplay';

test('displays address with email', () => {
  const address = {
    full_name: 'John Doe',
    email: 'john@example.com',
    address_line1: '123 Main St',
    city: 'Toronto',
    province_state: 'ON',
    postal_code: 'M5V 3A8',
    country: 'Canada'
  };
  
  render(<AddressDisplay address={address} showEmail />);
  expect(screen.getByText('john@example.com')).toBeInTheDocument();
});
```

### Extending Components

To extend functionality, create new components that **compose** these:

```jsx
import AddressDisplay from './AddressDisplay';

export default function EditableAddressDisplay({ address, onEdit }) {
  return (
    <div>
      <AddressDisplay address={address} showEmail showPhone />
      <button onClick={onEdit}>Edit</button>
    </div>
  );
}
```

---

## Common Issues

### Address Not Displaying
- Ensure `address` prop is provided
- Check object has `full_name`, `address_line1`, `city`, `province_state`, `postal_code`, `country`

### Pricing Shows Incorrect Tax
- Verify `taxRate` is decimal (0.05, not 5)
- Check `subtotal` includes everything except tax

### Shipping Method Not Selectable
- Verify `options` array is populated
- Check `is_active: true` on selectable options
- Ensure `onSelect` callback is provided

---

## Related Files

- `lib/checkoutUtils.js` - Utilities
- `pages/quote-checkout.js` - Quote checkout page
- `pages/checkout.js` - Order payment page
- `CHECKOUT_REFACTORING.md` - Refactoring summary
