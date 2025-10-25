import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RateUnit } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Body = {
  personId: string;
  amountIDR: number;
  unit: RateUnit | "HOUR" | "DAY" | "PACKAGE";
  skillSlug?: string;        // opsional: untuk tarif spesifik skill
  effectiveAt?: string;      // opsional: ISO date
};

function isUnauthorized(req: Request) {
  return !!(process.env.ADMIN_KEY && req.headers.get("x-admin-key") !== process.env.ADMIN_KEY);
}

/** GET /api/ratecards?personId=... */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const personId = searchParams.get("personId") ?? undefined;

    const data = await prisma.rateCard.findMany({
      where: personId ? { personId } : undefined,
      include: { skill: true },
      orderBy: { effectiveAt: "desc" },
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/ratecards error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** POST /api/ratecards  { personId, amountIDR, unit, skillSlug? } */
export async function POST(req: Request) {
  try {
    if (isUnauthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const b = (await req.json()) as Body;

    if (!b?.personId || typeof b.amountIDR !== "number" || !b.unit) {
      return NextResponse.json(
        { error: "personId, unit, amountIDR wajib" },
        { status: 400 }
      );
    }

    // jika pakai skillSlug, konversi ke skillId
    let skillId: string | null = null;
    if (b.skillSlug) {
      const sk = await prisma.skill.findUnique({ where: { slug: b.skillSlug } });
      if (!sk) {
        return NextResponse.json({ error: "skillSlug tidak ditemukan" }, { status: 400 });
      }
      skillId = sk.id;
    }

    const saved = await prisma.rateCard.create({
      data: {
        personId: b.personId,
        unit: b.unit as RateUnit,
        amountIDR: Math.round(b.amountIDR),
        skillId,
        effectiveAt: b.effectiveAt ? new Date(b.effectiveAt) : undefined,
      },
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("POST /api/ratecards error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
