import { API_URL } from '../services/api';

const API_BASE = API_URL.replace(/\/api\/?$/, '');

export function resolveMediaUrl(value?: string | null): string | null {
  if (!value) return null;

  const raw = value.trim();
  if (!raw) return null;

  if (
    raw.startsWith('data:') ||
    raw.startsWith('file:') ||
    raw.startsWith('content:') ||
    raw.startsWith('blob:')
  ) {
    return raw;
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;

  if (raw.startsWith('/')) return `${API_BASE}${raw}`;
  if (raw.startsWith('media/')) return `${API_BASE}/${raw}`;

  // Files sometimes arrive as bare storage paths in API payloads.
  if (
    raw.startsWith('rider_photos/') ||
    raw.startsWith('packages/') ||
    raw.startsWith('proof_of_delivery/') ||
    raw.startsWith('gcash_proofs/')
  ) {
    return `${API_BASE}/media/${raw}`;
  }

  if (!raw.includes('/')) return `${API_BASE}/media/${raw}`;

  return `${API_BASE}/${raw}`;
}
