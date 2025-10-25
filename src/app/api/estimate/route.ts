import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Item = { personId: string; skillSlug?: string; quantity: number; unit: "HOUR"|"DAY"|"PACKAGE" };

export async function POST(req: Request) {
  const body = await req.json();
  const items: Item[] = Array.isArray(body.items) ? body.items : [];
  const overheadPct = Number(body.overheadPct ?? 0.15);
  const adminFeePct = Number(body.adminFeePct ?? 0.05);
  const discountPct = Number(body.discountPct ?? 0);

  let subtotal = 0;

  for (const it of items) {
    const skill = it.skillSlug ? await prisma.skill.findUnique({ where: { slug: it.skillSlug } }) : null;

    const rate = await prisma.rateCard.findFirst({
      where: {
        personId: it.personId,
        OR: [{ skillId: skill?.id ?? undefined }, { skillId: null }],
        unit: it.unit as any,
      },
      orderBy: [{ skillId: "desc" }, { effectiveAt: "desc" }],
    });

    const amount = rate?.amountIDR ?? 100_000; // default fallback
    subtotal += amount * (Number(it.quantity) || 0);
  }

  const total = Math.round(subtotal * (1 + overheadPct) * (1 + adminFeePct) * (1 - discountPct));
  return NextResponse.json({ subtotal, total, overheadPct, adminFeePct, discountPct, items });
}
