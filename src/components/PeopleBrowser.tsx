"use client";

import { useEffect, useMemo, useState } from "react";

type Unit = { id: string; name: string };
type Person = {
  id: string;
  nama: string;
  gelarDepan?: string | null;
  gelarBelakang?: string | null;
  unit: Unit | null;
  pendidikanTerakhir?: string | null;
  pangkatGolongan?: string | null;
  skills: { id: string; name: string; slug: string; level: number | null }[];
};

const card = "rounded-2xl border p-4 bg-background text-foreground border-neutral-200 dark:border-neutral-800";

export default function PeopleBrowser() {
  const [query, setQuery] = useState("");
  const [unitId, setUnitId] = useState("");
  const [skill, setSkill] = useState("");
  const [degree, setDegree] = useState("");
  const [rank, setRank] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [skills, setSkills] = useState<{ slug: string; name: string }[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

  // ambil master (unit & skill) satu kali
  useEffect(() => {
    (async () => {
      const [u, s] = await Promise.all([
        fetch("/api/units", { cache: "no-store" }).then(r => r.json()).catch(() => []),
        fetch("/api/skills", { cache: "no-store" }).then(r => r.json()).catch(() => []),
      ]);
      setUnits(u?.items ?? u ?? []);
      setSkills(s?.items ?? s ?? []);
    })();
  }, []);

  // ambil daftar dosen hanya kalau ada filter yang dipilih
  const canSearch = useMemo(
    () => !!(query || unitId || skill || degree || rank),
    [query, unitId, skill, degree, rank]
  );

  useEffect(() => {
    if (!canSearch) { setPeople([]); return; }
    setLoading(true);
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (unitId) p.set("unitId", unitId);
    if (skill) p.set("skill", skill);
    if (degree) p.set("degree", degree);
    if (rank) p.set("rank", rank);
    p.set("take", "50");

    fetch(`/api/people?${p.toString()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(j => setPeople(j.items ?? []))
      .finally(() => setLoading(false));
  }, [query, unitId, skill, degree, rank, canSearch]);

  return (
    <div className={card}>
      <div className="font-semibold mb-3">Jelajah Dosen Berdasarkan Filter</div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700 flex-1"
          placeholder="Cari nama…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <select
          className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700"
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
        >
          <option value="">Unit/Fakultas</option>
          {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>

        <select
          className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
        >
          <option value="">Keahlian</option>
          {skills.slice(0, 200).map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>

        <select
          className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700"
          value={degree}
          onChange={(e) => setDegree(e.target.value)}
        >
          <option value="">Pendidikan</option>
          <option value="S1">S1</option>
          <option value="S2">S2</option>
          <option value="S3">S3</option>
        </select>

        <select
          className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700"
          value={rank}
          onChange={(e) => setRank(e.target.value)}
        >
          <option value="">Pangkat</option>
          <option value="III">III</option>
          <option value="IV">IV</option>
        </select>
      </div>

      {!canSearch ? (
        <div className="text-sm text-neutral-500">
          Pilih salah satu filter (atau ketik nama) untuk menampilkan daftar dosen.
        </div>
      ) : loading ? (
        <div>Memuat…</div>
      ) : (
        <ul className="space-y-2">
          {people.map(p => (
            <li key={p.id} className="rounded-xl border p-3 border-neutral-200 dark:border-neutral-800">
              <div className="font-medium">
                {[p.gelarDepan, p.nama, p.gelarBelakang].filter(Boolean).join(" ").replace(/\s+/g, " ")}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                {p.unit?.name ?? "Tanpa Unit"} • {p.pendidikanTerakhir ?? "—"} • {p.pangkatGolongan ?? "—"}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {p.skills.map(s => (
                  <span key={s.id} className="px-2 py-0.5 rounded-full text-xs border border-neutral-300 dark:border-neutral-700">
                    {s.name}
                  </span>
                ))}
              </div>
            </li>
          ))}
          {people.length === 0 && <li>Tidak ada data.</li>}
        </ul>
      )}
    </div>
  );
}
