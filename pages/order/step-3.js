import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';

function getQueryParams() {
  if (typeof window === 'undefined') return { quote: null, job: null };
  const params = new URLSearchParams(window.location.search);
  return { quote: params.get('quote'), job: params.get('job') };
}

function classNames(...arr) { return arr.filter(Boolean).join(' '); }

function parseCutoffTime(timeString) {
  if (!timeString || typeof timeString !== 'string') return { hours: 18, minutes: 0 };
  const str = timeString.trim();
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10) || 0;
    const ampm = ampmMatch[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return { hours: h, minutes: m };
  }
  const parts = str.split(':').map(s => s.trim());
  if (parts.length >= 2) {
    const h = Math.max(0, Math.min(23, parseInt(parts[0], 10) || 0));
    const m = Math.max(0, Math.min(59, parseInt(parts[1], 10) || 0));
    return { hours: h, minutes: m };
  }
  const onlyHour = parseInt(str, 10);
  if (Number.isFinite(onlyHour)) {
    return { hours: Math.max(0, Math.min(23, onlyHour)), minutes: 0 };
  }
  return { hours: 18, minutes: 0 };
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calculateBusinessDays(days, holidays, startDate) {
  const hol = new Set((holidays || []).map(x => String(x)));
  const currentDate = new Date(startDate || new Date());
  let addedDays = 0;
  while (addedDays < days) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dow = currentDate.getDay();
    const ds = toISODate(currentDate);
    if (dow !== 0 && dow !== 6 && !hol.has(ds)) {
      addedDays++;
    }
  }
  return toISODate(currentDate);
}

function formatDate(dateStr, timezone) {
  try {
    const date = new Date(dateStr);
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || undefined,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return fmt.format(date);
  } catch {
    return dateStr;
  }
}

async function fetchHolidays() {
  try {
    const { data, error } = await supabase.from('holidays').select('date').order('date');
    if (error) return [
      '2025-01-01', '2025-04-18', '2025-05-19',
      '2025-07-01', '2025-09-01', '2025-10-13',
      '2025-12-25', '2025-12-26'
    ];
    const arr = (data || []).map(r => r.date).filter(Boolean);
    if (arr.length === 0) {
      return [
        '2025-01-01', '2025-04-18', '2025-05-19',
        '2025-07-01', '2025-09-01', '2025-10-13',
        '2025-12-25', '2025-12-26'
      ];
    }
    return arr;
  } catch {
    return [
      '2025-01-01', '2025-04-18', '2025-05-19',
      '2025-07-01', '2025-09-01', '2025-10-13',
      '2025-12-25', '2025-12-26'
    ];
  }
}

async function fetchSettings() {
  const { data } = await supabase
    .from('app_settings')
    .select('same_day_cutoff_local_time, timezone')
    .single();
  return data || { same_day_cutoff_local_time: '18:00', timezone: undefined };
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
  // Try multiple sources to discover billable pages; fall back to baseline 2 pages if unknown
  try {
    const { data: items1 } = await supabase
      .from('ocr_analysis_items')
      .select('billable_pages')
      .eq('quote_id', quoteId);
    if (items1 && items1.length > 0) return items1.map(i => ({ billable_pages: Number(i.billable_pages) || 0 }));
  } catch {}
  try {
    const { data: item2 } = await supabase
      .from('ocr_analysis')
      .select('billable_pages')
      .eq('quote_id', quoteId)
      .maybeSingle();
    if (item2 && typeof item2.billable_pages !== 'undefined') return [{ billable_pages: Number(item2.billable_pages) || 0 }];
  } catch {}
  try {
    const { data: items3 } = await supabase
      .from('quote_files')
      .select('pages')
      .eq('quote_id', quoteId);
    if (items3 && items3.length > 0 && typeof items3[0].pages !== 'undefined') {
      return items3.map(i => ({ billable_pages: Number(i.pages) || 0 }));
    }
  } catch {}
  return [{ billable_pages: 2 }];
}

async function checkSameDayEligibility(quoteId, items) {
  const totalPages = (items || []).reduce((sum, i) => sum + (Number(i.billable_pages) || 0), 0);
  if (totalPages <= 1) return true;
  return false;
}

async function calculateAllDeliveryDates(quoteId, items, holidays) {
  const [deliveryOptions, settings] = await Promise.all([
    fetchDeliveryOptions(),
    fetchSettings()
  ]);

  const totalPages = (items || []).reduce((sum, item) => sum + (Number(item.billable_pages) || 0), 0);
  const dates = {};

  const standardOption = deliveryOptions.find(opt => !opt.is_expedited && !opt.is_same_day);
  if (standardOption) {
    const per = Math.max(1, Number(standardOption.addl_business_days_per_pages) || 1);
    const addlBlocks = Math.ceil(Math.max(0, totalPages - 2) / per);
    const standardDays = (Number(standardOption.base_business_days) || 0) + addlBlocks * (Number(standardOption.addl_business_days) || 0);
    dates.standard = {
      date: calculateBusinessDays(standardDays, holidays),
      label: 'Standard Delivery',
      price: 'Free',
      modifier: 0
    };
  }

  const expeditedOption = deliveryOptions.find(opt => opt.is_expedited && !opt.is_same_day);
  if (expeditedOption) {
    const per = Math.max(1, Number(expeditedOption.addl_business_days_per_pages) || 1);
    const addlBlocks = Math.ceil(Math.max(0, totalPages - 2) / per);
    const expeditedDays = (Number(expeditedOption.base_business_days) || 0) + addlBlocks * (Number(expeditedOption.addl_business_days) || 0);
    const pct = Number(expeditedOption.price_modifier_percent) || 40;
    dates.expedited = {
      date: calculateBusinessDays(expeditedDays, holidays),
      label: 'Expedited Delivery',
      price: `+${pct}%`,
      modifier: pct / 100
    };
  }

  const eligible = await checkSameDayEligibility(quoteId, items);
  if (eligible) {
    const now = new Date();
    const cutoff = parseCutoffTime(settings?.same_day_cutoff_local_time || '18:00');
    const cutoffToday = new Date();
    cutoffToday.setHours(cutoff.hours, cutoff.minutes, 0, 0);
    if (now < cutoffToday) {
      const pct = 100;
      dates.sameDay = {
        date: toISODate(now),
        time: settings?.same_day_cutoff_local_time || '18:00',
        label: 'Same-day Delivery',
        price: `+${pct}%`,
        modifier: pct / 100
      };
    }
  }

  return { dates, settings };
}

export default function Step3() {
  const [{ quote, job }, setParams] = useState({ quote: null, job: null });
  const [quoteData, setQuoteData] = useState(null);
  const [deliveryDates, setDeliveryDates] = useState(null);
  const [timezone, setTimezone] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        const { dates, settings } = await calculateAllDeliveryDates(quote, items, holidays);
        if (cancelled) return;
        setDeliveryDates(dates);
        setTimezone(settings?.timezone || undefined);
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
                {quoteData.source_lang} 							→ {quoteData.target_lang} | {quoteData.intended_use}
              </p>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Standard Delivery</p>
                <p className="text-lg font-semibold text-gray-900">
                  📅 {formatDate(deliveryDates.standard.date, timezone)}
                </p>
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
                    <span className="text-sm text-gray-700">⚡ Same-day: Today by {deliveryDates.sameDay.time}</span>
                    <span className="text-sm font-medium text-cyan-600">{deliveryDates.sameDay.price}</span>
                  </div>
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
