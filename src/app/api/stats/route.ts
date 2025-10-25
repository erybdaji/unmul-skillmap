import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function pickDegree(p: string | null): "S1" | "S2" | "S3" | "Lainnya" {
  const t = (p ?? "").toUpperCase();
  if (t.startsWith("S3")) return "S3";
  if (t.startsWith("S2")) return "S2";
  if (t.startsWith("S1")) return "S1";
  return "Lainnya";
}

function pickRank(p: string | null): "III" | "IV" | "Lainnya" {
  const t = (p ?? "").toUpperCase();
  // contoh: "IV/e | T. PENDIDIK"
  if (t.startsWith("IV")) return "IV";
  if (t.startsWith("III")) return "III";
  return "Lainnya";
}

export async function GET() {
  const persons = await prisma.person.findMany({
    include: { unit: true },
  });

  // by unit
  const byUnitMap = new Map<string, number>();
  for (const p of persons) {
    const name = p.unit?.name ?? "Tanpa Unit";
    byUnitMap.set(name, (byUnitMap.get(name) ?? 0) + 1);
  }
  const byUnit = Array.from(byUnitMap, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  // top 8 + Lainnya
  const top = byUnit.slice(0, 8);
  const others = byUnit.slice(8).reduce((s, x) => s + x.count, 0);
  if (others > 0) top.push({ name: "Lainnya", count: others });

  // by degree
  const deg = { S1: 0, S2: 0, S3: 0, Lainnya: 0 };
  for (const p of persons) deg[pickDegree(p.pendidikanTerakhir)]++;

  // by rank group
  const rank = { III: 0, IV: 0, Lainnya: 0 };
  for (const p of persons) rank[pickRank(p.pangkatGolongan)]++;

  return NextResponse.json({
    byUnit: top,
    byDegree: [
      { name: "S1", count: deg.S1 },
      { name: "S2", count: deg.S2 },
      { name: "S3", count: deg.S3 },
      { name: "Lainnya", count: deg.Lainnya },
    ],
    byRank: [
      { name: "III", count: rank.III },
      { name: "IV", count: rank.IV },
      { name: "Lainnya", count: rank.Lainnya },
    ],
    total: persons.length,
  });
}
