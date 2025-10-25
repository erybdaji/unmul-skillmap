import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const q = await prisma.quote.findUnique({ where: { id } });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pageW = 595.28, pageH = 841.89, margin = 48;
  const doc = await PDFDocument.create();
  let page = doc.addPage([pageW, pageH]);
  const fontTitle = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await doc.embedFont(StandardFonts.Helvetica);
  let y = pageH - margin;

  const drawText = (t: string, size = 12, bold = false) => {
    const f = bold ? fontTitle : fontReg;
    y -= size * 1.35;
    page.drawText(t, { x: margin, y, size, font: f });
  };

  page.drawText("Universitas Mulawarman", { x: margin, y: (y -= 4), size: 20, font: fontTitle });
  y -= 14; drawText("Penawaran (Quote)", 16, true); y -= 6;
  drawText(`Judul: ${q.title}`);
  drawText(`Klien: ${q.client}${q.contact ? " • " + q.contact : ""}`);
  drawText(new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "medium" }).format(q.createdAt), 11);

  y -= 8; drawText("Rincian Layanan", 14, true); y -= 6;

  const items: any[] = Array.isArray(q.items) ? q.items : [];
  const colX = [margin, margin + 30, margin + 300, margin + 420, pageW - margin - 30];
  const rowH = 18;

  const drawRow = (cells: string[], bold = false) => {
    const f = bold ? fontTitle : fontReg;
    y -= rowH;
    page.drawText(cells[0] ?? "", { x: colX[0], y, size: 10, font: f });
    page.drawText(cells[1] ?? "", { x: colX[1], y, size: 10, font: f });
    page.drawText(cells[2] ?? "", { x: colX[2], y, size: 10, font: f });
    page.drawText(cells[3] ?? "", { x: colX[3], y, size: 10, font: f });
    page.drawText(cells[4] ?? "", { x: colX[4], y, size: 10, font: f });
  };

  const newPage = (title?: string) => {
    page = doc.addPage([pageW, pageH]);
    y = pageH - margin;
    if (title) { drawText(title, 14, true); y -= 6; }
    drawRow(["No", "Nama", "Skill", "Unit", "Qty"], true);
  };

  drawRow(["No", "Nama", "Skill", "Unit", "Qty"], true);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (y < margin + 150) newPage("Rincian Layanan (lanjutan)");
    drawRow([String(i + 1), it.personName || it.personId || "-", it.skillSlug || "General", it.unit || "-", String(it.quantity ?? 1)]);
  }

  y -= 14; drawText("Ringkasan", 14, true);
  const toRp = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");
  const pairs: Array<[string, string, boolean?]> = [
    ["Subtotal", toRp(q.subtotal || 0)],
    ["Overhead", `${Math.round((q.overheadPct ?? 0) * 100)}%`],
    ["Admin Fee", `${Math.round((q.adminFeePct ?? 0) * 100)}%`],
    ["Diskon", `${Math.round((q.discountPct ?? 0) * 100)}%`],
    ["Total", toRp(q.total || 0), true],
  ];

  for (const [k, v, strong] of pairs) {
    y -= 16;
    page.drawText(k, { x: margin, y, size: 12, font: strong ? fontTitle : fontReg });
    page.drawText(v, { x: pageW - margin - 160, y, size: 12, font: strong ? fontTitle : fontReg });
  }

const bytes = await doc.save();

// kirim sebagai Blob (didukung Node 18+ / Netlify runtime)
const blob = new Blob([bytes], { type: "application/pdf" });

return new NextResponse(blob, {
  status: 200,
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="quote-${id}.pdf"`,
    "Cache-Control": "no-store",
  },
});

}
