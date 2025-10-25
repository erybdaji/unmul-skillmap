"use client";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type Unit = "HOUR" | "DAY" | "PACKAGE";
type Item = {
  personId: string;
  personName: string;
  skillSlug?: string;
  quantity: number;
  unit: Unit;
};

export type EstimatorDrawerHandle = { add: (it: Item) => void };

type Props = {
  open: boolean;
  onClose: () => void;
  onCountChange?: (n: number) => void;
};

const STORAGE_KEY = "estimator:v1";

/** Normalize whitespace (CR/LF/Tab → single space) to avoid SSR/CSR className mismatch */
const cn = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

export default forwardRef<EstimatorDrawerHandle, Props>(function EstimatorDrawer(
  { open, onClose, onCountChange },
  ref
) {
  const [items, setItems] = useState<Item[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [overheadPct, setOverheadPct] = useState(0.15);
  const [adminFeePct, setAdminFeePct] = useState(0.05);
  const [discountPct, setDiscountPct] = useState(0);

  const router = useRouter();
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);

  // load once from localStorage (avoid overwriting when opening)
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (Array.isArray(s.items)) setItems(s.items);
        if (typeof s.overheadPct === "number") setOverheadPct(s.overheadPct);
        if (typeof s.adminFeePct === "number") setAdminFeePct(s.adminFeePct);
        if (typeof s.discountPct === "number") setDiscountPct(s.discountPct);
      }
    } catch {}
  }, []);

  // expose add()
  useImperativeHandle(ref, () => ({
    add: (it: Item) => setItems((prev) => [...prev, it]),
  }));

  // persist + report count
  useEffect(() => {
    const payload = { items, overheadPct, adminFeePct, discountPct };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
    onCountChange?.(items.length);
  }, [items, overheadPct, adminFeePct, discountPct, onCountChange]);

  // recalc when open or params change
  useEffect(() => {
    if (!open) return;
    (async () => {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, overheadPct, adminFeePct, discountPct }),
      });
      const json = await res.json();
      setSubtotal(json.subtotal ?? 0);
      setTotal(json.total ?? 0);
    })();
  }, [open, items, overheadPct, adminFeePct, discountPct]);

  return (
    <div className={cn("fixed inset-0", open ? "z-50" : "pointer-events-none")}>
      {/* backdrop */}
      <div
        role="presentation"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity z-40",
          open ? "opacity-100" : "opacity-0"
        )}
      />

      {/* panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute right-0 top-0 h-full w-full max-w-md",
          "bg-background text-foreground",
          "border-l border-neutral-200 dark:border-neutral-800",
          "shadow-2xl p-4 transition-transform z-50",
          "flex flex-col", // ← penting: jadikan kolom
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header (fixed) */}
        <div className={cn("flex justify-between items-center mb-3 shrink-0")}>
          <h2 className={cn("text-lg font-semibold")}>Estimator</h2>
          <button
            onClick={onClose}
            className={cn(
              "px-3 py-1 rounded-lg border",
              "bg-background text-foreground",
              "border-neutral-300 dark:border-neutral-700",
              "hover:bg-[color-mix(in_oklab,var(--background)90%,black 10%)]"
            )}
          >
            Tutup
          </button>
        </div>

        {/* Content scrollable: semua bagian ikut scroll */}
        <div className={cn("flex-1 overflow-y-auto pr-1 space-y-4")}>
          {/* Items */}
          <section className={cn("space-y-2")}>
            {items.map((it, i) => (
              <div
                key={i}
                className={cn(
                  "border rounded-xl p-3",
                  "bg-background",
                  "border-neutral-200 dark:border-neutral-800"
                )}
              >
                <div className={cn("font-medium")}>{it.personName}</div>
                <div className={cn("text-sm text-neutral-500 dark:text-neutral-400")}>
                  {it.skillSlug || "General"}
                </div>

                <div className={cn("flex gap-2 mt-2 items-center")}>
                  <select
                    value={it.unit}
                    onChange={(e) => {
                      const v = e.target.value as Unit;
                      setItems((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, unit: v } : x))
                      );
                    }}
                    className={cn(
                      "rounded-lg px-2 py-1 border",
                      "bg-background text-foreground",
                      "border-neutral-300 dark:border-neutral-700",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500"
                    )}
                  >
                    <option>HOUR</option>
                    <option>DAY</option>
                    <option>PACKAGE</option>
                  </select>

                  <input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => {
                      const v = Math.max(1, Number(e.target.value || 1));
                      setItems((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, quantity: v } : x))
                      );
                    }}
                    className={cn(
                      "rounded-lg px-2 py-1 w-24 border",
                      "bg-background text-foreground",
                      "border-neutral-300 dark:border-neutral-700",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500"
                    )}
                  />

                  <button
                    onClick={() =>
                      setItems((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className={cn(
                      "rounded-lg px-2 py-1 border",
                      "bg-background text-foreground",
                      "border-neutral-300 dark:border-neutral-700",
                      "hover:bg-[color-mix(in_oklab,var(--background)90%,black 10%)]"
                    )}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className={cn("text-sm text-neutral-500 dark:text-neutral-400")}>
                Belum ada item. Tambahkan dari kartu dosen → “Tambah ke Estimator”.
              </div>
            )}
          </section>

          {/* Params & Ringkasan */}
          <section
            className={cn("border-t pt-3", "border-neutral-200 dark:border-neutral-800")}
          >
            <div className={cn("space-y-2")}>
              <div className={cn("flex gap-2 items-center")}>
                <label className={cn("text-sm w-28 text-foreground/80")}>Overhead</label>
                <input
                  type="number"
                  step={0.01}
                  value={overheadPct}
                  onChange={(e) => setOverheadPct(Number(e.target.value))}
                  className={cn(
                    "rounded-lg px-2 py-1 w-24 border",
                    "bg-background text-foreground",
                    "border-neutral-300 dark:border-neutral-700",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500"
                  )}
                />
              </div>
              <div className={cn("flex gap-2 items-center")}>
                <label className={cn("text-sm w-28 text-foreground/80")}>Admin Fee</label>
                <input
                  type="number"
                  step={0.01}
                  value={adminFeePct}
                  onChange={(e) => setAdminFeePct(Number(e.target.value))}
                  className={cn(
                    "rounded-lg px-2 py-1 w-24 border",
                    "bg-background text-foreground",
                    "border-neutral-300 dark:border-neutral-700",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500"
                  )}
                />
              </div>
              <div className={cn("flex gap-2 items-center")}>
                <label className={cn("text-sm w-28 text-foreground/80")}>Diskon</label>
                <input
                  type="number"
                  step={0.01}
                  value={discountPct}
                  onChange={(e) => setDiscountPct(Number(e.target.value))}
                  className={cn(
                    "rounded-lg px-2 py-1 w-24 border",
                    "bg-background text-foreground",
                    "border-neutral-300 dark:border-neutral-700",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500"
                  )}
                />
              </div>
            </div>

            <div className={cn("mt-4 space-y-1")}>
              <div className={cn("flex justify-between")}>
                <span className={cn("text-foreground/80")}>Subtotal</span>
                <span className={cn("text-foreground")}>
                  Rp {subtotal.toLocaleString("id-ID")}
                </span>
              </div>
              <div className={cn("flex justify-between font-semibold text-lg")}>
                <span className={cn("text-foreground")}>Total</span>
                <span className={cn("text-foreground")}>
                  Rp {total.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </section>

          {/* Simpan sebagai Quote */}
          <section
            className={cn("border-t pt-3", "border-neutral-200 dark:border-neutral-800")}
          >
            <div className={cn("font-semibold mb-2")}>Simpan sebagai Quote</div>
            <div className={cn("space-y-2")}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul Quote"
                className={cn(
                  "rounded-xl px-3 py-2 border w-full",
                  "bg-background text-foreground",
                  "border-neutral-300 dark:border-neutral-700"
                )}
              />
              <input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Nama Klien/Instansi"
                className={cn(
                  "rounded-xl px-3 py-2 border w-full",
                  "bg-background text-foreground",
                  "border-neutral-300 dark:border-neutral-700"
                )}
              />
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Kontak (email/telepon)"
                className={cn(
                  "rounded-xl px-3 py-2 border w-full",
                  "bg-background text-foreground",
                  "border-neutral-300 dark:border-neutral-700"
                )}
              />
              <button
                onClick={async () => {
                  setSaving(true);
                  const headers: Record<string, string> = { "Content-Type": "application/json" };
                  if (process.env.NEXT_PUBLIC_ADMIN_KEY)
                    headers["x-admin-key"] = process.env.NEXT_PUBLIC_ADMIN_KEY as string;

                  const res = await fetch("/api/quotes", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                      title,
                      client,
                      contact,
                      items,
                      subtotal,
                      total,
                      overheadPct,
                      adminFeePct,
                      discountPct,
                    }),
                  });

                  setSaving(false);
                  if (res.ok) {
                    const q = await res.json();
                    onClose();
                    router.push(`/quotes/${q.id}`);
                  } else {
                    alert("Gagal menyimpan quote");
                  }
                }}
                disabled={saving || !title || !client || items.length === 0}
                className={cn(
                  "rounded-xl px-3 py-2 border",
                  "bg-background text-foreground",
                  "border-neutral-300 dark:border-neutral-700",
                  "hover:bg-[color-mix(in_oklab,var(--background)90%,black 10%)]",
                  "disabled:opacity-60"
                )}
              >
                {saving ? "Menyimpan…" : "Simpan Quote"}
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
});
