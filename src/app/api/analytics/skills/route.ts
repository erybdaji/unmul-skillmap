import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/analytics/skills?min=5&take=12
 * "Reliability": skill dengan jumlah dosen >= min (default 5).
 * Keluaran: top skills by people count + coverage unit & jumlah ratecard spesifik-skill.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const min = Math.max(1, Number(searchParams.get("min") ?? 5));
    const take = Math.max(1, Number(searchParams.get("take") ?? 12));

    // hitung jumlah dosen per skill
    const grouped = await prisma.personSkill.groupBy({
      by: ["skillId"],
      _count: { skillId: true },
    });

    const filtered = grouped
      .filter((g) => g.skillId && g._count.skillId >= min)
      .sort((a, b) => b._count.skillId - a._count.skillId)
      .slice(0, take);

    const ids = filtered.map((g) => g.skillId!) as string[];

    // ambil info skill
    const skills = await prisma.skill.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, slug: true },
    });
    const skillMap = new Map(skills.map((s) => [s.id, s]));

    // coverage unit (jumlah unit unik yang punya dosen dgn skill tsb)
    const ps = await prisma.personSkill.findMany({
      where: { skillId: { in: ids } },
      select: { skillId: true, person: { select: { unitId: true } } },
    });
    const coverage: Record<string, number> = {};
    for (const row of ps) {
      if (!row.person.unitId) continue;
      const k = `${row.skillId}:${row.person.unitId}`;
      // pakai set sederhana berbasis object
      (coverage[k] as any) ??= 1;
    }
    const unitCovered: Record<string, number> = {};
    for (const key of Object.keys(coverage)) {
      const [skillId] = key.split(":");
      unitCovered[skillId] = (unitCovered[skillId] ?? 0) + 1;
    }

    // ratecard spesifik-skill untuk mengukur "ketersediaan tarif"
    const rcGrouped = await prisma.rateCard.groupBy({
      by: ["skillId"],
      where: { skillId: { in: ids } },
      _count: { skillId: true },
    });
    const rcMap = new Map(rcGrouped.map((r) => [r.skillId!, r._count.skillId]));

    const result = filtered.map((g) => {
      const s = skillMap.get(g.skillId!);
      return {
        skillId: g.skillId!,
        skillName: s?.name ?? g.skillId,
        slug: s?.slug ?? "",
        peopleCount: g._count.skillId,
        unitsCovered: unitCovered[g.skillId!] ?? 0,
        ratecards: rcMap.get(g.skillId!) ?? 0,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/analytics/skills error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
