// localStorage helpers — convenience only, every access may throw (private mode, blocked storage).

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export type RecentCharacter = { assetKey: string; name: string; jobName: string; level: number; imageUrl: string };

const RECENT_KEY = "msn:recent";

export function pushRecent(c: RecentCharacter) {
  const list = load<RecentCharacter[]>(RECENT_KEY, []).filter((r) => r.assetKey !== c.assetKey);
  save(RECENT_KEY, [c, ...list].slice(0, 8));
}

export const loadRecent = () => load<RecentCharacter[]>(RECENT_KEY, []);
