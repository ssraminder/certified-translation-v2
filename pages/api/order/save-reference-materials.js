import { withApiBreadcrumbs } from '../../../lib/sentry';
import { getSupabaseServerClient } from '../../../lib/supabaseServer';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { quoteId, jobId, referenceFiles, notes, formData, uploadSessionId } = req.body;

  if (!quoteId || !jobId) {
    return res.status(400).json({ error: 'quoteId and jobId are required' });
  }

  try {
    const supabase = getSupabaseServerClient();
    const insertData = [];

    if (referenceFiles && Array.isArray(referenceFiles) && referenceFiles.length > 0) {
      const refFileInserts = referenceFiles.map(u => ({
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
        source_lang: formData?.sourceLanguage,
        target_lang: formData?.targetLanguage,
        country_of_issue: formData?.countryOfIssue,
        status: 'uploaded',
        upload_session_id: uploadSessionId,
        file_purpose: 'reference'
      }));
      insertData.push(...refFileInserts);
    }

    if (notes && notes.trim()) {
      insertData.push({
        quote_id: quoteId,
        job_id: jobId,
        notes: notes,
        file_purpose: 'notes',
        status: 'uploaded',
        upload_session_id: uploadSessionId,
        source_lang: formData?.sourceLanguage,
        target_lang: formData?.targetLanguage,
        country_of_issue: formData?.countryOfIssue
      });
    }

    if (insertData.length === 0) {
      return res.status(200).json({ success: true, message: 'No data to save' });
    }

    const { error } = await supabase
      .from('quote_reference_materials')
      .insert(insertData);

    if (error) {
      console.error('Quote reference materials insert error:', error);
      return res.status(500).json({ error: error.message || 'Failed to save reference materials' });
    }

    return res.status(200).json({ success: true, message: 'Reference materials saved' });
  } catch (err) {
    console.error('Save reference materials error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

export default withApiBreadcrumbs(handler);
