import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/admin/people/[id]
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params; // ⬅️ params: Promise —> await
  const p = await prisma.person.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(p);
}

// PUT /api/admin/people/[id]
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  if (
    process.env.ADMIN_KEY &&
    req.headers.get("x-admin-key") !== process.env.ADMIN_KEY
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const b = await req.json();

  const updated = await prisma.person.update({
    where: { id },
    data: {
      nama: b.nama,
      gelarDepan: b.gelarDepan ?? null,
      gelarBelakang: b.gelarBelakang ?? null,
      nipNuptk: b.nipNuptk ?? null,
      jenisKelamin: b.jenisKelamin ?? null,
      statusPegawai: b.statusPegawai ?? null,
      pangkatGolongan: b.pangkatGolongan ?? null,
      pendidikanTerakhir: b.pendidikanTerakhir ?? null,
      unitId: b.unitId ?? null,
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/people/[id]
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  if (
    process.env.ADMIN_KEY &&
    req.headers.get("x-admin-key") !== process.env.ADMIN_KEY
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.person.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
