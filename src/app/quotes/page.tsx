"use client";
import { useEffect, useState } from "react";

type Quote = {
  id: string; title: string; client: string; total: number; createdAt: string;
};

export default function QuotesPage() {
  const [items, setItems] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/quotes", { cache: "no-store" });
      const j = await r.json();
      setItems(j || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Quotes</h1>
      {loading ? "Memuat…" : (
        <div className="space-y-2">
          {items.map(q => (
            <a key={q.id} href={`/quotes/${q.id}`}
               className="block rounded-xl border px-4 py-3
                          bg-background text-foreground
                          border-neutral-200 dark:border-neutral-800 hover:bg-[color-mix(in_oklab,var(--background)95%,black 5%)]">
              <div className="font-semibold">{q.title}</div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                {q.client} • {new Date(q.createdAt).toLocaleString("id-ID")}
              </div>
              <div className="text-sm">Total: Rp {Number(q.total||0).toLocaleString("id-ID")}</div>
            </a>
          ))}
          {items.length === 0 && <div className="text-sm text-neutral-500 dark:text-neutral-400">Belum ada quote.</div>}
        </div>
      )}
    </div>
  );
}
