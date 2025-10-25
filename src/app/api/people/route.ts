import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") ?? "").trim();
  const unitId = searchParams.get("unitId") ?? undefined;
  const skill = searchParams.get("skill") ?? undefined; // skillSlug
  const degree = searchParams.get("degree") ?? undefined; // S1|S2|S3
  const rank = searchParams.get("rank") ?? undefined; // III|IV
  const take = Number(searchParams.get("take") ?? 20);
  const skip = Number(searchParams.get("skip") ?? 0);

  const AND: any[] = [];

  if (q) AND.push({ nama: { contains: q } });

  if (unitId) AND.push({ unitId });

  if (degree) {
    // pendidikanTerakhir umumnya "S3 / xxx"
    AND.push({ pendidikanTerakhir: { startsWith: degree } });
  }

  if (rank) {
    // pangkatGolongan umumnya "IV/e | T. ..."
    AND.push({ pangkatGolongan: { startsWith: rank } });
  }

  if (skill) {
    AND.push({
      skills: {
        some: { skill: { slug: skill } },
      },
    });
  }

  const where = AND.length ? { AND } : {};

  const [items, total] = await Promise.all([
    prisma.person.findMany({
      where,
      include: {
        unit: true,
        skills: { include: { skill: true }, take: 8 },
      },
      orderBy: { nama: "asc" },
      skip,
      take,
    }),
    prisma.person.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      nama: p.nama,
      gelarDepan: p.gelarDepan,
      gelarBelakang: p.gelarBelakang,
      unit: p.unit ? { id: p.unit.id, name: p.unit.name } : null,
      pendidikanTerakhir: p.pendidikanTerakhir,
      pangkatGolongan: p.pangkatGolongan,
      skills: p.skills.map((s) => ({
        id: s.skill.id,
        name: s.skill.name,
        slug: s.skill.slug,
        level: s.level ?? null,
      })),
    })),
    total,
    page: Math.floor(skip / take) + 1,
    pages: Math.ceil(total / take),
  });
}
