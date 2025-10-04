import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';

function getQueryParams() {
  if (typeof window === 'undefined') return { quote: null, job: null };
  const params = new URLSearchParams(window.location.search);
  return { quote: params.get('quote'), job: params.get('job') };
}

function classNames(...arr) { return arr.filter(Boolean).join(' '); }

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatCutoffTime(timeString) {
  if (!timeString) return '6:00 PM';
  const [hRaw, mRaw = '00'] = String(timeString).split(':');
  let h = Math.max(0, Math.min(23, parseInt(hRaw, 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt(mRaw, 10) || 0));
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHours = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${displayHours}:${String(m).padStart(2, '0')} ${period}`;
}

function getTodayInEdmonton(edmontonTimezone = 'America/Edmonton') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: edmontonTimezone,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value || '1970';
  const m = parts.find(p => p.type === 'month')?.value || '01';
  const d = parts.find(p => p.type === 'day')?.value || '01';
  return `${y}-${m}-${d}`;
}

function isTodayWeekendInEdmonton(edmontonTimezone = 'America/Edmonton') {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: edmontonTimezone,
    weekday: 'short'
  }).format(new Date());
  return weekday === 'Sat' || weekday === 'Sun';
}

function isBeforeCutoff(cutoffTimeString, edmontonTimezone = 'America/Edmonton') {
  try {
    if (!cutoffTimeString) return true;
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: edmontonTimezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).formatToParts(now);
    const y = parseInt(parts.find(p => p.type === 'year')?.value || '1970', 10);
    const mo = parseInt(parts.find(p => p.type === 'month')?.value || '01', 10);
    const d = parseInt(parts.find(p => p.type === 'day')?.value || '01', 10);
    const [cH = 0, cM = 0, cS = 0] = String(cutoffTimeString).split(':').map(n => parseInt(n, 10) || 0);
    const edmontonNow = new Date(Date.UTC(y, mo - 1, d));
    // Build a date string for Edmonton today at cutoff time and compare via time strings in that TZ
    const edmontonNowStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: edmontonTimezone,
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(now);
    const [nH = 0, nM = 0, nS = 0] = edmontonNowStr.split(':').map(n => parseInt(n, 10) || 0);
    if (nH < cH) return true;
    if (nH > cH) return false;
    if (nM < cM) return true;
    if (nM > cM) return false;
    return nS < cS;
  } catch (e) {
    return false;
  }
}

function calculateBusinessDaysFromToday(days, edmontonTimezone = 'America/Edmonton', holidays = []) {
  const hol = new Set((holidays || []).map(String));
  // Start from Edmonton "today"
  let current = new Date(new Date().toLocaleString('en-US', { timeZone: edmontonTimezone }));
  let added = 0;
  while (added < days) {
    current.setDate(current.getDate() + 1);
    const asEdmonton = new Date(current.toLocaleString('en-US', { timeZone: edmontonTimezone }));
    const dow = asEdmonton.getDay();
    const iso = toISODate(asEdmonton);
    if (dow !== 0 && dow !== 6 && !hol.has(iso)) {
      added++;
    }
  }
  const finalAsEdmonton = new Date(current.toLocaleString('en-US', { timeZone: edmontonTimezone }));
  return toISODate(finalAsEdmonton);
}

function formatDate(dateStr, timezone) {
  try {
    const dt = new Date(`${dateStr}T12:00:00Z`);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'America/Edmonton',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }).format(dt);
  } catch {
    return dateStr;
  }
}

async function fetchHolidays() {
  try {
    const { data, error } = await supabase.from('holidays').select('date').order('date');
    if (error) throw error;
    const arr = (data || []).map(r => r.date).filter(Boolean);
    if (arr.length > 0) return arr;
  } catch {}
  return [
    '2025-01-01', '2025-04-18', '2025-05-19',
    '2025-07-01', '2025-09-01', '2025-10-13',
    '2025-12-25', '2025-12-26'
  ];
}

async function fetchSettings() {
  // Try new columns first, fall back to older naming if needed
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('order_cutoff_time, same_day_cutoff_time, timezone')
      .single();
    if (error) throw error;
    return data || { order_cutoff_time: '18:00:00', same_day_cutoff_time: '14:00:00', timezone: 'America/Edmonton' };
  } catch {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('same_day_cutoff_local_time, timezone')
        .single();
      const sameDay = data?.same_day_cutoff_local_time || '14:00:00';
      return { order_cutoff_time: '18:00:00', same_day_cutoff_time: sameDay, timezone: data?.timezone || 'America/Edmonton' };
    } catch {
      return { order_cutoff_time: '18:00:00', same_day_cutoff_time: '14:00:00', timezone: 'America/Edmonton' };
    }
  }
}

async function fetchDeliveryOptions() {
  const { data } = await supabase
    .from('delivery_options')
    .select('id, delivery_type, base_business_days, addl_business_days, addl_business_days_per_pages, is_expedited, is_same_day, price_modifier_percent, active, display_order')
    .eq('active', true)
    .order('display_order');
  return data || [];
}

async function fetchQuoteSummary(quoteId) {
  const { data } = await supabase
    .from('quote_submissions')
    .select('job_id, source_lang, target_lang, intended_use')
    .eq('quote_id', quoteId)
    .single();
  return data || null;
}

async function fetchBillableItems(quoteId) {
  // Prefer OCR analysis items for detailed doc_type and filename
  try {
    const { data: items1, error: e1 } = await supabase
      .from('ocr_analysis_items')
      .select('quote_id, filename, doc_type, billable_pages')
      .eq('quote_id', quoteId);
    if (!e1 && items1 && items1.length > 0) return items1.map(i => ({
      quote_id: i.quote_id,
      filename: i.filename,
      doc_type: i.doc_type,
      billable_pages: Number(i.billable_pages) || 0
    }));
  } catch {}
  // Fall back to summary count
  try {
    const { data: item2 } = await supabase
      .from('ocr_analysis')
      .select('billable_pages')
      .eq('quote_id', quoteId)
      .maybeSingle();
    if (item2 && typeof item2.billable_pages !== 'undefined') return [{ quote_id: quoteId, filename: null, doc_type: null, billable_pages: Number(item2.billable_pages) || 0 }];
  } catch {}
  // Fall back to files.pages if available
  try {
    const { data: items3 } = await supabase
      .from('quote_files')
      .select('filename, pages')
      .eq('quote_id', quoteId);
    if (items3 && items3.length > 0 && typeof items3[0].pages !== 'undefined') {
      return items3.map(i => ({ quote_id: quoteId, filename: i.filename, doc_type: null, billable_pages: Number(i.pages) || 0 }));
    }
  } catch {}
  // Final fallback
  return [{ quote_id: quoteId, filename: null, doc_type: null, billable_pages: 2 }];
}

async function checkSameDayEligibility(quoteId, items) {
  try {
    const totalPages = (items || []).reduce((sum, item) => sum + (Number(item.billable_pages) || 0), 0);
    if (totalPages !== 1) return false;

    const settings = await fetchSettings();
    const tz = settings?.timezone || 'America/Edmonton';

    const beforeSameDayCutoff = isBeforeCutoff(settings.same_day_cutoff_time || '14:00:00', tz);
    if (!beforeSameDayCutoff) return false;

    if (isTodayWeekendInEdmonton(tz)) return false;

    const today = getTodayInEdmonton(tz);
    const holidays = await fetchHolidays();
    if (holidays.includes(today)) return false;

    // Verify qualification by country/doc type
    const { data: files } = await supabase
      .from('quote_files')
      .select('filename, country_of_issue')
      .eq('quote_id', quoteId);

    if (!files || files.length === 0) return false;

    for (const item of (items || [])) {
      const file = files.find(f => !item.filename || f.filename === item.filename);
      const country = file?.country_of_issue || null;
      const docType = item?.doc_type || null;
      if (!country || !docType) return false;
      const { data: qualifiers } = await supabase
        .from('same_day_qualifiers')
        .select('id')
        .eq('active', true)
        .eq('country', country)
        .ilike('doc_type', `%${docType}%`);
      if (!qualifiers || qualifiers.length === 0) return false;
    }

    return true;
  } catch {
    return false;
  }
}

function calculateBusinessDaysNeeded(totalPages, baseDays, addlDays, addlPagesPerDay) {
  const additionalPages = Math.max(0, (Number(totalPages) || 0) - 2);
  const per = Math.max(1, Number(addlPagesPerDay) || 1);
  const addlBlocks = Math.ceil(additionalPages / per);
  return (Number(baseDays) || 0) + addlBlocks * (Number(addlDays) || 0);
}

async function calculateAllDeliveryDates(quoteId, items, holidays) {
  const [settings, deliveryOptions] = await Promise.all([
    fetchSettings(),
    fetchDeliveryOptions()
  ]);

  const tz = settings?.timezone || 'America/Edmonton';
  const totalPages = (items || []).reduce((sum, item) => sum + (Number(item.billable_pages) || 0), 0);
  const dates = {};

  const afterOrderCutoff = !isBeforeCutoff(settings.order_cutoff_time || '18:00:00', tz);

  const standardOption = deliveryOptions.find(opt => opt.delivery_type === 'standard' || (!opt.is_expedited && !opt.is_same_day));
  if (standardOption) {
    const needed = calculateBusinessDaysNeeded(totalPages, standardOption.base_business_days, standardOption.addl_business_days, standardOption.addl_business_days_per_pages);
    const adjusted = afterOrderCutoff ? needed + 1 : needed;
    dates.standard = {
      date: calculateBusinessDaysFromToday(adjusted, tz, holidays),
      label: 'Standard Delivery',
      price: 'Free',
      modifier: 0
    };
  }

  const expeditedOption = deliveryOptions.find(opt => opt.delivery_type === 'expedited' || (opt.is_expedited && !opt.is_same_day));
  if (expeditedOption) {
    const needed = calculateBusinessDaysNeeded(totalPages, expeditedOption.base_business_days, expeditedOption.addl_business_days, expeditedOption.addl_business_days_per_pages);
    const adjusted = afterOrderCutoff ? needed + 1 : needed;
    const pct = Number(expeditedOption.price_modifier_percent) || 40;
    dates.expedited = {
      date: calculateBusinessDaysFromToday(adjusted, tz, holidays),
      label: 'Expedited Delivery',
      price: `+${pct}%`,
      modifier: pct / 100
    };
  }

  const eligible = await checkSameDayEligibility(quoteId, items);
  if (eligible) {
    dates.sameDay = {
      date: getTodayInEdmonton(tz),
      time: formatCutoffTime(settings.same_day_cutoff_time || '14:00:00'),
      label: `Today by ${formatCutoffTime(settings.same_day_cutoff_time || '14:00:00')} MST`,
      price: '+100%',
      modifier: 1
    };
  }

  return { dates, settings, totalPages };
}

export default function Step3() {
  const [{ quote, job }, setParams] = useState({ quote: null, job: null });
  const [quoteData, setQuoteData] = useState(null);
  const [deliveryDates, setDeliveryDates] = useState(null);
  const [timezone, setTimezone] = useState('America/Edmonton');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalPages, setTotalPages] = useState(null);

  useEffect(() => { setParams(getQueryParams()); }, []);

  useEffect(() => {
    if (!quote) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const [summary, items, holidays] = await Promise.all([
          fetchQuoteSummary(quote),
          fetchBillableItems(quote),
          fetchHolidays()
        ]);
        if (cancelled) return;
        setQuoteData(summary);
        const { dates, settings, totalPages } = await calculateAllDeliveryDates(quote, items, holidays);
        if (cancelled) return;
        setDeliveryDates(dates);
        setTimezone(settings?.timezone || 'America/Edmonton');
        setTotalPages(totalPages);
      } catch (e) {
        if (!cancelled) setError('Failed to load quote.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [quote]);

  const canContinue = useMemo(() => !!deliveryDates && !!deliveryDates.standard, [deliveryDates]);

  return (
    <>
      <Head>
        <title>Step 3 - Quote Review</title>
      </Head>
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="mb-4 text-sm font-medium text-gray-600">Order ID: {quoteData?.job_id || job || ''}</div>

          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">Loading your quote...</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {quoteData && deliveryDates && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <p className="font-semibold text-lg">Order ID: {quoteData.job_id || job}</p>
              <p className="text-gray-700">
                {quoteData.source_lang} → {quoteData.target_lang} | {quoteData.intended_use}
              </p>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Standard Delivery</p>
                <p className="text-lg font-semibold text-gray-900">📅 {formatDate(deliveryDates.standard.date, timezone)}</p>
                <p className="text-sm text-green-600 font-medium">Free</p>
              </div>

              <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">⚡ Faster options available:</p>

                {deliveryDates.expedited && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-700">🚀 Expedited: {formatDate(deliveryDates.expedited.date, timezone)}</span>
                    <span className="text-sm font-medium text-cyan-600">{deliveryDates.expedited.price}</span>
                  </div>
                )}

                {deliveryDates.sameDay && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-700">⚡ Same-day: {deliveryDates.sameDay.label}</span>
                    <span className="text-sm font-medium text-cyan-600">{deliveryDates.sameDay.price}</span>
                  </div>
                )}

                {!deliveryDates.sameDay && totalPages === 1 && (
                  <p className="text-xs text-gray-400 italic mt-1">Same-day available for orders placed before 2 PM MST</p>
                )}

                <p className="text-xs text-gray-500 mt-2">→ Choose your delivery speed at checkout</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              suppressHydrationWarning
              onClick={() => { window.location.href = `/order/step-2?quote=${quote || ''}&job=${job || ''}`; }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
            >
              Back
            </button>
            <button
              suppressHydrationWarning
              disabled={!canContinue}
              onClick={() => { window.location.href = `/order/step-4?quote=${quote || ''}&job=${job || ''}`; }}
              className={classNames('px-4 py-2 rounded-lg text-white', canContinue ? 'bg-blue-600' : 'bg-gray-400 cursor-not-allowed')}
            >
              Continue to Checkout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
