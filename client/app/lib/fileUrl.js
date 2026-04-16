/** Build absolute URL for uploaded files served from Express /uploads */
export function getFileUrl(storedPathOrUrl) {
  if (!storedPathOrUrl) return '';
  if (String(storedPathOrUrl).startsWith('http')) return storedPathOrUrl;
  const base =
    (typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '')) ||
    'http://localhost:5001';
  const path = String(storedPathOrUrl).startsWith('/')
    ? storedPathOrUrl
    : `/${storedPathOrUrl}`;
  return `${base}${path}`;
}
