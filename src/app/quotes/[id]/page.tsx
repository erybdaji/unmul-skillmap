"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function QuoteDetail() {
  const params = useParams<{ id: string }>();
  const id = (params?.id as string) || undefined;

  const [q, setQ] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [to, setTo] = useState("");
  const [message, setMessage] = useState("Terlampir penawaran dari UNMUL.");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return; // tunggu id siap (hindari fetch /undefined)
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`/api/quotes/${id}`, { cache: "no-store" });
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          setErr(`Gagal memuat quote (HTTP ${r.status}) ${t ? `– ${t}` : ""}`);
          setQ(null);
        } else {
          const j = await r.json();
          setQ(j);
        }
      } catch (e) {
        setErr("Gagal memuat quote (jaringan/JSON).");
        setQ(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function sendEmail() {
    if (!id) return;
    setSending(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.NEXT_PUBLIC_ADMIN_KEY) {
        headers["x-admin-key"] = process.env.NEXT_PUBLIC_ADMIN_KEY as string;
      }
      const r = await fetch(`/api/quotes/${id}/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({ to, message }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        alert(`Gagal mengirim email. ${t || `HTTP ${r.status}`}`);
      } else {
        alert("Email terkirim");
      }
    } finally {
      setSending(false);
    }
  }

  if (!id) return <div className="p-6">Invalid quote id.</div>;
  if (loading) return <div className="p-6">Memuat…</div>;
  if (err) return <div className="p-6">{err}</div>;
  if (!q || q.error) return <div className="p-6">Quote tidak ditemukan.</div>;

  const items = (q.items as any[]) || [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">{q.title}</h1>
      <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
        Klien: {q.client} {q.contact ? <>• {q.contact}</> : null}
      </div>

      <div className="rounded-xl border p-4 bg-background text-foreground border-neutral-200 dark:border-neutral-800">
        <div className="font-semibold mb-2">Rincian</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th>Nama</th><th>Skill</th><th>Unit</th><th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>{it.personName || it.personId}</td>
                <td>{it.skillSlug || "General"}</td>
                <td>{it.unit}</td>
                <td>{it.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 space-y-1 text-sm">
          <div>Subtotal: Rp {Number(q.subtotal || 0).toLocaleString("id-ID")}</div>
          <div>Overhead: {(q.overheadPct * 100).toFixed(0)}%</div>
          <div>Admin Fee: {(q.adminFeePct * 100).toFixed(0)}%</div>
          <div>Diskon: {(q.discountPct * 100).toFixed(0)}%</div>
          <div className="font-semibold text-lg">
            Total: Rp {Number(q.total || 0).toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <a
          href={`/api/quotes/${id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700 hover:bg-[color-mix(in_oklab,var(--background)90%,black_10%)]"
        >
          Download PDF
        </a>
        <a
          href="/quotes"
          className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700 hover:bg-[color-mix(in_oklab,var(--background)90%,black_10%)]"
        >
          Kembali
        </a>
      </div>

      <div className="mt-6 rounded-xl border p-4 bg-background text-foreground border-neutral-300 dark:border-neutral-700">
        <div className="font-semibold mb-2">Kirim via Email</div>
        <div className="flex flex-col gap-2 max-w-lg">
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="email@instansi.ac.id"
            className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700"
          />
          <button
            onClick={sendEmail}
            disabled={sending}
            className="rounded-xl px-3 py-2 border bg-background text-foreground border-neutral-300 dark:border-neutral-700 hover:bg-[color-mix(in_oklab,var(--background)90%,black_10%)] disabled:opacity-60"
          >
            {sending ? "Mengirim…" : "Kirim Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
