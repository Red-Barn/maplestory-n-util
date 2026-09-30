import type { CharacterDetail } from "@/types/msu";

/** Name, level, job and combat power — the top of every page under /character/[assetKey]. */
export default function CharacterHeader({ character }: { character: CharacterDetail }) {
  const { common, apStat } = character;
  return (
    <section className="flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- external character render */}
      <img src={character.image.imageUrl} alt="" className="h-28 w-28 object-contain" />
      <div>
        <h1 className="text-2xl font-semibold">{common.name}</h1>
        <p className="text-sm text-zinc-500">
          Lv.{common.level} ({common.expr}%) · {common.job.jobName} · {common.world.name}
        </p>
        <p className="mt-1 text-sm">
          전투력 <span className="font-semibold">{Number(apStat.combatPower).toLocaleString()}</span>
          <span className="ml-3 text-zinc-500">
            스타포스 {apStat.starforce.total} · 아케인포스 {apStat.arcaneForce.total}
          </span>
        </p>
      </div>
    </section>
  );
}
