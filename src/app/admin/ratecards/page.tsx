"use client";

import { useEffect, useState } from "react";

type RC = {
  id: string; personId: string; unit: "HOUR"|"DAY"|"PACKAGE";
  amountIDR: number; skillId?: string | null;
  skill?: { id: string; name: string; slug: string } | null;
};

export default function RatecardsAdmin() {
  const [people, setPeople] = useState<any[]>([]);
  const [personId, setPersonId] = useState("");
  const [rates, setRates] = useState<RC[]>([]);
  const [amount, setAmount] = useState<number>(0);
  const [unit, setUnit] = useState<"HOUR"|"DAY"|"PACKAGE">("HOUR");
  const [skill, setSkill] = useState<string>("");

  useEffect(() => {
    fetch("/api/people?take=100").then(r=>r.json()).then(j=>setPeople(j.items ?? []));
  }, []);

  useEffect(() => {
    if (!personId) { setRates([]); return; }
    fetch(`/api/ratecards?personId=${personId}`).then(r=>r.json()).then(setRates);
  }, [personId]);

  async function addRate() {
    if (!personId || !amount) return;
    const body: any = { personId, amountIDR: amount, unit };
    if (skill) body.skillSlug = skill;
    const r = await fetch("/api/ratecards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const list = await fetch(`/api/ratecards?personId=${personId}`).then(r=>r.json());
      setRates(list);
      setAmount(0);
      setSkill("");
    } else {
      alert("Gagal menambah rate");
    }
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Rate Card</h1>

      <div className="flex gap-2 mb-4">
        <select className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700"
          value={personId} onChange={(e)=>setPersonId(e.target.value)}>
          <option value="">Pilih Dosen…</option>
          {people.map(p=> <option key={p.id} value={p.id}>{p.nama}</option>)}
        </select>
        <input type="number" placeholder="Nominal"
          className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700"
          value={amount||""} onChange={(e)=>setAmount(Number(e.target.value))} />
        <select className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700"
          value={unit} onChange={(e)=>setUnit(e.target.value as any)}>
          <option>HOUR</option><option>DAY</option><option>PACKAGE</option>
        </select>
        <input placeholder="Skill slug (opsional)"
          className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700"
          value={skill} onChange={(e)=>setSkill(e.target.value)} />
        <button onClick={addRate}
          className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700">
          Tambah
        </button>
      </div>

      <table className="w-full text-sm rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
        <thead className="bg-neutral-100 dark:bg-neutral-900/50">
          <tr>
            <th className="text-left p-2">Unit</th>
            <th className="text-left p-2">Nominal</th>
            <th className="text-left p-2">Skill</th>
            <th className="p-2">Tanggal Efektif</th>
          </tr>
        </thead>
        <tbody>
          {rates.map(r=> (
            <tr key={r.id} className="border-t border-neutral-200 dark:border-neutral-800">
              <td className="p-2">{r.unit}</td>
              <td className="p-2">Rp {r.amountIDR.toLocaleString("id-ID")}</td>
              <td className="p-2">{r.skill?.name ?? "Umum"}</td>
              <td className="p-2">{/* bisa tampilkan effectiveAt jika API mengembalikan */}</td>
            </tr>
          ))}
          {rates.length === 0 && <tr><td className="p-2" colSpan={4}>Belum ada rate.</td></tr>}
        </tbody>
      </table>
    </main>
  );
}
