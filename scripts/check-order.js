const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrder() {
  try {
    console.log('🔍 Searching for order ORD-2025-000025...\n');

    // Query the orders table
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .ilike('order_number', '%ORD-2025-000025%');

    if (ordersError) {
      console.error('❌ Error fetching order:', ordersError);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('❌ No order found with number ORD-2025-000025');
      return;
    }

    const order = orders[0];
    console.log('✅ Order Found!');
    console.log('\n📋 Order Details:');
    console.log(`  Order ID: ${order.id}`);
    console.log(`  Order Number: ${order.order_number}`);
    console.log(`  Quote ID: ${order.quote_id || 'N/A'}`);
    console.log(`  Status: ${order.status}`);
    console.log(`  Payment Status: ${order.payment_status}`);
    console.log(`  Customer Email: ${order.customer_email}`);
    console.log(`  Customer Phone: ${order.customer_phone}`);
    console.log(`  Total: ${order.total}`);
    console.log(`  Created At: ${order.created_at}`);

    // Check if project information is available in the order
    console.log('\n📊 Project Information in Order:');
    const projectFields = [
      'service_type',
      'source_language',
      'target_language',
      'document_type',
      'page_count',
      'word_count',
      'urgency',
      'due_date',
      'project_status',
      'special_instructions',
      'internal_notes',
      'analysis_data',
      'amendments'
    ];

    projectFields.forEach(field => {
      if (order[field] !== null && order[field] !== undefined) {
        console.log(`  ${field}: ${JSON.stringify(order[field])}`);
      }
    });

    // If there's a quote_id, fetch the associated quote
    if (order.quote_id) {
      console.log('\n🔗 Fetching Associated Quote...');
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', order.quote_id)
        .single();

      if (quoteError) {
        console.error('❌ Error fetching quote:', quoteError);
      } else if (quote) {
        console.log('✅ Quote Found!');
        console.log(`  Quote ID: ${quote.id}`);
        console.log(`  Status: ${quote.status}`);
        console.log(`  User ID: ${quote.user_id}`);
        console.log(`  Created At: ${quote.created_at}`);
      }
    } else {
      console.log('\n⚠️ No quote_id associated with this order');
    }

    console.log('\n✨ Full Order Object:');
    console.log(JSON.stringify(order, null, 2));

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

checkOrder();
