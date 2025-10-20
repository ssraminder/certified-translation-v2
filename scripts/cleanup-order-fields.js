const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Fields to reset to null
const FIELDS_TO_RESET = [
  'translation_total',
  'certification_total',
  'delivery_total',
  'shipping_total',
  'subtotal',
  'tax_rate',
  'tax_total',
  'total',
  'discount_amount',
  'discount_type',
  'discount_reason',
];

async function cleanupOrders() {
  try {
    console.log('Starting cleanup of order fields...\n');

    // Fetch all orders
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    if (!orders || orders.length === 0) {
      console.log('No orders found to cleanup.');
      return;
    }

    console.log(`Found ${orders.length} orders to cleanup.\n`);

    // Build update object with all fields set to null
    const updateData = {};
    FIELDS_TO_RESET.forEach(field => {
      updateData[field] = null;
    });
    updateData.updated_at = new Date().toISOString();

    // Update all orders
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .not('id', 'is', null)
      .select('id, order_number');

    if (updateError) throw updateError;

    console.log(`✓ Successfully reset fields on ${updated.length} orders\n`);
    console.log('Orders cleaned:');
    updated.forEach(o => {
      console.log(`  - ${o.order_number} (ID: ${o.id})`);
    });

    console.log('\nCleanup complete!');
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  cleanupOrders();
}

module.exports = { cleanupOrders };
