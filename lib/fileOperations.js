import { getSupabaseServerClient } from './supabaseServer';

const BUCKET = 'orders';

async function getQuoteFiles(supabase, quoteId) {
  if (!quoteId) return [];
  
  try {
    const { data, error } = await supabase
      .from('quote_files')
      .select('id, quote_id, order_id, file_id, filename, storage_path, storage_key, file_url, signed_url, bytes, content_type, status, file_url_expires_at, file_purpose, created_at')
      .eq('quote_id', quoteId);
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`[fileOperations] Failed to fetch quote files for quote_id ${quoteId}:`, err);
    return [];
  }
}

async function getQuoteReferenceMaterials(supabase, quoteId) {
  if (!quoteId) return [];
  
  try {
    const { data, error } = await supabase
      .from('quote_reference_materials')
      .select('id, quote_id, filename, storage_path, file_url, signed_url, bytes, content_type, file_url_expires_at, file_purpose, notes, created_at')
      .eq('quote_id', quoteId);
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`[fileOperations] Failed to fetch reference materials for quote_id ${quoteId}:`, err);
    return [];
  }
}

async function regenerateSignedUrlIfNeeded(supabase, file) {
  if (!file || !file.storage_path) return file;
  
  let url = file.file_url || file.signed_url || null;
  
  const isExpired = file.file_url_expires_at && new Date(file.file_url_expires_at) < new Date();
  const needsUrl = !url || isExpired;
  
  if (needsUrl) {
    try {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(file.storage_path, 3600);
      if (signed?.signedUrl) {
        url = signed.signedUrl;
      }
    } catch (err) {
      console.error(`[fileOperations] Failed to generate signed URL for file ${file.id}:`, err);
    }
  }
  
  return { ...file, file_url: url };
}

async function getOrderFilesFromQuote(supabase, quoteId) {
  if (!quoteId) return { documents: [], reference_materials: [] };
  
  try {
    const [files, referenceFiles] = await Promise.all([
      getQuoteFiles(supabase, quoteId),
      getQuoteReferenceMaterials(supabase, quoteId)
    ]);
    
    const filesWithUrls = await Promise.all(
      (files || []).map(f => regenerateSignedUrlIfNeeded(supabase, f))
    );
    
    const referencesWithUrls = await Promise.all(
      (referenceFiles || []).map(f => regenerateSignedUrlIfNeeded(supabase, f))
    );
    
    return {
      documents: filesWithUrls,
      reference_materials: referencesWithUrls
    };
  } catch (err) {
    console.error(`[fileOperations] Failed to get order files from quote ${quoteId}:`, err);
    return { documents: [], reference_materials: [] };
  }
}

export {
  getQuoteFiles,
  getQuoteReferenceMaterials,
  regenerateSignedUrlIfNeeded,
  getOrderFilesFromQuote
};
