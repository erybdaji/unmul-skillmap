import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;


export async function GET() {
  const units = await prisma.unit.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(units.map(u => ({ id: u.id, name: u.name })));
}
