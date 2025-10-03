import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';

function getQueryParams() {
  if (typeof window === 'undefined') return { quote: null, job: null };
  const params = new URLSearchParams(window.location.search);
  return { quote: params.get('quote'), job: params.get('job') };
}

export default function Step2() {
  const [{ quote, job }, setParams] = useState({ quote: null, job: null });
  const [processingStatus, setProcessingStatus] = useState('processing');
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    orderingType: '',
    companyName: '',
    designation: '',
    frequency: ''
  });

  const showBusinessFields = formData.orderingType === 'business';

  useEffect(() => {
    setParams(getQueryParams());
  }, []);

  useEffect(() => {
    if (!quote) return;
    const checkStatus = async () => {
      const { data } = await supabase
        .from('ocr_analysis')
        .select('quote_id')
        .eq('quote_id', quote)
        .limit(1);
      if (data && data.length > 0) {
        setProcessingStatus('complete');
      }
    };
    const interval = setInterval(checkStatus, 5000);
    checkStatus();
    return () => clearInterval(interval);
  }, [quote]);

  useEffect(() => {
    if (!quote) return;
    const loadQuote = async () => {
      const { data } = await supabase
        .from('quote_submissions')
        .select('name, email, phone, ordering_type, company_name, designation, frequency')
        .eq('quote_id', quote)
        .single();
      if (data) {
        setFormData({
          fullName: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          orderingType: data.ordering_type || '',
          companyName: data.company_name || '',
          designation: data.designation || '',
          frequency: data.frequency || ''
        });
      }
    };
    loadQuote();
  }, [quote]);

  const validate = () => {
    const e = {};
    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) e.fullName = 'Please enter your full name';
    if (!formData.email.trim()) e.email = 'Please enter your email address';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Please enter a valid email address';
    if (!formData.phone.trim()) e.phone = 'Please enter your phone number';
    if (!formData.orderingType) e.orderingType = 'Please select an option';
    if (formData.orderingType === 'business') {
      if (!formData.companyName.trim()) e.companyName = 'Please enter company name';
      if (!formData.designation.trim()) e.designation = 'Please enter your designation';
      if (!formData.frequency) e.frequency = 'Please select frequency';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setProcessing(true);
    try {
      const updateData = {
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        ordering_type: formData.orderingType
      };
      if (formData.orderingType === 'business') {
        updateData.company_name = formData.companyName;
        updateData.designation = formData.designation;
        updateData.frequency = formData.frequency;
      } else {
        updateData.company_name = null;
        updateData.designation = null;
        updateData.frequency = null;
      }
      const { error } = await supabase
        .from('quote_submissions')
        .update(updateData)
        .eq('quote_id', quote);
      if (error) throw error;
      window.location.href = `/order/step-3?quote=${quote}&job=${job}`;
    } catch (err) {
      console.error(err);
      setProcessing(false);
      try {
        const { getErrorMessage } = await import('../../lib/errorMessage');
        alert(getErrorMessage(err));
      } catch {
        alert('Failed to save. Please try again.');
      }
    }
  };

  return (
    <>
      <Head>
        <title>Step 2 - Personal Information</title>
      </Head>
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Progress + Order ID */}
          <div className="mb-4 text-sm font-medium text-gray-600">Order ID: {job || ''}</div>

          {/* Processing Banner */}
          {processingStatus === 'processing' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              <div>
                <p className="text-sm font-medium text-blue-800">Analyzing your documents...</p>
                <p className="text-xs text-blue-600">This usually takes 2-3 minutes. You can continue filling out your information.</p>
              </div>
            </div>
          )}
          {processingStatus === 'complete' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-green-800">Documents analyzed successfully!</p>
            </div>
          )}

          {/* Back Link */}
          <button
            onClick={() => {
              if (confirm('Go back to documents? Your progress will be saved.')) {
                window.location.href = `/order/step-1?quote=${quote}&job=${job}`;
              }
            }}
            className="text-sm font-medium text-blue-600 hover:underline mb-6 flex items-center gap-1"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Documents
          </button>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input suppressHydrationWarning className="w-full border rounded-lg px-3 py-2" value={formData.fullName} onChange={e => setFormData(f => ({ ...f, fullName: e.target.value }))} />
              {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input suppressHydrationWarning type="email" className="w-full border rounded-lg px-3 py-2" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input suppressHydrationWarning className="w-full border rounded-lg px-3 py-2" value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">I am ordering as</label>
              <select suppressHydrationWarning className="w-full border rounded-lg px-3 py-2" value={formData.orderingType} onChange={e => setFormData(f => ({ ...f, orderingType: e.target.value }))}>
                <option value="">Select...</option>
                <option value="individual">Individual</option>
                <option value="business">Company/Business</option>
              </select>
              {errors.orderingType && <p className="text-xs text-red-600 mt-1">{errors.orderingType}</p>}
            </div>

            {/* Business Fields */}
            <div className={showBusinessFields ? 'business-section show' : 'business-section'}>
              {showBusinessFields && (
                <div className="grid grid-cols-1 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input suppressHydrationWarning className="w-full border rounded-lg px-3 py-2" value={formData.companyName} onChange={e => setFormData(f => ({ ...f, companyName: e.target.value }))} />
                    {errors.companyName && <p className="text-xs text-red-600 mt-1">{errors.companyName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                    <input suppressHydrationWarning className="w-full border rounded-lg px-3 py-2" value={formData.designation} onChange={e => setFormData(f => ({ ...f, designation: e.target.value }))} />
                    {errors.designation && <p className="text-xs text-red-600 mt-1">{errors.designation}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency of Translation Services</label>
                    <select suppressHydrationWarning className="w-full border rounded-lg px-3 py-2" value={formData.frequency} onChange={e => setFormData(f => ({ ...f, frequency: e.target.value }))}>
                      <option value="">Select...</option>
                      <option value="one-time">One-time only</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="ongoing">Ongoing/As needed</option>
                    </select>
                    {errors.frequency && <p className="text-xs text-red-600 mt-1">{errors.frequency}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button type="submit" disabled={processing} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60">
                {processing ? 'Saving...' : 'Continue to Quote Review'}
              </button>
            </div>
          </form>
        </div>

        {/* Inline styles for business-section animation */}
        <style jsx>{`
          .business-section { max-height: 0; opacity: 0; overflow: hidden; transition: max-height 300ms ease-out, opacity 300ms ease-out; }
          .business-section.show { max-height: 600px; opacity: 1; }
        `}</style>
      </div>
    </>
  );
}
