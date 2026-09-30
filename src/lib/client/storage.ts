import { SEASON_BUFF_ID } from "@/data/jobs/common";

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

/** Per-character stat panel settings (buff checks, union, link levels, ...). */
export const statPanelKey = (assetKey: string) => `msn:stat-panel:${assetKey}`;

// Whether each character is using the season buff, set on the character list before loading.
// The API stat snapshot includes the buff only for characters that have it on.
const SEASON_KEY = "msn:season-buff";

type PanelBuffs = { buffs?: Record<string, boolean> };

/** Falls back to the buff check saved on the character page before this setting existed. */
export function loadSeasonBuff(assetKey: string): boolean {
  const flag = load<Record<string, boolean>>(SEASON_KEY, {})[assetKey];
  return flag ?? load<PanelBuffs>(statPanelKey(assetKey), {}).buffs?.[SEASON_BUFF_ID] ?? false;
}

export function saveSeasonBuff(assetKey: string, on: boolean) {
  save(SEASON_KEY, { ...load<Record<string, boolean>>(SEASON_KEY, {}), [assetKey]: on });
  // keep the character page's buff check in line, so it opens with no buff change
  const panel = load<PanelBuffs | null>(statPanelKey(assetKey), null);
  if (panel?.buffs) save(statPanelKey(assetKey), { ...panel, buffs: { ...panel.buffs, [SEASON_BUFF_ID]: on } });
}
