const RESOLVE_CACHE = new Map<string, string>();
const GEOCODE_CACHE = new Map<string, { lat: number; lng: number }>();

function isShortGoogleMapsUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'maps.app.goo.gl' || (hostname === 'goo.gl' && url.includes('maps'));
  } catch {
    return false;
  }
}

function isGoogleMapsUrl(url: string): boolean {
  return url.includes('google.com/maps') || url.includes('maps.google.com');
}

function isOfficialGoogleEmbedUrl(url: string): boolean {
  return url.includes('/maps/embed');
}

/** Extrae coordenadas de una URL de Google Maps (place o share). */
export function extractCoordsFromMapsUrl(url: string): { lat: number; lng: number } | null {
  const precise = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (precise) {
    return { lat: Number.parseFloat(precise[1]), lng: Number.parseFloat(precise[2]) };
  }

  const at = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    return { lat: Number.parseFloat(at[1]), lng: Number.parseFloat(at[2]) };
  }

  const q = url.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (q) {
    return { lat: Number.parseFloat(q[1]), lng: Number.parseFloat(q[2]) };
  }

  return null;
}

/** Embed de Google Maps vía coordenadas o búsqueda por dirección. */
export function buildGoogleMapsEmbedUrl(options: {
  coords?: { lat: number; lng: number } | null;
  query?: string | null;
}): string | null {
  const { coords, query } = options;

  if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
    return `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=16&hl=es&output=embed`;
  }

  const q = query?.trim();
  if (q) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&hl=es&output=embed`;
  }

  return null;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = address.trim().toLowerCase();
  const cached = GEOCODE_CACHE.get(key);
  if (cached) return cached;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
      {
        headers: { 'User-Agent': 'OrtigaTattoo/1.0 (https://github.com/ortigatattoo)' },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(data) || !data[0]) return null;

    const coords = {
      lat: Number.parseFloat(data[0].lat),
      lng: Number.parseFloat(data[0].lon),
    };

    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return null;

    GEOCODE_CACHE.set(key, coords);
    return coords;
  } catch {
    return null;
  }
}

/** Sigue redirecciones de enlaces cortos de Google Maps hasta la URL final. */
export async function resolveGoogleMapsUrl(mapsUrl: string): Promise<string | null> {
  const trimmed = mapsUrl.trim();
  if (!trimmed) return null;

  if (isOfficialGoogleEmbedUrl(trimmed)) return trimmed;

  if (!isShortGoogleMapsUrl(trimmed)) {
    return isGoogleMapsUrl(trimmed) ? trimmed : null;
  }

  const cached = RESOLVE_CACHE.get(trimmed);
  if (cached) return cached;

  try {
    const response = await fetch(trimmed, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10_000),
    });

    const finalUrl = response.url;
    if (isGoogleMapsUrl(finalUrl)) {
      RESOLVE_CACHE.set(trimmed, finalUrl);
      return finalUrl;
    }
  } catch {
    return null;
  }

  return null;
}

/** Obtiene coordenadas desde URL de Maps o geocodificando la dirección. */
export async function resolveMapCoords(
  mapsUrl: string | null | undefined,
  address?: string | null,
): Promise<{ lat: number; lng: number } | null> {
  const trimmed = mapsUrl?.trim();
  let candidate = trimmed ?? null;

  if (trimmed && isShortGoogleMapsUrl(trimmed)) {
    candidate = (await resolveGoogleMapsUrl(trimmed)) ?? trimmed;
  }

  if (candidate) {
    const coords = extractCoordsFromMapsUrl(candidate);
    if (coords) return coords;
  }

  if (address?.trim()) {
    return geocodeAddress(address);
  }

  return null;
}

/**
 * URL para iframe del mapa en el sitio público (Google Maps).
 * Usa embed oficial de Google si está configurado; si no, coordenadas o dirección.
 */
export async function resolveMapEmbedUrl(
  mapsUrl: string | null | undefined,
  address?: string | null,
): Promise<string | null> {
  const trimmed = mapsUrl?.trim();

  if (trimmed && isOfficialGoogleEmbedUrl(trimmed)) {
    return trimmed;
  }

  const coords = await resolveMapCoords(mapsUrl, address);
  if (coords) {
    return buildGoogleMapsEmbedUrl({ coords });
  }

  return buildGoogleMapsEmbedUrl({ query: address });
}

/** Enlace externo para abrir Google Maps (nueva pestaña). */
export function toGoogleMapsLink(mapsUrl: string | null | undefined, address?: string | null): string | null {
  const trimmed = mapsUrl?.trim();
  if (trimmed) return trimmed;

  const addr = address?.trim();
  if (addr) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  }

  return null;
}

export { isShortGoogleMapsUrl };
