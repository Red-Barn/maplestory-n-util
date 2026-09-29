"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { jobName } from "@/data/jobNames";
import { load, loadRecent, save, type RecentCharacter } from "@/lib/client/storage";
import type { AccountCharacter } from "@/types/msu";

const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;
const WALLET_KEY = "msn:wallet";

export default function CharacterSearch() {
  const [wallet, setWallet] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [results, setResults] = useState<AccountCharacter[]>();
  const [recent, setRecent] = useState<RecentCharacter[]>([]);

  useEffect(() => {
    // localStorage is only readable after mount
    /* eslint-disable react-hooks/set-state-in-effect */
    setWallet(load(WALLET_KEY, ""));
    setRecent(loadRecent());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const w = wallet.trim();
    if (!WALLET_RE.test(w)) {
      setError("지갑 주소는 0x로 시작하는 42자리여야 합니다.");
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const qs = name.trim() ? `?name=${encodeURIComponent(name.trim())}` : "";
      const res = await fetch(`/api/accounts/${w}/characters${qs}`);
      // A crashed server answers with an HTML error page, not our JSON.
      const body = (await res.json().catch(() => null)) as { characters?: AccountCharacter[]; error?: string } | null;
      if (!res.ok || !body?.characters) {
        throw new Error(body?.error ?? `서버 오류가 발생했습니다 (HTTP ${res.status}). 잠시 후 다시 시도해 주세요.`);
      }
      save(WALLET_KEY, w);
      const list = body.characters.sort(
        (a, b) => Number(b.data.combatPower) - Number(a.data.combatPower),
      );
      setResults(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResults(undefined);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={search} className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
        <label className="block space-y-1">
          <span className="text-sm font-medium">지갑 주소</span>
          <input
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x..."
            spellCheck={false}
            className="w-full rounded border border-black/15 bg-transparent px-3 py-2 font-mono text-sm dark:border-white/20"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">캐릭터 이름 (선택, 정확히 일치)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            className="w-full rounded border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            disabled={loading}
            className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? "불러오는 중…" : "캐릭터 불러오기"}
          </button>
          <p className="text-xs text-zinc-500">
            MSU Open API는 지갑 주소 없이 이름만으로 캐릭터를 검색할 수 없습니다 (마켓 검색은 판매 중인 캐릭터만 대상).
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {results && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">캐릭터 {results.length}명</h2>
          {results.length === 0 ? (
            <p className="text-sm text-zinc-500">해당 지갑에 캐릭터가 없습니다.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {results.map((c) => (
                <li key={c.assetKey}>
                  <CharacterCard
                    assetKey={c.assetKey}
                    name={c.name}
                    imageUrl={c.data.imageUrl}
                    level={c.data.level}
                    sub={jobName(c.data.jobCode)}
                    power={Number(c.data.combatPower)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">최근 조회</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {recent.map((c) => (
              <li key={c.assetKey}>
                <CharacterCard assetKey={c.assetKey} name={c.name} imageUrl={c.imageUrl} level={c.level} sub={c.jobName} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CharacterCard(props: { assetKey: string; name: string; imageUrl: string; level: number; sub?: string; power?: number }) {
  return (
    <Link
      href={`/character/${props.assetKey}`}
      className="flex items-center gap-3 rounded-lg border border-black/10 p-3 hover:border-orange-500 dark:border-white/15"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external character renders, no optimisation needed */}
      <img src={props.imageUrl} alt="" className="h-16 w-16 object-contain" />
      <div className="min-w-0">
        <p className="truncate font-medium">{props.name}</p>
        <p className="text-xs text-zinc-500">
          Lv.{props.level}
          {props.sub && ` · ${props.sub}`}
        </p>
        {props.power !== undefined && <p className="text-xs text-zinc-500">전투력 {props.power.toLocaleString()}</p>}
      </div>
    </Link>
  );
}
