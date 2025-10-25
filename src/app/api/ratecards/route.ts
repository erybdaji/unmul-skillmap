import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: NextRequest) {
  const cards = await prisma.rateCard.findMany({
    include: { person: true, skill: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(cards);
}

export async function POST(req: NextRequest) {
  if (process.env.ADMIN_KEY) {
    const key = req.headers.get("x-admin-key") ?? "";
    if (key !== process.env.ADMIN_KEY) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const b = await req.json();
  const saved = await prisma.rateCard.create({
    data: {
      personId: String(b.personId),
      unit: b.unit ?? "HOUR",
      amountIDR: Number(b.amountIDR ?? 0),
      skillId: b.skillId ?? null,
      effectiveAt: b.effectiveAt ? new Date(b.effectiveAt) : undefined,
    },
  });
  return NextResponse.json(saved, { status: 201 });
}
