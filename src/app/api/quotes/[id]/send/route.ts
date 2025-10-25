import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { PDFDocument, StandardFonts } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json();
  const to = String(body?.to || "");
  const message = String(body?.message || "");
  if (!to) return NextResponse.json({ error: "Missing 'to'" }, { status: 400 });

  const q = await prisma.quote.findUnique({ where: { id } });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Buat PDF singkat (boleh reuse fungsi dari route pdf di atas)
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(`Quote: ${q.title}`, { x: 40, y: 780, size: 16, font });
  const pdf = await doc.save();

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM!,
    to,
    subject: `Penawaran: ${q.title}`,
    text: message || "Terlampir penawaran.",
    attachments: [
      { filename: `quote-${id}.pdf`, content: Buffer.from(pdf), contentType: "application/pdf" },
    ],
  });

  return NextResponse.json({ ok: true });
}
