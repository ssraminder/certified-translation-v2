import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabase } from '../../lib/supabaseClient';
import { getErrorMessage } from '../../lib/errorMessage';

const GST_RATE = 0.05;
const DEFAULT_TIMEZONE = 'America/Edmonton';
const DEFAULT_ORDER_CUTOFF = '18:00';
const DEFAULT_SAME_DAY_CUTOFF = '14:00';
const CURRENCY = 'CAD';
const FALLBACK_HOLIDAYS = new Set([
  '2025-01-01',
  '2025-04-18',
  '2025-05-19',
  '2025-07-01',
  '2025-09-01',
  '2025-10-13',
  '2025-12-25',
  '2025-12-26'
]);

function createHolidaySet(records) {
  const dates = (records || [])
    .map((record) => (record?.date ?? record?.holiday_date ?? record?.holidayDate ?? '').trim())
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
  if (dates.length === 0) {
    return new Set(FALLBACK_HOLIDAYS);
  }
  return new Set(dates);
}

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function parseNumber(value) {
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : 0;
}

function safeNumber(value, defaultValue = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
}

function roundToCents(value) {
  return Math.round(parseNumber(value) * 100) / 100;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(roundToCents(value));
}

function getDateParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value || '1970';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  return { year, month, day };
}

function getDateStringInTimezone(date, timezone) {
  const { year, month, day } = getDateParts(date, timezone);
  return `${year}-${month}-${day}`;
}

function getLocalDateString(timezone) {
  return getDateStringInTimezone(new Date(), timezone || DEFAULT_TIMEZONE);
}

function getLocalWeekdayNumber(timezone) {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || DEFAULT_TIMEZONE,
    weekday: 'short'
  }).format(new Date());
  const map = {
    Sun: 7,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  };
  return map[name] || 7;
}

function isBeforeLocalTime(timeString, timezone) {
  if (!timeString) return true;
  const tz = timezone || DEFAULT_TIMEZONE;
  const [hh = '00', mm = '00', ss = '00'] = String(timeString).split(':');
  const cutoff = {
    hours: Math.max(0, Math.min(23, parseInt(hh, 10) || 0)),
    minutes: Math.max(0, Math.min(59, parseInt(mm, 10) || 0)),
    seconds: Math.max(0, Math.min(59, parseInt(ss, 10) || 0))
  };
  const nowParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date());
  const hours = parseInt(nowParts.find((p) => p.type === 'hour')?.value || '00', 10);
  const minutes = parseInt(nowParts.find((p) => p.type === 'minute')?.value || '00', 10);
  const seconds = parseInt(nowParts.find((p) => p.type === 'second')?.value || '00', 10);
  if (hours < cutoff.hours) return true;
  if (hours > cutoff.hours) return false;
  if (minutes < cutoff.minutes) return true;
  if (minutes > cutoff.minutes) return false;
  return seconds < cutoff.seconds;
}

function addBusinessDaysFromNow(days, timezone, holidaysSet) {
  const tz = timezone || DEFAULT_TIMEZONE;
  const skipDates = holidaysSet instanceof Set ? holidaysSet : FALLBACK_HOLIDAYS;
  if (days <= 0) {
    const todayIso = getDateStringInTimezone(new Date(), tz);
    return skipDates.has(todayIso) ? addBusinessDaysFromNow(1, tz, skipDates) : todayIso;
  }
  let added = 0;
  let reference = new Date();
  while (added < days) {
    reference = new Date(reference.getTime() + 86_400_000);
    const iso = getDateStringInTimezone(reference, tz);
    const weekdayName = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short'
    }).format(reference);
    const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayName);
    const isWeekend = weekdayIndex === 0 || weekdayIndex === 6;
    if (!isWeekend && !skipDates.has(iso)) {
      added += 1;
    }
  }
  return getDateStringInTimezone(reference, tz);
}

function calculateRequiredDays({ baseDays, basePageAllowance, extraPageBlock, extraDayIncrement = 1, totalPages, afterCutoff }) {
  const effectiveBaseDays = Math.max(0, baseDays);
  const allowance = Math.max(0, basePageAllowance);
  const blockSize = Math.max(0, extraPageBlock);
  const increment = Math.max(0, extraDayIncrement);
  const excessPages = Math.max(0, totalPages - allowance);
  const extraBlocks = blockSize > 0 ? Math.ceil(excessPages / blockSize) : 0;
  let required = effectiveBaseDays + extraBlocks * (increment || 0);
  if (afterCutoff) {
    required += 1;
  }
  return Math.max(required, 0);
}

function formatDateForDisplay(dateString, timezone) {
  if (!dateString) return 'TBD';
  const tz = timezone || DEFAULT_TIMEZONE;
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(dateString);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function normalizeLineItems(items) {
  return (items || []).map((item) => {
    const filename = item.filename || item.filenames || 'Document';
    const docType = item.doc_type || 'Document';
    const billablePages = roundToCents(safeNumber(item.billable_pages));
    const unitRate = roundToCents(safeNumber(item.unit_rate));
    const certificationAmount = roundToCents(safeNumber(item.certification_amount));
    const storedLineTotal = roundToCents(safeNumber(item.line_total));
    const computedTotal = roundToCents(billablePages * unitRate + certificationAmount);
    const lineTotal = storedLineTotal > 0 ? storedLineTotal : computedTotal;
    const totalPages = safeNumber(item.total_pages);
    return {
      id: item.id,
      filename,
      docType,
      doc_type: docType,
      billablePages,
      billable_pages: billablePages,
      unitRate,
      unit_rate: unitRate,
      certificationAmount,
      certification_amount: certificationAmount,
      certification_type_name: item.certification_type_name,
      lineTotal,
      line_total: lineTotal,
      totalPages,
      total_pages: totalPages,
      sourceLanguage: item.source_language,
      targetLanguage: item.target_language
    };
  });
}

function calculateTotals(items) {
  const subtotalValue = (items || []).reduce((sum, item) => {
    const amount = safeNumber(item.line_total ?? item.lineTotal);
    return sum + amount;
  }, 0);
  const subtotal = roundToCents(subtotalValue);
  const estimatedTax = roundToCents(subtotal * GST_RATE);
  const total = roundToCents(subtotal + estimatedTax);
  return { subtotal, estimatedTax, total };
}

async function saveQuoteResults(quoteId, totals, currentLineItems, { currency = CURRENCY, delivery = null } = {}) {
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  const sanitizedItems = (currentLineItems || []).map((item) => {
    const billablePages = roundToCents(safeNumber(item.billable_pages ?? item.billablePages));
    const unitRate = roundToCents(safeNumber(item.unit_rate ?? item.unitRate));
    const certificationAmount = roundToCents(safeNumber(item.certification_amount ?? item.certificationAmount));
    const lineTotal = roundToCents(safeNumber(item.line_total ?? item.lineTotal));
    const totalPages = safeNumber(item.total_pages ?? item.totalPages);

    return {
      id: item.id,
      filename: item.filename,
      doc_type: item.doc_type || item.docType,
      billable_pages: billablePages,
      total_pages: totalPages,
      unit_rate: unitRate,
      certification_type_name: item.certification_type_name || null,
      certification_amount: certificationAmount,
      line_total: lineTotal
    };
  });

  const resultsPayload = {
    version: 1,
    calculatedAt: new Date().toISOString(),
    lineItemCount: sanitizedItems.length,
    lineItems: sanitizedItems,
    pricing: {
      subtotal: totals.subtotal,
      tax: totals.estimatedTax,
      taxRate: GST_RATE,
      total: totals.total,
      currency
    }
  };

  if (delivery) {
    resultsPayload.delivery = delivery;
  }

  const upsertPayload = {
    quote_id: quoteId,
    results_json: resultsPayload,
    subtotal: totals.subtotal,
    tax: totals.estimatedTax,
    total: totals.total,
    currency,
    computed_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('quote_results')
    .upsert(upsertPayload, { onConflict: 'quote_id', returning: 'minimal' });
  if (error) throw error;
}

async function triggerHitlReview(quoteId) {
  try {
    if (!supabase) return;
    await supabase
      .from('quote_submissions')
      .update({ hitl_required: true, status: 'awaiting_review' })
      .eq('quote_id', quoteId);
  } catch (err) {
    console.error('Failed to flag quote for HITL review', err);
  }
}

function matchesQualifier(docType, country, qualifiers) {
  const normalizedDoc = (docType || '').trim().toLowerCase();
  const normalizedCountry = (country || '').trim().toLowerCase();
  if (!normalizedDoc || !normalizedCountry) return false;
  return (qualifiers || []).some((qualifier) => {
    const qualifierDoc = (qualifier.doc_type || '').trim().toLowerCase();
    const qualifierCountry = (qualifier.country || '').trim().toLowerCase();
    if (!qualifierDoc || !qualifierCountry) return false;
    if (qualifierCountry !== normalizedCountry) return false;
    return (
      qualifierDoc === normalizedDoc ||
      normalizedDoc.includes(qualifierDoc) ||
      qualifierDoc.includes(normalizedDoc)
    );
  });
}

function determineSameDayEligibility({
  items,
  files,
  qualifiers,
  settings,
  fallbackCountry,
  holidays
}) {
  const totalPages = (items || []).reduce((sum, item) => sum + roundToCents(item.billablePages), 0);
  if (totalPages !== 1) return false;
  const tz = settings?.timezone || DEFAULT_TIMEZONE;
  const cutoff = settings?.same_day_cutoff_local_time || DEFAULT_SAME_DAY_CUTOFF;
  if (!isBeforeLocalTime(cutoff, tz)) return false;

  const weekdays = new Set(
    (settings?.same_day_cutoff_weekdays || '1,2,3,4,5')
      .split(',')
      .map((value) => parseInt(value.trim(), 10))
      .filter((value) => Number.isFinite(value))
  );
  const weekdayNumber = getLocalWeekdayNumber(tz);
  if (!weekdays.has(weekdayNumber)) return false;

  const todayIso = getLocalDateString(tz);
  const blockedDates = holidays instanceof Set ? holidays : FALLBACK_HOLIDAYS;
  if (blockedDates.has(todayIso)) return false;

  const fileCountryMap = new Map((files || []).map((file) => [file.filename, (file.country_of_issue || '').trim().toLowerCase()]));
  const fallback = (fallbackCountry || '').trim().toLowerCase();

  return (items || []).every((item) => {
    const country = fileCountryMap.get(item.filename) || fallback;
    return matchesQualifier(item.docType, country, qualifiers);
  });
}

function toPercentLabel(decimal) {
  const value = parseNumber(decimal);
  if (value <= 0) return '+0%';
  return `+${Math.round(value * 100)}%`;
}

function applyDeliveryModifier(pricing, option) {
  const baseSubtotal = roundToCents(pricing?.subtotal ?? 0);
  const baseTax = roundToCents(pricing?.estimatedTax ?? 0);
  const baseTotal = roundToCents(pricing?.total ?? 0);
  const base = { subtotal: baseSubtotal, estimatedTax: baseTax, total: baseTotal };
  if (!option || !option.modifier || option.modifier <= 0) {
    return base;
  }

  if (option.modifierType === 'percent') {
    const multiplier = 1 + option.modifier;
    const subtotal = roundToCents(baseSubtotal * multiplier);
    const estimatedTax = roundToCents(subtotal * GST_RATE);
    const total = roundToCents(subtotal + estimatedTax);
    return { subtotal, estimatedTax, total };
  }

  if (option.modifierType === 'flat') {
    const subtotal = roundToCents(baseSubtotal + option.modifier);
    const estimatedTax = roundToCents(subtotal * GST_RATE);
    const total = roundToCents(subtotal + estimatedTax);
    return { subtotal, estimatedTax, total };
  }

  return base;
}

function computeDeliveryEstimates({
  items,
  deliveryOptions,
  settings,
  sameDayEligible,
  holidays
}) {
  const tz = settings?.timezone || DEFAULT_TIMEZONE;
  const orderCutoff = settings?.order_cutoff_time || DEFAULT_ORDER_CUTOFF;
  const totalPages = (items || []).reduce((sum, item) => sum + roundToCents(item.billablePages), 0);
  const delivery = {};
  const afterCutoff = !isBeforeLocalTime(orderCutoff, tz);
  const options = deliveryOptions || [];
  const holidaySet = holidays instanceof Set ? holidays : FALLBACK_HOLIDAYS;

  const standardOption = options.find((option) => !option.is_expedited && !option.is_same_day);
  if (standardOption) {
    const baseDays = parseNumber(standardOption.base_business_days) || 2;
    const extraDayIncrement = parseNumber(standardOption.addl_business_days) || 1;
    const pageBlock = parseNumber(standardOption.addl_business_days_per_pages) || 4;
    const requiredDays = calculateRequiredDays({
      baseDays,
      basePageAllowance: 2,
      extraPageBlock: pageBlock,
      extraDayIncrement,
      totalPages,
      afterCutoff
    });
    const rawDate = addBusinessDaysFromNow(requiredDays, tz, holidaySet);
    const feeAmount = parseNumber(standardOption.fee_amount);
    const hasFee = feeAmount > 0;
    const priceLabel = hasFee ? `+${formatCurrency(feeAmount)}` : 'Included';
    delivery.standard = {
      key: 'standard',
      label: standardOption.name || 'Standard delivery',
      rawDate,
      displayDate: formatDateForDisplay(rawDate, tz),
      priceLabel,
      modifier: hasFee ? roundToCents(feeAmount) : 0,
      modifierType: hasFee ? 'flat' : 'none',
      timezone: tz,
      requiredBusinessDays: requiredDays
    };
  }

  const expeditedOption = options.find((option) => option.is_expedited && !option.is_same_day);
  if (expeditedOption) {
    const baseDays = parseNumber(expeditedOption.base_business_days) || 1;
    const extraDayIncrement = parseNumber(expeditedOption.addl_business_days) || 1;
    const pageBlock = parseNumber(expeditedOption.addl_business_days_per_pages) || 5;
    const requiredDays = calculateRequiredDays({
      baseDays,
      basePageAllowance: 2,
      extraPageBlock: pageBlock,
      extraDayIncrement,
      totalPages,
      afterCutoff
    });
    const rawDate = addBusinessDaysFromNow(requiredDays, tz, holidaySet);
    const modifier = 0.3;
    const priceLabel = toPercentLabel(modifier);
    delivery.expedited = {
      key: 'rush',
      label: expeditedOption.name || 'Rush delivery',
      rawDate,
      displayDate: formatDateForDisplay(rawDate, tz),
      priceLabel,
      modifier,
      modifierType: 'percent',
      timezone: tz,
      requiredBusinessDays: requiredDays
    };
  }

  const sameDayOption = options.find((option) => option.is_same_day);
  if (sameDayEligible && sameDayOption) {
    const sameDayCutoff = settings?.same_day_cutoff_local_time || DEFAULT_SAME_DAY_CUTOFF;
    const rawDate = getLocalDateString(tz);
    let modifier = parseNumber(sameDayOption.fee_amount);
    if ((sameDayOption.fee_type || '').toLowerCase() !== 'percent' || modifier <= 0) {
      modifier = 1;
    }
    const priceLabel = modifier > 0 ? toPercentLabel(modifier) : '+100%';
    delivery.sameDay = {
      key: 'sameDay',
      label: 'Same-day delivery',
      rawDate,
      displayDate: 'Today',
      deadlineTime: `${sameDayCutoff} ${tz.replace('America/', '')}`,
      priceLabel,
      modifier,
      modifierType: 'percent',
      timezone: tz
    };
  } else if (sameDayEligible) {
    const sameDayCutoff = settings?.same_day_cutoff_local_time || DEFAULT_SAME_DAY_CUTOFF;
    const rawDate = getLocalDateString(tz);
    delivery.sameDay = {
      key: 'sameDay',
      label: 'Same-day delivery',
      rawDate,
      displayDate: 'Today',
      deadlineTime: `${sameDayCutoff} ${tz.replace('America/', '')}`,
      priceLabel: '+100%',
      modifier: 1,
      modifierType: 'percent',
      timezone: tz
    };
  }

  const defaultKey = delivery.standard?.key || delivery.expedited?.key || delivery.sameDay?.key || null;
  if (defaultKey) {
    delivery.defaultKey = defaultKey;
  }

  return delivery;
}

function LoadingState({ heading, message }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <LoadingSpinner size="lg" className="text-blue-600" label={heading} />
      <p className="text-lg font-semibold text-gray-900">{heading}</p>
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
}

function HitlFallback({ jobId, quoteMeta }) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Our team is reviewing your documents</h2>
      <p className="mt-3 text-sm text-gray-600">
        Your quote needs a human touch. A certified specialist will review everything and email you within the next few hours.
      </p>
      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Order ID</dt>
          <dd className="text-sm font-semibold text-gray-900">{jobId || 'Pending'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Source language</dt>
          <dd className="text-sm font-semibold text-gray-900">{quoteMeta?.source_lang || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Target language</dt>
          <dd className="text-sm font-semibold text-gray-900">{quoteMeta?.target_lang || '—'}</dd>
        </div>
      </dl>
    </section>
  );
}

function QuoteSummaryCard({ quoteMeta, jobId }) {
  if (!quoteMeta) return null;
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Order summary</h2>
          <p className="text-sm text-gray-600">Confirm the details before you proceed to checkout.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Order ID</p>
          <p className="text-sm font-semibold text-gray-900">{jobId || 'Pending'}</p>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Source language</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{quoteMeta.source_lang || '—'}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Target language</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{quoteMeta.target_lang || '—'}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Intended use</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">{quoteMeta.intended_use || '—'}</dd>
        </div>
      </dl>
    </section>
  );
}

function DeliveryOptionsCard({ options, timezone, selectedKey, onSelect }) {
  const list = (options || []).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Delivery options</h2>
      <p className="text-sm text-gray-600">Choose your delivery speed. Pricing updates instantly.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {list.map((option) => {
          const optionKey = option.key || option.label;
          const isSelected = optionKey === selectedKey;
          return (
            <button
              type="button"
              key={optionKey}
              onClick={() => onSelect?.(optionKey)}
              className={classNames(
                'relative flex h-full flex-col justify-between rounded-xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600',
                isSelected ? 'border-cyan-500 bg-cyan-50 shadow-sm' : 'border-gray-200 hover:border-cyan-300 hover:bg-cyan-50/50'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">{option.displayDate}</p>
                  {option.deadlineTime && (
                    <p className="mt-1 text-xs text-gray-500">Delivery by {option.deadlineTime}</p>
                  )}
                </div>
                <span className={classNames('text-xs font-medium uppercase tracking-wide', isSelected ? 'text-cyan-700' : 'text-gray-500')}>
                  {isSelected ? 'Selected' : 'Select'}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-cyan-700">{option.priceLabel}</p>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-gray-500">All times shown in {timezone || DEFAULT_TIMEZONE}.</p>
    </section>
  );
}

function LineItemsTable({ items, onRemove, disableRemove, isSaving }) {
  if (!items || items.length === 0) return null;
  const isSingleItem = disableRemove || items.length <= 1;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
        <p className="text-sm text-gray-600 mt-1">Remove any document you do not need translated.</p>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pages</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price Breakdown</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.map((item) => {
              const translationCost = safeNumber(item.billable_pages ?? item.billablePages) * safeNumber(item.unit_rate ?? item.unitRate);
              const certificationCost = safeNumber(item.certification_amount ?? item.certificationAmount);
              const hasCertification = certificationCost > 0;
              const buttonDisabled = isSingleItem || isSaving;

              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{item.filename}</span>
                      {(item.certification_type_name || item.certificationTypeName) && (
                        <span className="text-xs text-gray-500 mt-1">{(item.certification_type_name || item.certificationTypeName)} Certification</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.doc_type || item.docType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-sm">
                      <span className="text-gray-900">Total: {item.total_pages ?? item.totalPages}</span>
                      <span className="text-gray-500 text-xs">Billable: {item.billable_pages ?? item.billablePages}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Translation:</span>
                        <span className="font-medium text-gray-900 ml-3">${translationCost.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-500 pl-2">
                        {item.billable_pages ?? item.billablePages} pages × ${safeNumber(item.unit_rate ?? item.unitRate).toFixed(2)}
                      </div>
                      {hasCertification && (
                        <div className="flex justify-between items-center text-sm pt-1.5 border-t border-gray-100">
                          <span className="text-gray-600">{item.certification_type_name || item.certificationTypeName || 'Certification'}:</span>
                          <span className="font-medium text-gray-900 ml-3">${certificationCost.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-base font-semibold text-gray-900">${safeNumber(item.line_total ?? item.lineTotal).toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onRemove(item.id)}
                      disabled={buttonDisabled}
                      className={classNames(
                        'text-sm font-medium transition-colors',
                        buttonDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'
                      )}
                      title={isSingleItem ? 'You must keep at least one document' : 'Remove document'}
                    >
                      {isSingleItem ? (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Keep
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </span>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-gray-200">
        {items.map((item) => {
          const translationCost = safeNumber(item.billable_pages ?? item.billablePages) * safeNumber(item.unit_rate ?? item.unitRate);
          const certificationCost = safeNumber(item.certification_amount ?? item.certificationAmount);
          const hasCertification = certificationCost > 0;
          const buttonDisabled = isSingleItem || isSaving;

          return (
            <div key={item.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">{item.filename}</h4>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{item.doc_type || item.docType}</span>
                    {(item.certification_type_name || item.certificationTypeName) && (
                      <span className="text-xs text-gray-500">+ {item.certification_type_name || item.certificationTypeName}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  disabled={buttonDisabled}
                  className={classNames(
                    'ml-3 p-2 rounded-full transition-colors',
                    buttonDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'
                  )}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div>
                  <span className="text-gray-500">Total Pages:</span>
                  <span className="ml-2 font-medium text-gray-900">{item.total_pages ?? item.totalPages}</span>
                </div>
                <div>
                  <span className="text-gray-500">Billable:</span>
                  <span className="ml-2 font-medium text-gray-900">{item.billable_pages ?? item.billablePages}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Translation</span>
                  <span className="font-medium text-gray-900">${translationCost.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-500 pl-2">
                  {item.billable_pages ?? item.billablePages} pages × ${safeNumber(item.unit_rate ?? item.unitRate).toFixed(2)}
                </div>

                {hasCertification && (
                  <>
                    <div className="border-t border-gray-200 pt-2" />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{item.certification_type_name || item.certificationTypeName || 'Certification'}</span>
                      <span className="font-medium text-gray-900">${certificationCost.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="border-t border-gray-300 pt-2 mt-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Line Total</span>
                  <span className="text-lg font-bold text-gray-900">${safeNumber(item.line_total ?? item.lineTotal).toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-600">You must keep at least one document in your quote.</p>
      </div>
    </div>
  );
}

function PricingSummary({ basePricing, adjustedPricing, selectedOption }) {
  const baseSubtotal = roundToCents(basePricing?.subtotal ?? 0);
  const subtotal = roundToCents(adjustedPricing?.subtotal ?? 0);
  const estimatedTax = roundToCents(adjustedPricing?.estimatedTax ?? 0);
  const total = roundToCents(adjustedPricing?.total ?? 0);
  const deliveryPremium = roundToCents(subtotal - baseSubtotal);
  const showPremium = deliveryPremium > 0.01;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pricing summary</h2>
          {selectedOption && (
            <p className="mt-1 text-xs text-gray-500">
              Delivery: {selectedOption.label} ({selectedOption.priceLabel})
            </p>
          )}
        </div>
        {showPremium && (
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">Updated</span>
        )}
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-gray-600">Subtotal</dt>
          <dd className="font-medium text-gray-900">{formatCurrency(subtotal)}</dd>
        </div>
        {showPremium && (
          <div className="flex items-center justify-between text-xs">
            <dt className="text-gray-500">Includes delivery premium</dt>
            <dd className="font-medium text-gray-700">+{formatCurrency(deliveryPremium)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between">
          <dt className="text-gray-600">Estimated GST (5%)</dt>
          <dd className="font-medium text-gray-900">{formatCurrency(estimatedTax)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-base font-semibold text-gray-900">
          <dt>Total due today</dt>
          <dd>{formatCurrency(total)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-gray-500">
        {showPremium && selectedOption?.modifierType === 'percent' ? 'Delivery premium is applied to the translation subtotal before tax. ' : ''}
        Final taxes will be confirmed at checkout based on your billing province.
      </p>
    </section>
  );
}

function ActionButtons({ onAccept, onHuman, onSave, disabled }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onAccept}
          disabled={disabled}
          className={classNames(
            'inline-flex items-center justify-center rounded-lg bg-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors',
            disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-cyan-700'
          )}
        >
          Accept &amp; Pay
        </button>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <button
            type="button"
            onClick={onHuman}
            disabled={disabled}
            className={classNames(
              'font-medium text-cyan-700 transition-colors',
              disabled ? 'cursor-not-allowed opacity-60' : 'hover:text-cyan-800'
            )}
          >
            Request human quote
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={disabled}
            className={classNames(
              'font-medium text-gray-600 transition-colors',
              disabled ? 'cursor-not-allowed opacity-60' : 'hover:text-gray-800'
            )}
          >
            Save &amp; Email
          </button>
        </div>
      </div>
    </section>
  );
}

function DisclaimerBox() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-amber-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="m10.29 3.86-7.5 13A1 1 0 0 0 3.62 18h16.76a1 1 0 0 0 .87-1.5l-7.5-13a1 1 0 0 0-1.74 0Z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-amber-900">AI generated pricing</h3>
          <p className="mt-1 text-xs text-amber-800">This quote was generated automatically. A certified translator will verify everything once you checkout, and you can request a human quote at any time.</p>
        </div>
      </div>
    </section>
  );
}

export default function Step3() {
  const router = useRouter();
  const [quoteId, setQuoteId] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHITL, setShowHITL] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [quoteMeta, setQuoteMeta] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [pricing, setPricing] = useState({ subtotal: 0, estimatedTax: 0, total: 0 });
  const [deliveryEstimates, setDeliveryEstimates] = useState(null);
  const [selectedDeliveryKey, setSelectedDeliveryKey] = useState(null);
  const [settings, setSettings] = useState(null);
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [qualifiers, setQualifiers] = useState([]);
  const [files, setFiles] = useState([]);
  const [holidays, setHolidays] = useState(() => createHolidaySet());
  const [minimumOrder, setMinimumOrder] = useState(65);

  const deliveryOptionsList = useMemo(() => {
    if (!deliveryEstimates) return [];
    return [deliveryEstimates.standard, deliveryEstimates.expedited, deliveryEstimates.sameDay].filter(Boolean);
  }, [deliveryEstimates]);

  const defaultDeliveryKey = deliveryEstimates?.defaultKey || null;

  useEffect(() => {
    if (deliveryOptionsList.length === 0) {
      setSelectedDeliveryKey(null);
      return;
    }
    setSelectedDeliveryKey((current) => {
      if (current && deliveryOptionsList.some((option) => option.key === current)) {
        return current;
      }
      if (defaultDeliveryKey && deliveryOptionsList.some((option) => option.key === defaultDeliveryKey)) {
        return defaultDeliveryKey;
      }
      const preferredOrder = ['standard', 'rush', 'sameDay'];
      const fallbackOption = preferredOrder
        .map((key) => deliveryOptionsList.find((option) => option.key === key))
        .find(Boolean) || deliveryOptionsList[0];
      return fallbackOption?.key || null;
    });
  }, [deliveryOptionsList, defaultDeliveryKey]);

  const selectedDeliveryOption = useMemo(() => {
    if (!selectedDeliveryKey) return null;
    return deliveryOptionsList.find((option) => option.key === selectedDeliveryKey) || null;
  }, [deliveryOptionsList, selectedDeliveryKey]);

  const pricingWithDelivery = useMemo(
    () => applyDeliveryModifier(pricing, selectedDeliveryOption),
    [pricing, selectedDeliveryOption]
  );

  const handleDeliverySelect = useCallback((key) => {
    setSelectedDeliveryKey(key);
  }, []);

  useEffect(() => {
    if (!quoteId || !selectedDeliveryOption || lineItems.length === 0 || !deliveryEstimates) return;
    if (!supabase) return;
    const persistSelection = async () => {
      try {
        const totalsWithDelivery = applyDeliveryModifier(pricing, selectedDeliveryOption);
        const deliveryPayload = {
          ...deliveryEstimates,
          selectedKey: selectedDeliveryOption.key
        };
        await saveQuoteResults(quoteId, totalsWithDelivery, lineItems, {
          currency: CURRENCY,
          delivery: deliveryPayload
        });
      } catch (err) {
        console.error('Failed to persist delivery selection', err);
      }
    };
    persistSelection();
  }, [quoteId, selectedDeliveryOption, deliveryEstimates, pricing, lineItems]);

  useEffect(() => {
    if (!router.isReady) return;
    const { quote, job } = router.query;
    if (!quote) {
      setError('We could not find your quote reference.');
      setShowHITL(true);
      return;
    }
    setQuoteId(String(quote));
    if (job) setJobId(String(job));
  }, [router.isReady, router.query]);

  const loadQuote = useCallback(async (targetQuoteId) => {
    if (!targetQuoteId) return;
    setIsLoading(true);
    setError('');
    setInfoMessage('');
    if (!supabase) {
      setError('Supabase is not configured.');
      setIsLoading(false);
      return;
    }
    try {
      const [
        submissionRes,
        lineItemsRes,
        filesRes,
        deliveryOptionsRes,
        settingsRes,
        qualifiersRes,
        holidaysRes
      ] = await Promise.all([
        supabase
          .from('quote_submissions')
          .select('job_id, source_lang, target_lang, intended_use, country_of_issue')
          .eq('quote_id', targetQuoteId)
          .maybeSingle(),
        supabase
          .from('quote_sub_orders')
          .select('id, filename, doc_type, billable_pages, unit_rate, certification_amount, certification_type_name, line_total, total_pages, source_language, target_language')
          .eq('quote_id', targetQuoteId)
          .order('id'),
        supabase
          .from('quote_files')
          .select('filename, country_of_issue')
          .eq('quote_id', targetQuoteId),
        supabase
          .from('delivery_options')
          .select('id, name, base_business_days, addl_business_days_per_pages, addl_business_days, fee_type, fee_amount, is_expedited, is_same_day, active, display_order')
          .eq('active', true)
          .order('display_order'),
        supabase
          .from('app_settings')
          .select('base_rate, same_day_cutoff_local_time, same_day_cutoff_weekdays, timezone, rush_percent')
          .limit(1)
          .maybeSingle(),
        supabase
          .from('same_day_qualifiers')
          .select('doc_type, country')
          .eq('active', true),
        supabase
          .from('holidays')
          .select('date, holiday_name, year')
          .order('date')
      ]);

      if (submissionRes.error) throw submissionRes.error;
      const submission = submissionRes.data;
      if (!submission) {
        setError('We could not find your quote details.');
        await triggerHitlReview(targetQuoteId);
        setShowHITL(true);
        return;
      }
      if (!jobId && submission.job_id) {
        setJobId(String(submission.job_id));
      }

      const normalizedItems = normalizeLineItems(lineItemsRes.data || []);
      if (normalizedItems.length === 0) {
        setError('No billable documents were returned. Our team will prepare a manual quote.');
        await triggerHitlReview(targetQuoteId);
        setShowHITL(true);
        return;
      }

      const totals = calculateTotals(normalizedItems);
      if (totals.total <= 0) {
        setError('The automated calculation returned $0. Our team will review this manually.');
        await triggerHitlReview(targetQuoteId);
        setShowHITL(true);
        return;
      }

      const settingsData = settingsRes.data || {};
      const baseRate = parseNumber(settingsData.base_rate) || 65;
      if (totals.subtotal < baseRate) {
        setMinimumOrder(baseRate);
        setError('Your order is below our minimum. A human specialist will provide a custom quote.');
        await triggerHitlReview(targetQuoteId);
        setShowHITL(true);
        return;
      }

      const filesList = filesRes.data || [];
      const qualifiersList = qualifiersRes.data || [];
      const deliveryOptionsList = (deliveryOptionsRes.data || []).filter((option) => option);
      if (holidaysRes?.error) {
        console.error('Failed to load holidays data', holidaysRes.error);
      }
      const holidaysSet = createHolidaySet(holidaysRes?.data);
      const sameDay = determineSameDayEligibility({
        items: normalizedItems,
        files: filesList,
        qualifiers: qualifiersList,
        settings: settingsData,
        fallbackCountry: submission.country_of_issue,
        holidays: holidaysSet
      });
      const delivery = computeDeliveryEstimates({
        items: normalizedItems,
        deliveryOptions: deliveryOptionsList,
        settings: settingsData,
        sameDayEligible: sameDay,
        holidays: holidaysSet
      });

      try {
        await saveQuoteResults(targetQuoteId, totals, normalizedItems, {
          currency: CURRENCY,
          delivery
        });
      } catch (saveError) {
        console.error('Failed to persist quote results', saveError);
        setError('We loaded your quote, but we were unable to save the summary. Our team will double-check before checkout.');
      }

      setQuoteMeta(submission);
      setLineItems(normalizedItems);
      setPricing(totals);
      setDeliveryEstimates(delivery);
      setSettings(settingsData);
      setDeliveryOptions(deliveryOptionsList);
      setQualifiers(qualifiersList);
      setFiles(filesList);
      setHolidays(holidaysSet);
      setMinimumOrder(baseRate);
      setShowHITL(false);
    } catch (err) {
      console.error('Failed to load quote', err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (!quoteId) return;
    if (!supabase) {
      setError('Supabase is not configured.');
      setShowHITL(true);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    let elapsed = 0;
    const pollIntervalMs = 2500;
    const maxWaitMs = 45000;
    setIsPolling(true);
    setIsLoading(true);
    setError('');

    const checkStatus = async () => {
      try {
        const { data, error: statusError } = await supabase
          .from('quote_submissions')
          .select('n8n_status, hitl_required')
          .eq('quote_id', quoteId)
          .maybeSingle();
        if (cancelled) return;
        if (statusError) throw statusError;
        if (!data) {
          setError('We could not locate your quote.');
          setIsPolling(false);
          setIsLoading(false);
          setShowHITL(true);
          clearInterval(timerId);
          return;
        }
        if (data.hitl_required) {
          setIsPolling(false);
          setIsLoading(false);
          setShowHITL(true);
          clearInterval(timerId);
          return;
        }
        if ((data.n8n_status || '').toLowerCase() === 'ready') {
          clearInterval(timerId);
          setIsPolling(false);
          await loadQuote(quoteId);
          return;
        }
        elapsed += pollIntervalMs;
        if (elapsed >= maxWaitMs) {
          clearInterval(timerId);
          setError('Analysis is taking longer than expected. A human specialist will finish this quote.');
          await triggerHitlReview(quoteId);
          setIsPolling(false);
          setIsLoading(false);
          setShowHITL(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Polling error', err);
          setError(getErrorMessage(err));
          setIsPolling(false);
        }
      }
    };

    const timerId = setInterval(checkStatus, pollIntervalMs);
    checkStatus();

    return () => {
      cancelled = true;
      clearInterval(timerId);
    };
  }, [quoteId, loadQuote]);

  const handleRemoveItem = useCallback(async (itemId) => {
    if (!quoteId) return;
    if (lineItems.length <= 1) {
      if (typeof window !== 'undefined') {
        window.alert('You must keep at least one document in your quote.');
      }
      return;
    }

    const itemToRemove = lineItems.find((item) => item.id === itemId);
    if (!itemToRemove) return;

    if (typeof window !== 'undefined') {
      const reduction = safeNumber(itemToRemove.line_total ?? itemToRemove.lineTotal).toFixed(2);
      const confirmed = window.confirm(
        `Remove "${itemToRemove.filename}" from your quote?\n\nThis will reduce your total by $${reduction}.`
      );
      if (!confirmed) return;
    }

    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('quote_sub_orders')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      const updatedItems = lineItems.filter((item) => item.id !== itemId);

      if (updatedItems.length === 0) {
        setLineItems(updatedItems);
        setPricing({ subtotal: 0, estimatedTax: 0, total: 0 });
        setDeliveryEstimates(null);
        setError('All documents were removed. A human specialist will follow up with you.');
        await triggerHitlReview(quoteId);
        setShowHITL(true);
        return;
      }

      setLineItems(updatedItems);

      const newTotals = calculateTotals(updatedItems);

      if (newTotals.total <= 0) {
        setPricing(newTotals);
        setDeliveryEstimates(null);
        setError('Quote total dropped to $0. Our human team will finish this quote.');
        await triggerHitlReview(quoteId);
        setShowHITL(true);
        return;
      }

      if (newTotals.subtotal < minimumOrder) {
        setPricing(newTotals);
        setDeliveryEstimates(null);
        if (typeof window !== 'undefined') {
          window.alert(`Removing this document brings your order below the ${formatCurrency(minimumOrder)} minimum. Requesting human review.`);
        }
        await triggerHitlReview(quoteId);
        setShowHITL(true);
        return;
      }

      const sameDay = determineSameDayEligibility({
        items: updatedItems,
        files,
        qualifiers,
        settings,
        fallbackCountry: quoteMeta?.country_of_issue,
        holidays
      });

      const delivery = computeDeliveryEstimates({
        items: updatedItems,
        deliveryOptions,
        settings,
        sameDayEligible: sameDay,
        holidays
      });

      setPricing(newTotals);
      setDeliveryEstimates(delivery);

      try {
        await saveQuoteResults(quoteId, newTotals, updatedItems, {
          currency: CURRENCY,
          delivery
        });
      } catch (saveError) {
        console.error('⚠️ Error saving quote_results:', saveError);
      }

      console.log('✅ Item removed successfully, quote recalculated');
    } catch (err) {
      console.error('❌ Error removing item:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }, [quoteId, lineItems, minimumOrder, files, qualifiers, settings, quoteMeta, deliveryOptions, holidays]);

  const handleAcceptPay = useCallback(() => {
    if (!quoteId) return;
    const target = {
      pathname: '/order/step-4',
      query: { quote: quoteId }
    };
    if (jobId) target.query.job = jobId;
    router.push(target);
  }, [router, quoteId, jobId]);

  const handleRequestHumanQuote = useCallback(async () => {
    if (!quoteId) return;
    setIsSaving(true);
    setError('');
    try {
      await triggerHitlReview(quoteId);
      setShowHITL(true);
      setInfoMessage('Our certified team has been notified. We will send a manual quote shortly.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }, [quoteId]);

  const handleSaveAndEmail = useCallback(() => {
    setInfoMessage('We saved your quote and will email you a copy shortly.');
  }, []);

  return (
    <>
      <Head>
        <title>Step 3 - Quote Review</title>
      </Head>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8">
          {isPolling && (
            <LoadingState
              heading="AI is analyzing your documents..."
              message="This usually takes about 30–45 seconds. You can leave this tab open while we prepare your quote."
            />
          )}
          {!isPolling && isLoading && (
            <LoadingState
              heading="Preparing your quote..."
              message="Hang tight while we calculate pricing on your documents."
            />
          )}
          {!isPolling && !isLoading && showHITL && (
            <HitlFallback jobId={jobId || quoteMeta?.job_id} quoteMeta={quoteMeta} />
          )}
          {!isPolling && !isLoading && !showHITL && (
            <div className="space-y-6 pb-12">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}
              {infoMessage && !error && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{infoMessage}</div>
              )}
              <QuoteSummaryCard quoteMeta={quoteMeta} jobId={jobId || quoteMeta?.job_id} />
              <LineItemsTable
                items={lineItems}
                onRemove={handleRemoveItem}
                disableRemove={lineItems.length <= 1}
                isSaving={isSaving}
              />
              <DeliveryOptionsCard
                options={deliveryOptionsList}
                timezone={settings?.timezone || DEFAULT_TIMEZONE}
                selectedKey={selectedDeliveryKey}
                onSelect={handleDeliverySelect}
              />
              <PricingSummary
                basePricing={pricing}
                adjustedPricing={pricingWithDelivery}
                selectedOption={selectedDeliveryOption}
              />
              <ActionButtons
                onAccept={handleAcceptPay}
                onHuman={handleRequestHumanQuote}
                onSave={handleSaveAndEmail}
                disabled={isSaving || lineItems.length === 0}
              />
              <DisclaimerBox />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
