const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ogxklbdjffbhtlabwonl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9neGtsYmRqZmZiaHRsYWJ3b25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODcyOTk4NSwiZXhwIjoyMDc0MzA1OTg1fQ.0r8xrof4SFQ8VzNa-ipR1-_3qXJ6L7m2Py_DGEhdDHI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function queryOrderDetails() {
  try {
    const orderNumber = 'ORD-2025-000025';
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 QUERYING ORDER: ${orderNumber}`);
    console.log(`${'='.repeat(80)}\n`);

    // Get the order
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .ilike('order_number', `%${orderNumber}%`);

    if (orderError) {
      console.error('❌ Error fetching order:', orderError.message);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log(`❌ No order found with number ${orderNumber}`);
      return;
    }

    const order = orders[0];
    const orderId = order.id;
    const quoteId = order.quote_id;

    console.log('✅ ORDER FOUND');
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Order Number: ${order.order_number}`);
    console.log(`   Associated Quote ID: ${quoteId}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Payment Status: ${order.payment_status}`);
    console.log(`   Total Amount: CAD $${order.total}`);
    console.log(`   Customer Email: ${order.customer_email}`);
    console.log(`   Created: ${new Date(order.created_at).toLocaleString()}`);

    // Get quote files
    console.log('\n' + '-'.repeat(80));
    console.log('📄 QUOTE FILES');
    console.log('-'.repeat(80));

    const { data: quoteFiles, error: filesError } = await supabase
      .from('quote_files')
      .select('*')
      .eq('quote_id', quoteId);

    if (filesError) {
      console.log(`⚠️  Cannot retrieve quote files: ${filesError.message}`);
    } else if (quoteFiles && quoteFiles.length > 0) {
      console.log(`✅ Found ${quoteFiles.length} file(s) for quote:\n`);
      quoteFiles.forEach((file, idx) => {
        console.log(`   [${idx + 1}] ${file.filename}`);
        console.log(`       ID: ${file.file_id}`);
        console.log(`       Purpose: ${file.file_purpose}`);
        console.log(`       Status: ${file.status}`);
        console.log(`       Size: ${file.bytes} bytes`);
      });
    } else {
      console.log('ℹ️  No quote files found in database');
    }

    // Get order documents
    console.log('\n' + '-'.repeat(80));
    console.log('📑 ORDER DOCUMENTS');
    console.log('-'.repeat(80));

    const { data: orderDocs, error: docsError } = await supabase
      .from('quote_files')
      .select('*')
      .eq('order_id', orderId);

    if (docsError) {
      console.log(`⚠️  Cannot retrieve order documents: ${docsError.message}`);
    } else if (orderDocs && orderDocs.length > 0) {
      console.log(`✅ Found ${orderDocs.length} document(s) for order:\n`);
      orderDocs.forEach((doc, idx) => {
        console.log(`   [${idx + 1}] ${doc.filename}`);
        console.log(`       ID: ${doc.file_id}`);
        console.log(`       Purpose: ${doc.file_purpose}`);
        console.log(`       Status: ${doc.status}`);
      });
    } else {
      console.log('ℹ️  No order documents found in database');
    }

    // Get billing address
    console.log('\n' + '-'.repeat(80));
    console.log('📮 BILLING ADDRESS');
    console.log('-'.repeat(80));

    if (order.billing_address_id) {
      const { data: billingAddr, error: addrError } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', order.billing_address_id)
        .single();

      if (addrError) {
        console.log(`⚠️  Cannot retrieve billing address: ${addrError.message}`);
      } else if (billingAddr) {
        console.log(`✅ Billing Address Found:`);
        console.log(`   ${billingAddr.street_address || ''}`);
        console.log(`   ${billingAddr.city || ''}, ${billingAddr.state || ''} ${billingAddr.postal_code || ''}`);
        console.log(`   ${billingAddr.country || ''}`);
      }
    } else {
      console.log('ℹ️  No billing address associated with order');
    }

    // Check for project information
    console.log('\n' + '-'.repeat(80));
    console.log('📊 PROJECT INFORMATION');
    console.log('-'.repeat(80));

    const projectFields = {
      'Service Type': 'service_type',
      'Source Language': 'source_language',
      'Target Language': 'target_language',
      'Document Type': 'document_type',
      'Page Count': 'page_count',
      'Word Count': 'word_count',
      'Urgency': 'urgency',
      'Due Date': 'due_date',
      'Project Status': 'project_status',
      'Special Instructions': 'special_instructions',
      'Internal Notes': 'internal_notes',
      'Analysis Data': 'analysis_data',
      'Amendments': 'amendments'
    };

    let projectDataFound = false;
    for (const [label, field] of Object.entries(projectFields)) {
      if (order[field] !== null && order[field] !== undefined) {
        console.log(`✅ ${label}: ${JSON.stringify(order[field])}`);
        projectDataFound = true;
      }
    }

    if (!projectDataFound) {
      console.log('⚠️  No project information stored in order record');
      console.log('ℹ️  Project details may be in the associated quote (check quote files)');
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📌 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Order Status: ${order.status === 'paid' ? '✅ PAID' : order.status}`);
    console.log(`Quote ID: ${quoteId}`);
    console.log(`Project Info in DB: ${projectDataFound ? '✅ YES' : '❌ NO (stored elsewhere)'}`);
    console.log(`Quote Files: ${quoteFiles && quoteFiles.length > 0 ? `✅ YES (${quoteFiles.length} files)` : '❌ NO'}`);
    console.log(`Order Documents: ${orderDocs && orderDocs.length > 0 ? `✅ YES (${orderDocs.length} files)` : '❌ NO'}`);
    console.log('='.repeat(80) + '\n');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err);
  }
}

queryOrderDetails();
