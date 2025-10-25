import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

function rp(n: number) { return "Rp " + (n || 0).toLocaleString("id-ID"); }

async function buildPdf(quote: any) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 800; const left = 50;
  const draw = (t: string, x: number, size = 12, f = font) => { page.drawText(t, { x, y, size, font: f, color: rgb(0,0,0) }); y -= size + 6; };

  draw("PENAWARAN JASA", left, 18, bold);
  draw(`Judul   : ${quote.title}`, left, 12, bold);
  draw(`Klien   : ${quote.client}`, left);
  if (quote.contact) draw(`Kontak  : ${quote.contact}`, left);
  y -= 6; draw("Rincian:", left, 14, bold);

  const items = (quote.items as any[]) || [];
  page.drawText("Nama", { x: left, y, size: 12, font: bold });
  page.drawText("Skill", { x: left + 200, y, size: 12, font: bold });
  page.drawText("Unit",  { x: left + 350, y, size: 12, font: bold });
  page.drawText("Qty",   { x: left + 420, y, size: 12, font: bold });
  y -= 18;

  items.forEach((it) => {
    page.drawText(String(it.personName || it.personId || "-"), { x: left, y, size: 11, font });
    page.drawText(String(it.skillSlug || "General"),            { x: left + 200, y, size: 11, font });
    page.drawText(String(it.unit || "HOUR"),                    { x: left + 350, y, size: 11, font });
    page.drawText(String(it.quantity ?? 1),                     { x: left + 420, y, size: 11, font });
    y -= 16;
  });

  y -= 10;
  draw(`Subtotal : ${rp(quote.subtotal)}`, left, 12, bold);
  draw(`Overhead : ${(quote.overheadPct * 100).toFixed(0)}%`, left);
  draw(`AdminFee : ${(quote.adminFeePct * 100).toFixed(0)}%`, left);
  draw(`Diskon   : ${(quote.discountPct * 100).toFixed(0)}%`, left);
  draw(`TOTAL    : ${rp(quote.total)}`, left, 14, bold);

  return await pdf.save();
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (process.env.ADMIN_KEY && req.headers.get("x-admin-key") !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const to = String(body?.to || "").trim();
  const message = String(body?.message || "Terlampir penawaran dari UNMUL.");

  if (!to) return NextResponse.json({ error: "Field 'to' wajib" }, { status: 400 });

  const quote = await prisma.quote.findUnique({ where: { id: params.id } });
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pdfBytes = await buildPdf(quote);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER!,
    to,
    subject: `Penawaran: ${quote.title} — ${quote.client}`,
    text: message,
    attachments: [
      {
        filename: `quote-${quote.id}.pdf`,
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf",
      },
    ],
  });

  return NextResponse.json({ ok: true, messageId: info.messageId });
}
