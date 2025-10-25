"use client";

import { useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from "recharts";
import Link from "next/link";

type Row = {
  skillId: string;
  skillName: string;
  slug: string;
  peopleCount: number;
  unitsCovered: number;
  ratecards: number;
};

const cn = (...s: (string | false | null | undefined)[]) =>
  s.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

export default function Charts() {
  const [data, setData] = useState<Row[]>([]);
  const [min, setMin] = useState(5);   // threshold "reliable"
  const [take, setTake] = useState(12);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/analytics/skills?min=${min}&take=${take}`, { cache: "no-store" });
      const j = await res.json();
      setData(Array.isArray(j) ? j : []);
      setLoading(false);
    })();
  }, [min, take]);

  return (
    <section
      className={cn(
        "rounded-2xl border p-4 sm:p-6",
        "bg-background text-foreground",
        "border-neutral-200 dark:border-neutral-800"
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl sm:text-2xl font-semibold">
          Keahlian yang Dapat Diandalkan
        </h2>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="opacity-70">Min. Dosen</label>
          <select
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
            className="rounded-lg px-2 py-1 border bg-background text-foreground border-neutral-300 dark:border-neutral-700"
          >
            {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>

          <label className="opacity-70 ml-2">Top</label>
          <select
            value={take}
            onChange={(e) => setTake(Number(e.target.value))}
            className="rounded-lg px-2 py-1 border bg-background text-foreground border-neutral-300 dark:border-neutral-700"
          >
            {[8, 12, 16, 20].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>

          <Link
            href="/dashboard?q="
            className="ml-2 underline hover:opacity-80"
          >
            Telusuri dosen per keahlian →
          </Link>
        </div>
      </div>

      {/* MOBILE: horizontal bars untuk keterbacaan label */}
      <div className="sm:hidden mt-3" style={{ height: 48 * Math.max(4, Math.min(12, data.length)) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 8, bottom: 8, left: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis type="number" />
            <YAxis
              type="category"
              dataKey="skillName"
              width={140}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(v: number, k) => [v, k === "peopleCount" ? "Dosen" : k]}
              labelFormatter={(l) => l}
            />
            <Bar dataKey="peopleCount" radius={[4, 4, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* DESKTOP: vertical bars + label miring */}
      <div className="hidden sm:block mt-3 h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 60, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="skillName"
              interval={0}
              height={60}
              tick={{ fontSize: 12 }}
              angle={-35}
              textAnchor="end"
            />
            <YAxis />
            <Tooltip
              formatter={(v: number, k) => [v, k === "peopleCount" ? "Dosen" : k]}
              labelFormatter={(l) => l}
            />
            <Bar dataKey="peopleCount" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Kartu ringkas metrik pendukung */}
      {!loading && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat label="Total Keahlian (reliable)" value={data.length} />
          <Stat label="Median Dosen/Keahlian" value={median(data.map(d => d.peopleCount))} />
          <Stat label="Median Unit Tercakup" value={median(data.map(d => d.unitsCovered))} />
          <Stat label="Keahlian dg Ratecard" value={data.filter(d => d.ratecards > 0).length} />
        </div>
      )}
    </section>
  );
}

function median(arr: number[]) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-3 text-sm bg-background text-foreground border-neutral-200 dark:border-neutral-800">
      <div className="opacity-70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
