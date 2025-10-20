#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function backfillOrderProjectInfo() {
  console.log('Starting backfill of project information for existing orders...\n');

  try {
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, quote_id, source_language, target_language')
      .not('quote_id', 'is', null);

    if (ordersError) throw ordersError;

    if (!orders || orders.length === 0) {
      console.log('No orders with associated quotes found.');
      return;
    }

    console.log(`Found ${orders.length} orders with associated quotes.\n`);

    let processed = 0;
    let updated = 0;
    let skipped = 0;

    for (const order of orders) {
      processed++;
      const { id: orderId, quote_id: quoteId } = order;

      try {
        const { data: quoteSubmission, error: subError } = await supabase
          .from('quote_submissions')
          .select('source_lang, target_lang, delivery_option, delivery_date')
          .eq('quote_id', quoteId)
          .maybeSingle();

        if (subError) throw subError;
        if (!quoteSubmission) {
          console.log(`[${processed}/${orders.length}] ⚠️  Order ${orderId}: Quote not found (quote_id: ${quoteId})`);
          skipped++;
          continue;
        }

        const { data: lineItems, error: lineError } = await supabase
          .from('quote_sub_orders')
          .select('billable_pages, doc_type')
          .eq('quote_id', quoteId);

        if (lineError) throw lineError;

        const totalPages = (lineItems || []).reduce((sum, item) => sum + (item.billable_pages || 0), 0);
        const documentType = lineItems && lineItems.length > 0 ? (lineItems[0].doc_type || null) : null;

        // page_count should be an integer, so round it if needed
        const pageCount = totalPages > 0 ? Math.round(totalPages) : null;

        const updateData = {
          source_language: quoteSubmission.source_lang || null,
          target_language: quoteSubmission.target_lang || null,
          document_type: documentType,
          page_count: pageCount,
          urgency: quoteSubmission.delivery_option || null,
          due_date: quoteSubmission.delivery_date || null,
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId);

        if (updateError) throw updateError;

        console.log(`[${processed}/${orders.length}] ✅ Order ${orderId}: Updated successfully`);
        updated++;
      } catch (error) {
        console.log(`[${processed}/${orders.length}] ❌ Order ${orderId}: Error - ${error.message}`);
        skipped++;
      }
    }

    console.log(`\n✨ Backfill completed:`);
    console.log(`   Total processed: ${processed}`);
    console.log(`   Successfully updated: ${updated}`);
    console.log(`   Skipped/Failed: ${skipped}`);
  } catch (error) {
    console.error('Fatal error during backfill:', error.message);
    process.exit(1);
  }
}

backfillOrderProjectInfo();
