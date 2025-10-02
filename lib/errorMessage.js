export function getErrorMessage(err) {
  try {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    if (err.error && typeof err.error === 'string') return err.error;
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}
