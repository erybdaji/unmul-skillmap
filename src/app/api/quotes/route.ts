import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/quotes → list
export async function GET(_req: NextRequest) {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(quotes);
}

// POST /api/quotes → create
export async function POST(req: NextRequest) {
  // Admin guard (opsional: set ADMIN_KEY di Environment)
  if (process.env.ADMIN_KEY) {
    const key = req.headers.get("x-admin-key") ?? "";
    if (key !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const b = await req.json();
    if (!b?.title || !b?.client || !Array.isArray(b?.items)) {
      return NextResponse.json(
        { error: "title, client, items wajib" },
        { status: 400 }
      );
    }

    const saved = await prisma.quote.create({
      data: {
        title: String(b.title),
        client: String(b.client),
        contact: b.contact ? String(b.contact) : null,
        items: b.items, // Json
        subtotal: Number(b.subtotal ?? 0),
        total: Number(b.total ?? 0),
        overheadPct: Number(b.overheadPct ?? 0.15),
        adminFeePct: Number(b.adminFeePct ?? 0.05),
        discountPct: Number(b.discountPct ?? 0),
      },
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("POST /api/quotes error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
