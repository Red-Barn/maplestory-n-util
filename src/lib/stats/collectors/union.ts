import type { MainStat, StatContribution, StatKey } from "../types";

/** User-entered union raider stats (the API doesn't expose union). */
export type UnionInput = Partial<Record<MainStat | "CRIT%" | "CDMG%", number>>;

export const UNION_LABEL = "유니온 공격대원";

// Union raider main stats are not multiplied by stat %, like hyper stats and arcane symbols.
const raiderStat = (key: keyof UnionInput): StatKey => (key.endsWith("%") ? (key as StatKey) : `${key as MainStat}_FIXED`);

export function collectUnion(input: UnionInput): StatContribution[] {
  return (Object.entries(input) as [keyof UnionInput, number | undefined][])
    .filter(([, v]) => v)
    .map(([key, value]) => ({
      stat: raiderStat(key),
      value: value!,
      source: "union" as const,
      label: UNION_LABEL,
    }));
}

/** Union grid (공격대 점령 효과): number of occupied cells per stat. */
export type UnionGridKey = MainStat | "ATT" | "MATT" | "CRIT%" | "CDMG%" | "BOSS%" | "IED%";
export type UnionGridInput = Partial<Record<UnionGridKey, number>>;

export const UNION_GRID_LABEL = "유니온 점령 효과";

/**
 * Stat gained per occupied cell. Unlike raider stats, grid main/sub stats ARE multiplied by
 * stat % (confirmed in-game by the user).
 */
export const UNION_GRID_PER_CELL: Record<UnionGridKey, { stat: StatKey; value: number }> = {
  STR: { stat: "STR", value: 5 },
  DEX: { stat: "DEX", value: 5 },
  INT: { stat: "INT", value: 5 },
  LUK: { stat: "LUK", value: 5 },
  ATT: { stat: "ATT", value: 1 },
  MATT: { stat: "MATT", value: 1 },
  "CRIT%": { stat: "CRIT%", value: 1 },
  "CDMG%": { stat: "CDMG%", value: 0.5 },
  "BOSS%": { stat: "BOSS%", value: 1 },
  "IED%": { stat: "IED%", value: 1 },
};

export function collectUnionGrid(cells: UnionGridInput): StatContribution[] {
  return (Object.entries(cells) as [UnionGridKey, number | undefined][])
    .filter(([, n]) => n)
    .map(([key, n]) => ({
      stat: UNION_GRID_PER_CELL[key].stat,
      value: UNION_GRID_PER_CELL[key].value * n!,
      source: "union" as const,
      label: `${UNION_GRID_LABEL} (${n}칸)`,
    }));
}
