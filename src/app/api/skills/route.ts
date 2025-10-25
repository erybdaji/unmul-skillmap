import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const skills = await prisma.skill.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(skills.map(s => ({ id: s.id, name: s.name, slug: s.slug })));
}
