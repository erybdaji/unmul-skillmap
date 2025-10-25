"use client";

import { use, useEffect, useState } from "react";

export default function EditPerson({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ⬅️ params adalah Promise —> unwrap dengan React.use()
  const { id } = use(params);

  const [p, setP] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [pr, ur] = await Promise.all([
        fetch(`/api/admin/people/${id}`).then((r) => r.json()),
        fetch(`/api/units`).then((r) => r.json()),
      ]);
      setP(pr);
      setUnits(ur);
    })();
  }, [id]);

  if (!p) return <div className="p-6">Memuat…</div>;

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/people/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.NEXT_PUBLIC_ADMIN_KEY
          ? { "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_KEY }
          : {}),
      },
      body: JSON.stringify(p),
    });
    setSaving(false);
    if (!res.ok) alert("Gagal menyimpan");
    else alert("Tersimpan");
  }

  return (
    <div className="p-6 max-w-3xl space-y-3">
      <h1 className="text-xl font-semibold">Edit Dosen</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <div className="text-sm opacity-70">Nama</div>
          <input
            className="w-full border rounded px-3 py-2 bg-background text-foreground border-neutral-300 dark:border-neutral-700"
            value={p.nama || ""}
            onChange={(e) => setP({ ...p, nama: e.target.value })}
          />
        </label>

        <label className="block">
          <div className="text-sm opacity-70">Gelar Depan</div>
          <input
            className="w-full border rounded px-3 py-2 bg-background text-foreground border-neutral-300 dark:border-neutral-700"
            value={p.gelarDepan || ""}
            onChange={(e) => setP({ ...p, gelarDepan: e.target.value })}
          />
        </label>

        <label className="block">
          <div className="text-sm opacity-70">Gelar Belakang</div>
          <input
            className="w-full border rounded px-3 py-2 bg-background text-foreground border-neutral-300 dark:border-neutral-700"
            value={p.gelarBelakang || ""}
            onChange={(e) => setP({ ...p, gelarBelakang: e.target.value })}
          />
        </label>

        <label className="block">
          <div className="text-sm opacity-70">Unit</div>
          <select
            className="w-full border rounded px-3 py-2 bg-background text-foreground border-neutral-300 dark:border-neutral-700"
            value={p.unitId || ""}
            onChange={(e) =>
              setP({ ...p, unitId: e.target.value || null })
            }
          >
            <option value="">(Tanpa Unit)</option>
            {units.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm opacity-70">Pendidikan</div>
          <input
            className="w-full border rounded px-3 py-2 bg-background text-foreground border-neutral-300 dark:border-neutral-700"
            value={p.pendidikanTerakhir || ""}
            onChange={(e) =>
              setP({ ...p, pendidikanTerakhir: e.target.value })
            }
          />
        </label>

        <label className="block">
          <div className="text-sm opacity-70">Pangkat/Golongan</div>
          <input
            className="w-full border rounded px-3 py-2 bg-background text-foreground border-neutral-300 dark:border-neutral-700"
            value={p.pangkatGolongan || ""}
            onChange={(e) =>
              setP({ ...p, pangkatGolongan: e.target.value })
            }
          />
        </label>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700 hover:bg-[color-mix(in_oklab,var(--background)90%,black_10%)] disabled:opacity-60"
      >
        {saving ? "Menyimpan…" : "Simpan"}
      </button>
    </div>
  );
}
