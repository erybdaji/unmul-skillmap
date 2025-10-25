// src/app/api/quotes/[id]/pdf/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Unit = "HOUR" | "DAY" | "PACKAGE";
type QuoteItem = {
  personId: string;
  personName?: string;
  skillSlug?: string;
  unit: Unit;
  quantity: number;
};

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const CONTENT_W = A4[0] - MARGIN * 2;

const COLS = [
  { key: "no",   label: "No",    width: 26 },
  { key: "name", label: "Nama",  width: 210 },
  { key: "skill",label: "Skill", width: 160 },
  { key: "unit", label: "Unit",  width: 60 },
  { key: "qty",  label: "Qty",   width: 43 },
]; // total = 26+210+160+60+43 = 499 (pas dengan CONTENT_W≈499.28)

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID").format(Math.round(n || 0));
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const q = await prisma.quote.findUnique({ where: { id } });
    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const pdf = await buildPdf(q);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="quote-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("GET /api/quotes/[id]/pdf error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/* ============================== PDF builder =============================== */

async function buildPdf(q: any): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage(A4);
  let y = page.getHeight() - MARGIN;

  /* ---- Header bar ---- */
  drawTopHeader(page, bold, regular, q);

  y -= 110; // jarak setelah header

  /* ---- Meta box (Judul/Klien/Tanggal) ---- */
  y = drawMetaBox(page, regular, bold, y, q) - 16;

  /* ---- Section title ---- */
  y = drawSectionTitle(page, bold, y, "Rincian Layanan") - 6;

  /* ---- Table header at current cursor ---- */
  y = drawTableHeader(page, bold, y);

  const items: QuoteItem[] = Array.isArray(q.items) ? q.items : [];

  // helper: page break + ulangi header tabel
  const ensureSpace = (need: number) => {
    if (y - need < MARGIN + 120) {
      page = doc.addPage(A4);
      y = page.getHeight() - MARGIN;
      y = drawSectionTitle(page, bold, y, "Rincian Layanan (lanjutan)") - 6;
      y = drawTableHeader(page, bold, y);
    }
  };

  /* ---- Rows ---- */
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const row = {
      no: String(i + 1),
      name: it.personName || it.personId,
      skill: it.skillSlug || "General",
      unit: it.unit,
      qty: String(it.quantity),
    };

    // penghitungan tinggi baris berdasarkan wrap text
    const linesName = wrap(row.name, COLS[1].width - 10, regular, 11);
    const linesSkill = wrap(row.skill, COLS[2].width - 10, regular, 11);
    const lineCount = Math.max(linesName.length, linesSkill.length, 1);
    const rowH = Math.max(22, lineCount * 13 + 8);

    ensureSpace(rowH + 4);

    // zebra
    if (i % 2 === 1) {
      page.drawRectangle({
        x: MARGIN - 1,
        y: y - rowH,
        width: CONTENT_W + 2,
        height: rowH,
        color: rgb(0.965, 0.967, 0.975),
      });
    }

    // borders
    drawRowBorders(page, y, rowH);

    // texts
    let x = MARGIN;
    drawCell(page, regular, row.no,  x, y, COLS[0].width, rowH);
    x += COLS[0].width;
    drawMulti(page, regular, linesName, x, y, COLS[1].width);
    x += COLS[1].width;
    drawMulti(page, regular, linesSkill, x, y, COLS[2].width);
    x += COLS[2].width;
    drawCell(page, regular, row.unit, x, y, COLS[3].width, rowH);
    x += COLS[3].width;
    drawCell(page, regular, row.qty,  x, y, COLS[4].width, rowH);

    y -= rowH;
  }

  y -= 16;

  /* ---- Totals Box + Signature (packed) ---- */
const TOTALS_H = 128;  // tinggi kotak total (sesuaikan jika Anda ubah styling)
const SIG_H    = 90;   // tinggi area tanda tangan
const GAP      = 16;   // jarak antar blok

// Coba letakkan TOTALS di halaman yang sama.
// Kalau tidak muat, buat halaman baru dan beri judul ringkasan.
const canFitTotalsHere = y - (TOTALS_H + GAP) >= MARGIN + 40;
if (!canFitTotalsHere) {
  page = doc.addPage(A4);
  y = page.getHeight() - MARGIN;
  y = drawSectionTitle(page, bold, y, "Ringkasan Biaya") - 6;
}

drawTotalsBox(page, regular, bold, y, q);
y -= TOTALS_H + GAP;

// Tanda tangan dipertimbangkan terpisah.
// Jika tak muat setelah total, pindah halaman dulu.
if (y - SIG_H < MARGIN + 40) {
  page = doc.addPage(A4);
  y = page.getHeight() - MARGIN;
}
drawSignature(page, regular, bold, y);


  /* ---- Footer page numbers ---- */
  addPageNumbers(doc, regular);

  return await doc.save();
}

/* ============================== Drawing utils ============================= */

function drawTopHeader(page: any, bold: any, regular: any, q: any) {
  const accent = rgb(0.02, 0.42, 0.56);
  page.drawRectangle({
    x: 0,
    y: page.getHeight() - 70,
    width: page.getWidth(),
    height: 70,
    color: accent,
  });

  page.drawText("Universitas Mulawarman", {
    x: MARGIN,
    y: page.getHeight() - 42,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Badan Pengelola Usaha", {
    x: MARGIN,
    y: page.getHeight() - 58,
    size: 10,
    font: regular,
    color: rgb(1, 1, 1),
  });

  const label = "QUOTE";
  const w = bold.widthOfTextAtSize(label, 22);
  page.drawText(label, {
    x: page.getWidth() - MARGIN - w,
    y: page.getHeight() - 40,
    size: 22,
    font: bold,
    color: rgb(1, 1, 1),
  });

  const idText = `#${q.id}`;
  const idW = regular.widthOfTextAtSize(idText, 10);
  page.drawText(idText, {
    x: page.getWidth() - MARGIN - idW,
    y: page.getHeight() - 58,
    size: 10,
    font: regular,
    color: rgb(1, 1, 1),
  });
}

function drawMetaBox(page: any, regular: any, bold: any, y: number, q: any) {
  const h = 72;
  page.drawRectangle({
    x: MARGIN - 1,
    y: y - h,
    width: CONTENT_W + 2,
    height: h,
    color: rgb(0.985, 0.985, 0.99),
    borderColor: rgb(0.88, 0.88, 0.9),
    borderWidth: 1,
  });

  const leftX = MARGIN + 10;
  const rightX = MARGIN + CONTENT_W - 220;

  page.drawText("Judul", { x: leftX, y: y - 18, size: 10, font: bold, color: rgb(0.2, 0.2, 0.25) });
  page.drawText(String(q.title), { x: leftX, y: y - 34, size: 12, font: regular });

  page.drawText("Klien", { x: leftX, y: y - 52, size: 10, font: bold, color: rgb(0.2, 0.2, 0.25) });
  page.drawText(`${q.client}${q.contact ? " • " + q.contact : ""}`, {
    x: leftX,
    y: y - 68,
    size: 12,
    font: regular,
  });

  page.drawText("Tanggal", { x: rightX, y: y - 18, size: 10, font: bold, color: rgb(0.2, 0.2, 0.25) });
  page.drawText(new Date(q.createdAt).toLocaleString("id-ID"), {
    x: rightX,
    y: y - 34,
    size: 12,
    font: regular,
  });

  return y - h;
}

function drawSectionTitle(page: any, bold: any, y: number, text: string) {
  page.drawText(text, { x: MARGIN, y: y - 14, size: 12, font: bold, color: rgb(0.15, 0.15, 0.2) });
  page.drawLine({
    start: { x: MARGIN, y: y - 20 },
    end: { x: MARGIN + CONTENT_W, y: y - 20 },
    color: rgb(0.86, 0.86, 0.9),
    thickness: 1,
  });
  return y - 24;
}

function drawTableHeader(page: any, bold: any, y: number) {
  const h = 24;
  page.drawRectangle({
    x: MARGIN - 1,
    y: y - h,
    width: CONTENT_W + 2,
    height: h,
    color: rgb(0.94, 0.96, 0.98),
    borderColor: rgb(0.82, 0.86, 0.9),
    borderWidth: 1,
  });

  let x = MARGIN;
  for (const c of COLS) {
    page.drawText(c.label, {
      x: x + 6,
      y: y - 16,
      size: 11,
      font: bold,
      color: rgb(0.15, 0.2, 0.3),
    });
    x += c.width;
  }
  return y - h; // new cursor
}

function drawRowBorders(page: any, y: number, h: number) {
  page.drawRectangle({
    x: MARGIN - 1,
    y: y - h,
    width: CONTENT_W + 2,
    height: h,
    borderColor: rgb(0.85, 0.86, 0.9),
    borderWidth: 1,
  });

  // vertical separators
  let x = MARGIN + COLS[0].width;
  for (let i = 1; i < COLS.length; i++) {
    page.drawLine({
      start: { x, y: y - h },
      end: { x, y: y },
      color: rgb(0.85, 0.86, 0.9),
      thickness: 1,
    });
    x += COLS[i].width;
  }
}

function drawCell(page: any, font: any, text: string, x: number, y: number, w: number, h: number) {
  page.drawText(text, { x: x + 6, y: y - 14, size: 11, font, color: rgb(0, 0, 0) });
}

function drawMulti(page: any, font: any, lines: string[], x: number, y: number, w: number) {
  let yy = y - 14;
  for (const ln of lines) {
    page.drawText(ln, { x: x + 6, y: yy, size: 11, font, color: rgb(0, 0, 0) });
    yy -= 13;
  }
}

function wrap(text: string, maxW: number, font: any, size: number): string[] {
  const words = String(text ?? "").split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(trial, size) <= maxW) cur = trial;
    else {
      if (cur) out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function drawTotalsBox(page: any, regular: any, bold: any, y: number, q: any) {
  const boxW = 260;
  const boxH = 118;
  const x = MARGIN + CONTENT_W - boxW;

  page.drawRectangle({
    x,
    y: y - boxH,
    width: boxW,
    height: boxH,
    color: rgb(0.985, 0.985, 0.99),
    borderColor: rgb(0.82, 0.86, 0.9),
    borderWidth: 1,
  });

  const rows = [
    ["Subtotal", `Rp ${formatIDR(q.subtotal)}`],
    ["Overhead", `${(q.overheadPct * 100).toFixed(0)}%`],
    ["Admin Fee", `${(q.adminFeePct * 100).toFixed(0)}%`],
    ["Diskon", `${(q.discountPct * 100).toFixed(0)}%`],
    ["Total", `Rp ${formatIDR(q.total)}`],
  ];

  let yy = y - 18;
  rows.forEach(([label, val], i) => {
    const isTotal = i === rows.length - 1;
    page.drawText(label, {
      x: x + 12,
      y: yy,
      size: isTotal ? 12 : 11,
      font: isTotal ? bold : regular,
      color: rgb(0.15, 0.15, 0.2),
    });
    const w = (isTotal ? bold : regular).widthOfTextAtSize(val, isTotal ? 12 : 11);
    page.drawText(val, {
      x: x + boxW - 12 - w,
      y: yy,
      size: isTotal ? 12 : 11,
      font: isTotal ? bold : regular,
    });
    yy -= isTotal ? 20 : 18;
  });
}

function drawSignature(page: any, regular: any, bold: any, y: number) {
  page.drawText("Hormat kami,", { x: MARGIN, y: y - 16, size: 11, font: regular, color: rgb(0.1, 0.1, 0.1) });

  page.drawLine({
    start: { x: MARGIN, y: y - 70 },
    end: { x: MARGIN + 220, y: y - 70 },
    color: rgb(0.6, 0.6, 0.65),
    thickness: 1,
  });

  page.drawText("Badan Pengelola Usaha", {
    x: MARGIN,
    y: y - 86,
    size: 10,
    font: bold,
    color: rgb(0.15, 0.15, 0.2),
  });
}

function addPageNumbers(doc: PDFDocument, regular: any) {
  const total = doc.getPageCount();
  for (let i = 0; i < total; i++) {
    const p = doc.getPage(i);
    const label = `Halaman ${i + 1} dari ${total}`;
    const size = 9;
    const w = regular.widthOfTextAtSize(label, size);
    p.drawText(label, {
      x: MARGIN + CONTENT_W - w,
      y: MARGIN - 20,
      size,
      font: regular,
      color: rgb(0.4, 0.4, 0.45),
    });
  }
}
