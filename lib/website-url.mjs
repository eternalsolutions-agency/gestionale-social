// Accept ordinary website addresses while rejecting credentials and non-web schemes.
export function normalizeWebsiteUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Inserisci il sito da analizzare.');
  }
  let raw = value.trim();
  if (raw.startsWith('//')) raw = `https:${raw}`;
  else if (!/^https?:\/\//i.test(raw)) {
    const hostWithPort = /^[^/?#:\s]+:\d+(?:[/?#]|$)/.test(raw);
    if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !hostWithPort) {
      throw new Error('Inserisci un indirizzo web valido, per esempio www.tuosito.it.');
    }
    raw = `https://${raw}`;
  }
  let url;
  try { url = new URL(raw); } catch {
    throw new Error('Inserisci un indirizzo web valido, per esempio www.tuosito.it.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error('Inserisci un indirizzo web valido, senza credenziali.');
  }
  return url.toString();
}
