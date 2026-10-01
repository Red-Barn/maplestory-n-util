"use client";

import type { ItemDetail } from "@/types/msu";
import ItemSelector from "./ItemSelector";
import OptionCalculator from "./OptionCalculator";
import TierUpCalculator from "./TierUpCalculator";
import { usePotentialItem } from "./usePotentialItem";

/** Potential calculators: one item selection shared by the tier-up and option roll calculators. */
export default function PotentialCalculator({ items }: { items: Record<string, ItemDetail | null> }) {
  const sel = usePotentialItem(items);
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">장비</h2>
        <ItemSelector sel={sel} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">잠재능력 등급 업</h2>
        <p className="text-xs text-zinc-500">
          큐브 하나를 쓸 때마다 정해진 확률로 등급이 한 단계 오릅니다. 목표 등급까지 필요한 큐브 개수와 비용을
          계산합니다.
        </p>
        {/* remount when the item changes so grade and price follow the new item */}
        <TierUpCalculator key={sel.resetKey} sel={sel} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">옵션 출현 확률</h2>
        <p className="text-xs text-zinc-500">
          원하는 옵션 세트가 큐브 한 번에 나올 확률과, 그만큼 나오기까지 필요한 큐브 개수·비용을 계산합니다.
        </p>
        <OptionCalculator sel={sel} />
      </section>
    </div>
  );
}
