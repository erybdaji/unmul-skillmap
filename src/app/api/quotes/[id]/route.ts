// src/app/api/quotes/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getId(req: Request, params?: { id?: string }) {
  if (params?.id) return params.id;
  try {
    const m = new URL(req.url).pathname.match(/\/api\/quotes\/([^\/\?]+)/);
    return m?.[1];
  } catch {
    return undefined;
  }
}

export async function GET(req: Request, ctx: { params?: { id?: string } }) {
  const id = getId(req, ctx?.params);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const q = await prisma.quote.findUnique({ where: { id } });
    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(q);
  } catch (err) {
    console.error("GET /api/quotes/[id] error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
