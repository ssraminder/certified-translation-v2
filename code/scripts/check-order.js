const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ogxklbdjffbhtlabwonl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9neGtsYmRqZmZiaHRsYWJ3b25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODcyOTk4NSwiZXhwIjoyMDc0MzA1OTg1fQ.0r8xrof4SFQ8VzNa-ipR1-_3qXJ6L7m2Py_DGEhdDHI';

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

    const projectInfo = {};
    projectFields.forEach(field => {
      if (order[field] !== null && order[field] !== undefined) {
        projectInfo[field] = order[field];
      }
    });

    if (Object.keys(projectInfo).length === 0) {
      console.log('  ⚠️ No project information stored in order table');
    } else {
      Object.entries(projectInfo).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      });
    }

    // If there's a quote_id, fetch related information
    if (order.quote_id) {
      console.log('\n🔗 Fetching Quote-Related Data...');
      
      // Try to get quote files
      const { data: quoteFiles, error: filesError } = await supabase
        .from('quote_files')
        .select('*')
        .eq('quote_id', order.quote_id);

      if (filesError) {
        console.error('  ❌ Error fetching quote files:', filesError.message);
      } else if (quoteFiles && quoteFiles.length > 0) {
        console.log(`  ✅ Found ${quoteFiles.length} quote file(s):`);
        quoteFiles.forEach((file, idx) => {
          console.log(`    [${idx + 1}] Filename: ${file.filename}`);
          console.log(`        File ID: ${file.file_id}`);
          console.log(`        Purpose: ${file.file_purpose}`);
          console.log(`        Status: ${file.status}`);
        });
      } else {
        console.log('  ℹ️ No quote files found');
      }

      // Try to get order documents
      const { data: orderDocs, error: docsError } = await supabase
        .from('quote_files')
        .select('*')
        .eq('order_id', order.id);

      if (docsError) {
        console.error('  ❌ Error fetching order documents:', docsError.message);
      } else if (orderDocs && orderDocs.length > 0) {
        console.log(`\n  ✅ Found ${orderDocs.length} order document(s):`);
        orderDocs.forEach((doc, idx) => {
          console.log(`    [${idx + 1}] Filename: ${doc.filename}`);
          console.log(`        File ID: ${doc.file_id}`);
          console.log(`        Purpose: ${doc.file_purpose}`);
        });
      }
    } else {
      console.log('\n⚠️ No quote_id associated with this order');
    }

    console.log('\n' + '='.repeat(80));
    console.log('Full Order Data:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(order, null, 2));

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

checkOrder();
