import { withApiBreadcrumbs } from '../../lib/sentry';

function handler(req, res) {
  res.status(200).json({ status: 'ok' });
}

export default withApiBreadcrumbs(handler);
