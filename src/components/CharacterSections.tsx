"use client";

import EquipmentGrid from "@/components/EquipmentGrid";
import StatPanel from "@/components/StatPanel";
import { findJob } from "@/data/jobs";
import { useWornBundle } from "@/lib/client/useCharacterStats";
import type { CharacterBundle } from "@/types/msu";

/**
 * Stat panel and equipment grid. They share the equipment the user can take off (the special
 * ring, which the API doesn't return and is assumed worn), so both show the same set of items.
 */
export default function CharacterSections({ bundle, missing }: { bundle: CharacterBundle; missing: number }) {
  const { character } = bundle;
  const job = findJob(character.common.job.jobCode);
  const { worn, specialRing, setSpecialRing } = useWornBundle(bundle);

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">스탯</h2>
        <StatPanel bundle={worn} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">장착 장비</h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={specialRing}
              onChange={(e) => setSpecialRing(e.target.checked)}
            />
            특수 반지 착용
          </label>
        </div>
        {missing > 0 && (
          <p className="text-xs text-zinc-500">
            장비 {missing}개의 정보를 불러오지 못해 스탯 계산에서 빠졌습니다. 잠시 후 새로고침해 주세요.
          </p>
        )}
        <p className="text-xs text-zinc-500">
          장비를 누르면 기본·스타포스·추가옵션 수치와 잠재능력이 보입니다. 특수 반지는 API에 없어 착용한 것으로 보고
          더합니다. 끼지 않았다면 체크를 해제하세요.
        </p>
        <EquipmentGrid
          equip={character.wearing.equip}
          items={worn.items}
          job={job && { mainStat: job.mainStat, subStats: job.subStats, attackType: job.attackType }}
        />
      </section>
    </>
  );
}
