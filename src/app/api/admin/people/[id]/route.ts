import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const p = await prisma.person.findUnique({
    where: { id },
    include: { unit: true, skills: { include: { skill: true } }, rateCards: true },
  });

  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(p);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (process.env.ADMIN_KEY) {
    const key = req.headers.get("x-admin-key") ?? "";
    if (key !== process.env.ADMIN_KEY) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const data = await req.json();
  const updated = await prisma.person.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (process.env.ADMIN_KEY) {
    const key = req.headers.get("x-admin-key") ?? "";
    if (key !== process.env.ADMIN_KEY) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.person.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
