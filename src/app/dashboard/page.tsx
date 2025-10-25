"use client";

import { useEffect, useRef, useState } from "react";
import EstimatorDrawer, {
  EstimatorDrawerHandle,
} from "../components/EstimatorDrawer";

/** Tipe sesuai bentuk data dari /api/people */
type Skill = { id: string; name: string; slug: string; level: number };
type Person = {
  id: string;
  nama: string;
  gelarDepan?: string | null;
  gelarBelakang?: string | null;
  unit?: { id: string; name: string } | null;
  skills: Skill[];
};

export default function Dashboard() {
  // pencarian
  const [q, setQ] = useState("");
  // hasil
  const [data, setData] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

  // estimator
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<EstimatorDrawerHandle>(null);
  const [estCount, setEstCount] = useState(0);

  // untuk menghindari hydration mismatch saat menampilkan badge
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/people?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();
    setData(json.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addToEstimator(p: Person) {
    const skillSlug = p.skills[0]?.slug; // pakai skill pertama jika ada
    setDrawerOpen(true);
    // pastikan drawer sudah mount sebelum memanggil add()
    setTimeout(() => {
      drawerRef.current?.add({
        personId: p.id,
        personName: [p.gelarDepan, p.nama, p.gelarBelakang]
          .filter(Boolean)
          .join(" "),
        skillSlug,
        quantity: 1,
        unit: "HOUR",
      });
    }, 0);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Pemetaan Keahlian Unmul</h1>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama/keyword…"
          className="w-full rounded-xl px-3 py-2 border
                     bg-background text-foreground placeholder-neutral-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     border-neutral-300 dark:border-neutral-700 dark:placeholder-neutral-400"
        />
        <button
          onClick={load}
          className="rounded-xl px-4 py-2 border
                     bg-background text-foreground
                     hover:bg-[color-mix(in_oklab,var(--background)90%,black 10%)]
                     border-neutral-300 dark:border-neutral-700"
        >
          Cari
        </button>
      </div>

      {/* Hasil */}
      {loading ? (
        <div>Memuat…</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {data.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border p-4
                         bg-background text-foreground
                         border-neutral-200 dark:border-neutral-800"
            >
              <div className="text-lg font-semibold">
                {p.gelarDepan ? `${p.gelarDepan} ` : ""}
                {p.nama}
                {p.gelarBelakang ? `, ${p.gelarBelakang}` : ""}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                {p.unit?.name}
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {p.skills.slice(0, 6).map((s) => (
                  <span
                    key={s.id}
                    className="text-xs border rounded-full px-2 py-0.5
                               border-neutral-300 dark:border-neutral-700"
                  >
                    {s.name}
                  </span>
                ))}
              </div>

              <div className="mt-3">
                <button
                  onClick={() => addToEstimator(p)}
                  className="rounded-xl px-3 py-1 border
                             bg-background text-foreground
                             hover:bg-[color-mix(in_oklab,var(--background)90%,black 10%)]
                             border-neutral-300 dark:border-neutral-700"
                >
                  Tambah ke Estimator
                </button>
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              Tidak ada hasil.
            </div>
          )}
        </div>
      )}

      {/* Floating Estimator Button (badge aman dari hydration) */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-6 right-6 rounded-full px-4 py-3 border shadow-lg
                   bg-background text-foreground
                   border-neutral-300 dark:border-neutral-700"
      >
        Estimator
        {mounted && (
          <span
            className="ml-2 inline-flex items-center justify-center min-w-6 h-6 px-2
                       text-sm rounded-full border
                       border-neutral-300 dark:border-neutral-700"
          >
            {estCount}
          </span>
        )}
      </button>

      {/* Drawer Estimator */}
      <EstimatorDrawer
        ref={drawerRef}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCountChange={setEstCount}
      />
    </div>
  );
}
