export function getErrorMessage(err) {
  try {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err instanceof Error && err.message) return err.message;
    if (typeof Response !== 'undefined' && err instanceof Response) {
      return `Request failed: ${err.status} ${err.statusText}`;
    }
    if (typeof err === 'object') {
      if (err.message) return err.message;
      if (err.error && typeof err.error === 'string') return err.error;
      if (err.error && typeof err.error === 'object' && err.error.message) return err.error.message;
      if (err.data && err.data.message) return err.data.message;
      if (err.details) return `${err.details}`;
      try { return JSON.stringify(err); } catch { return String(err); }
    }
    return String(err);
  } catch {
    return 'Unknown error';
  }
}
