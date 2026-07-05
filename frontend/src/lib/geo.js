/**
 * Location detection: GPS first, IP fallback.
 * Never blocks the app: every call resolves within `timeoutMs`.
 */

const IP_ENDPOINT = "https://api.bigdatacloud.net/data/reverse-geocode-client";
const LS_KEY = "ps_last_location";
const LS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function readCache() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.at > LS_TTL_MS) return null;
    return parsed.value;
  } catch { return null; }
}

function writeCache(value) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ at: Date.now(), value })); } catch { /* ignore */ }
}

export function clearLocationCache() {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

export function getGpsCoords({ timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("no-gps"));
    const timer = setTimeout(() => reject(new Error("gps-timeout")), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timer); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: "gps" }); },
      (err) => { clearTimeout(timer); reject(err); },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 },
    );
  });
}

export async function getIpLocation({ timeoutMs = 4000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(IP_ENDPOINT, { signal: controller.signal });
    if (!res.ok) throw new Error("ip-http-" + res.status);
    const j = await res.json();
    return {
      lat: j.latitude,
      lng: j.longitude,
      city: j.city || j.locality,
      country: j.countryCode,
      source: "ip",
    };
  } finally { clearTimeout(timer); }
}

/**
 * Full detection. Never throws. Returns null if both attempts fail.
 * Enriches GPS results with country/city from a follow-up IP call (best-effort).
 */
export async function detectLocation({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) return cached;
  }
  let result = null;
  try {
    const gps = await getGpsCoords();
    // Fire IP call in parallel to enrich country/city — GPS alone doesn't give us that.
    let enrich = null;
    try { enrich = await getIpLocation(); } catch { /* ignore */ }
    result = {
      lat: gps.lat, lng: gps.lng, source: "gps",
      country: enrich?.country || "CL",
      city: enrich?.city || null,
    };
  } catch {
    try { result = await getIpLocation(); } catch { result = null; }
  }
  if (result) writeCache(result);
  return result;
}
