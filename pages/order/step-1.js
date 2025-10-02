import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/supabaseClient';
import { jsPDF } from 'jspdf';
import mammoth from 'mammoth';

const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50MB
const BUCKET = 'orders';

function bytesToMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function classNames(...arr) { return arr.filter(Boolean).join(' '); }

export default function Step1() {
  const [rawFiles, setRawFiles] = useState([]); // File[]
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [uploadSessionId] = useState(() => crypto.randomUUID());

  const [languages, setLanguages] = useState([]);
  const [intendedUses, setIntendedUses] = useState([]);

  const [formData, setFormData] = useState({
    sourceLanguage: '',
    targetLanguage: '',
    intendedUseId: '',
    countryOfIssue: ''
  });
  const [customLanguage, setCustomLanguage] = useState('');
  const [showCustomLanguage, setShowCustomLanguage] = useState(false);

  const totalBytes = useMemo(() => rawFiles.reduce((sum, f) => sum + (f.size || 0), 0), [rawFiles]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: langs } = await supabase
        .from('languages')
        .select('id, language, iso_code, tier')
        .order('language');
      setLanguages(langs || []);

      const { data: uses } = await supabase
        .from('intended_uses')
        .select('id, name, description, certification_type, certification_price')
        .order('name');
      setIntendedUses(uses || []);
    };
    fetchData();
  }, []);

  const onDrop = useCallback((files) => {
    const accepted = [];
    for (const f of files) {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(ext)) {
        accepted.push(f);
      }
    }
    setRawFiles(prev => [...prev, ...accepted]);
  }, []);

  const onInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    onDrop(files);
  };

  const removeFile = (idx) => {
    setRawFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSourceLanguageChange = (value) => {
    setFormData(fd => ({ ...fd, sourceLanguage: value, targetLanguage: '' }));
    setShowCustomLanguage(false);
    setCustomLanguage('');
  };

  const handleTargetLanguageChange = (value) => {
    if (formData.sourceLanguage && formData.sourceLanguage !== 'English') {
      if (value === 'other') {
        setShowCustomLanguage(true);
        setFormData(fd => ({ ...fd, targetLanguage: '' }));
      } else {
        setShowCustomLanguage(false);
        setCustomLanguage('');
        setFormData(fd => ({ ...fd, targetLanguage: value }));
      }
    } else {
      setFormData(fd => ({ ...fd, targetLanguage: value }));
    }
  };

  const validateStep1 = () => {
    const e = {};
    if (rawFiles.length === 0) e.files = 'Upload at least one document';
    if (totalBytes > MAX_TOTAL_BYTES) e.files = 'Total file size exceeds 50MB';
    if (!formData.sourceLanguage) e.sourceLanguage = 'Required';
    if (!(formData.targetLanguage || customLanguage)) e.targetLanguage = 'Required';
    if (!formData.intendedUseId) e.intendedUseId = 'Required';
    if (!formData.countryOfIssue) e.countryOfIssue = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  async function convertDocxToPDF(docxFile) {
    const arrayBuffer = await docxFile.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value || '';
    const pdf = new jsPDF();
    const lines = pdf.splitTextToSize(text, 180);
    let y = 20;
    for (const line of lines) {
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, 15, y);
      y += 7;
    }
    const blob = pdf.output('blob');
    const filename = docxFile.name.replace(/\.(docx?|DOCX?)$/, '.pdf');
    return { blob, filename };
  }

  async function combineImagesToPDF(imageFiles) {
    const pdf = new jsPDF();
    let isFirstPage = true;
    for (const imgFile of imageFiles) {
      const imgData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(imgFile);
      });
      if (!isFirstPage) pdf.addPage();
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = imgData;
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgRatio = img.width / img.height;
      const pageRatio = pageWidth / pageHeight;
      let finalWidth, finalHeight;
      if (imgRatio > pageRatio) {
        finalWidth = pageWidth;
        finalHeight = pageWidth / imgRatio;
      } else {
        finalHeight = pageHeight;
        finalWidth = pageHeight * imgRatio;
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, finalWidth, finalHeight, undefined, 'MEDIUM');
      isFirstPage = false;
    }
    const blob = pdf.output('blob');
    const filename = `combined_images_${Date.now()}.pdf`;
    return { blob, filename };
  }

  async function uploadPDFToStorage(pdfBlob, filename) {
    const fileId = crypto.randomUUID();
    const storagePath = `${uploadSessionId}/${fileId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, pdfBlob, { contentType: 'application/pdf', upsert: false });
    if (uploadError) throw uploadError;

    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 86400);

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    return {
      fileId,
      filename,
      storagePath,
      storageKey: storagePath,
      fileUrl: publicUrlData.publicUrl,
      signedUrl: urlData?.signedUrl || null,
      bytes: pdfBlob.size || 0,
    };
  }

  async function getLanguageDataByName(name) {
    const { data, error } = await supabase
      .from('languages')
      .select('id, language, iso_code, tier')
      .eq('language', name)
      .single();
    if (error) return null;
    return data;
  }

  async function getTierMultiplier(tierName) {
    if (!tierName) return { name: null, multiplier: null };
    const { data } = await supabase
      .from('language_tiers')
      .select('name, multiplier')
      .eq('name', tierName)
      .single();
    return data || { name: null, multiplier: null };
  }

  async function generateJobId() {
    try {
      const { data, error } = await supabase.rpc('generate_job_id');
      if (!error && data) return data;
    } catch (e) {}
    const { data: last } = await supabase
      .from('quote_submissions')
      .select('job_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last?.job_id) {
      const num = parseInt(String(last.job_id).replace('CS', '')) + 1;
      return 'CS' + String(num).padStart(6, '0');
    }
    const random = Math.floor(Math.random() * 900) + 100;
    return 'CS' + String(random).padStart(6, '0');
  }

  async function triggerWebhook(quoteId) {
    const url = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    if (!url) return;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quoteId })
      });
    } catch (e) {
      // ignore
    }
  }

  async function handleSubmit() {
    if (!validateStep1()) return;
    setProcessing(true);
    setProcessingStep('Preparing files...');

    try {
      const pdfUploads = [];
      const imageFiles = rawFiles.filter(f => ['jpg','jpeg','png'].includes((f.name.split('.').pop()||'').toLowerCase()));
      const nonImage = rawFiles.filter(f => !['jpg','jpeg','png'].includes((f.name.split('.').pop()||'').toLowerCase()));

      for (const f of nonImage) {
        const ext = (f.name.split('.').pop() || '').toLowerCase();
        if (ext === 'pdf') {
          const uploaded = await uploadPDFToStorage(f, f.name);
          pdfUploads.push(uploaded);
        } else if (ext === 'doc' || ext === 'docx') {
          const { blob, filename } = await convertDocxToPDF(f);
          const uploaded = await uploadPDFToStorage(blob, filename);
          pdfUploads.push(uploaded);
        }
      }

      if (imageFiles.length > 0) {
        const { blob, filename } = await combineImagesToPDF(imageFiles);
        const uploaded = await uploadPDFToStorage(blob, filename);
        pdfUploads.push(uploaded);
      }

      setProcessingStep('Calculating pricing...');
      const src = await getLanguageDataByName(formData.sourceLanguage);
      const tgt = customLanguage ? null : await getLanguageDataByName(formData.targetLanguage);
      const tier = await getTierMultiplier(src?.tier || null);

      const intendedUse = intendedUses.find(u => String(u.id) === String(formData.intendedUseId));
      const certTypeName = intendedUse?.certification_type || null;
      const certTypeAmount = intendedUse?.certification_price ?? null;
      const certTypeCode = intendedUse?.certification_type || null;

      setProcessingStep('Creating quote...');
      const quoteId = crypto.randomUUID();
      const jobId = await generateJobId();

      const { error: insertErr } = await supabase
        .from('quote_submissions')
        .insert({
          quote_id: quoteId,
          job_id: jobId,
          name: null,
          email: null,
          phone: null,
          source_lang: formData.sourceLanguage,
          target_lang: customLanguage || formData.targetLanguage,
          source_code: src?.iso_code || null,
          target_code: tgt?.iso_code || null,
          intended_use: intendedUse?.name || null,
          intended_use_id: intendedUse?.id || null,
          country_of_issue: formData.countryOfIssue,
          status: 'draft',
          payment_status: 'unpaid',
          language_tier: tier?.name || src?.tier || null,
          language_tier_multiplier: tier?.multiplier || null,
          tier_name: tier?.name || src?.tier || null,
          tier_multiplier: tier?.multiplier || null,
          cert_type_name: certTypeName,
          cert_type_amount: certTypeAmount,
          cert_type_code: certTypeCode,
          cert_type_rate: certTypeAmount,
          hitl_required: !!customLanguage
        });
      if (insertErr) throw insertErr;

      setProcessingStep('Saving files...');
      const fileInserts = pdfUploads.map(u => ({
        quote_id: quoteId,
        job_id: jobId,
        file_id: u.fileId,
        filename: u.filename,
        storage_path: u.storagePath,
        storage_key: u.storageKey,
        file_url: u.fileUrl,
        signed_url: u.signedUrl,
        bytes: u.bytes,
        content_type: 'application/pdf',
        source_lang: formData.sourceLanguage,
        target_lang: customLanguage || formData.targetLanguage,
        intended_use_id: intendedUse?.id || null,
        country_of_issue: formData.countryOfIssue,
        status: 'uploaded',
        upload_session_id: uploadSessionId,
        file_url_expires_at: new Date(Date.now() + 86400000).toISOString()
      }));
      const { error: filesErr } = await supabase.from('quote_files').insert(fileInserts);
      if (filesErr) throw filesErr;

      setProcessingStep('Starting analysis...');
      triggerWebhook(quoteId);
      window.location.href = `/order/step-2?quote=${quoteId}&job=${jobId}`;
    } catch (err) {
      console.error(err);
      setProcessing(false);
      alert('Something went wrong. Please try again.');
    }
  }

  const targetOptions = useMemo(() => {
    if (!formData.sourceLanguage) return [];
    if (formData.sourceLanguage === 'English') return languages.map(l => l.language);
    return ['English', 'other'];
  }, [formData.sourceLanguage, languages]);

  return (
    <>
      <Head>
        <title>Step 1 - Document Upload</title>
      </Head>
      <div className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Upload documents & translation details</h1>
          <p className="text-sm text-gray-600 mb-6">Total: {bytesToMB(totalBytes)}MB / 50MB</p>

          {/* Uploader */}
          <div className={classNames(
            'border-2 border-dashed rounded-xl p-6 mb-6',
            totalBytes > MAX_TOTAL_BYTES ? 'border-red-400 bg-red-50' : 'border-gray-300'
          )}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); onDrop(Array.from(e.dataTransfer.files || [])); }}
          >
            <div className="text-center">
              <p className="text-gray-800 font-medium">Drag & drop files here</p>
              <p className="text-gray-500 text-sm mb-3">PDF, DOC, DOCX, JPG, JPEG, PNG</p>
              <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer">
                <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={onInputChange} />
                Browse files
              </label>
            </div>
          </div>
          {errors.files && <p className="text-sm text-red-600 mb-4">{errors.files}</p>}

          {rawFiles.length > 0 && (
            <ul className="mb-6 divide-y divide-gray-200 border border-gray-200 rounded-lg">
              {rawFiles.map((f, idx) => (
                <li key={idx} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm text-gray-900">{f.name}</p>
                    <p className="text-xs text-gray-500">{bytesToMB(f.size)}MB</p>
                  </div>
                  <button className="text-sm text-red-600 hover:underline" onClick={() => removeFile(idx)}>Remove</button>
                </li>
              ))}
            </ul>
          )}

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source language</label>
              <select className="w-full border rounded-lg px-3 py-2" value={formData.sourceLanguage} onChange={e => handleSourceLanguageChange(e.target.value)}>
                <option value="">Select...</option>
                {languages.map(l => <option key={l.id} value={l.language}>{l.language}</option>)}
              </select>
              {errors.sourceLanguage && <p className="text-xs text-red-600 mt-1">{errors.sourceLanguage}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target language</label>
              {formData.sourceLanguage && formData.sourceLanguage !== 'English' ? (
                <select className="w-full border rounded-lg px-3 py-2" value={formData.targetLanguage} onChange={e => handleTargetLanguageChange(e.target.value)}>
                  <option value="">Select...</option>
                  {targetOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <select className="w-full border rounded-lg px-3 py-2" value={formData.targetLanguage} onChange={e => handleTargetLanguageChange(e.target.value)}>
                  <option value="">Select...</option>
                  {targetOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}
              {showCustomLanguage && (
                <input className="mt-2 w-full border rounded-lg px-3 py-2" placeholder="Please specify language" value={customLanguage} onChange={e => setCustomLanguage(e.target.value)} />
              )}
              {errors.targetLanguage && <p className="text-xs text-red-600 mt-1">{errors.targetLanguage}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intended use</label>
              <select className="w-full border rounded-lg px-3 py-2" value={formData.intendedUseId} onChange={e => setFormData(fd => ({ ...fd, intendedUseId: e.target.value }))}>
                <option value="">Select...</option>
                {intendedUses.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {errors.intendedUseId && <p className="text-xs text-red-600 mt-1">{errors.intendedUseId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country of issue</label>
              <input className="w-full border rounded-lg px-3 py-2" value={formData.countryOfIssue} onChange={e => setFormData(fd => ({ ...fd, countryOfIssue: e.target.value }))} />
              {errors.countryOfIssue && <p className="text-xs text-red-600 mt-1">{errors.countryOfIssue}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSubmit} disabled={processing} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60">
              {processing ? 'Processing...' : 'Continue to Personal Information'}
            </button>
            {processing && <p className="text-sm text-gray-600">{processingStep}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
