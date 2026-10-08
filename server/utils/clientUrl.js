// Picks the public URL of the React app for links inside emails.
// Priority: FRONTEND_URL, then the first NON-local entry of CLIENT_URL, then the first entry.
const clientBase = () => {
  const list = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const isLocal = (origin) => /localhost|127\.0\.0\.1|192\.168\./.test(origin);
  return list.find((origin) => !isLocal(origin)) || list[0] || 'http://localhost:5173';
};

module.exports = { clientBase };
