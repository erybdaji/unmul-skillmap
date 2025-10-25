import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import slugify from "slugify";

const prisma = new PrismaClient();
const EXCEL_PATH = "data/Database Dosen Unmul dan Keahlian.xlsx";

// util
const toSlug = (s: string) => slugify(s, { lower: true, strict: true, trim: true });
const splitSkills = (raw?: string) =>
  (raw ?? "")
    .split(/[,;/]|(?:\s+dan\s+)|&|\n/gi)
    .map(s => s.trim())
    .filter(Boolean);

async function main() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

  if (rows.length < 3) throw new Error("Sheet kosong atau header tidak sesuai");

  const h1 = rows[0].map(String);
  const h2 = rows[1].map(String);

  // deteksi kolom header 2-baris
  const idx = {
    nama: h1.findIndex((_, i) => /Nama/i.test(h2[i] || h1[i])),
    gelarDepan: h1.findIndex((h, i) => /Gelar/i.test(h) && /Depan/i.test(h2[i]||"")),
    gelarBelakang: h1.findIndex((h, i) => /Gelar/i.test(h) && /Belakang/i.test(h2[i]||"")),
    nip: h1.findIndex((h) => /NIP/i.test(h)),
    jk: h1.findIndex((h) => /Jenis\s*Kelamin/i.test(h)),
    status: h1.findIndex((h) => /Status\s*Pegawai/i.test(h)),
    usiaTahun: h1.findIndex((h, i) => /Usia/i.test(h) && /Tahun/i.test(h2[i]||"")),
    usiaBulan: h1.findIndex((h, i) => /Usia/i.test(h) && /Bulan/i.test(h2[i]||"")),
    pangkat: h1.findIndex((h, i) => /Pangkat|Golongan/i.test(h + (h2[i]||""))),
    pendidikan: h1.findIndex((h) => /Pendidikan/i.test(h)),
    unit: h1.findIndex((h) => /Unit|Fakultas/i.test(h)),
    bidang: h1.findIndex((h,i) => /Bidang\s*Keahlian/i.test(h2[i] || h)),
  };

  let countPeople = 0, countSkills = 0;
  const skillCache = new Map<string, string>(); // slug -> id

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r] as any[];
    const nama = String(row[idx.nama] || "").trim();
    if (!nama) continue;

    const unitName = String(row[idx.unit] || "").trim() || "Unit Tidak Diketahui";
    const unit = await prisma.unit.upsert({
      where: { name: unitName }, create: { name: unitName }, update: {},
    });

    const person = await prisma.person.create({
      data: {
        nama,
        gelarDepan: String(row[idx.gelarDepan] || "").trim() || null,
        gelarBelakang: String(row[idx.gelarBelakang] || "").trim() || null,
        nipNuptk: String(row[idx.nip] || "").trim() || null,
        jenisKelamin: String(row[idx.jk] || "").trim() || null,
        statusPegawai: String(row[idx.status] || "").trim() || null,
        usiaTahun: Number(row[idx.usiaTahun] || 0) || null,
        usiaBulan: Number(row[idx.usiaBulan] || 0) || null,
        pangkatGolongan: String(row[idx.pangkat] || "").trim() || null,
        pendidikanTerakhir: String(row[idx.pendidikan] || "").trim() || null,
        unitId: unit.id,
      },
    });
    countPeople++;

    // skills
    const skills = splitSkills(String(row[idx.bidang] || ""));
    for (const raw of skills) {
      const name = raw.replace(/\s+/g, " ").trim();
      if (!name) continue;
      const slug = toSlug(name);

      let skillId = skillCache.get(slug);
      if (!skillId) {
        const skill = await prisma.skill.upsert({
          where: { slug },
          create: { name, slug, aliases: [] }, // aliases disimpan sebagai JSON array
          update: {},
        });
        skillId = skill.id;
        skillCache.set(slug, skillId);
        countSkills++;
      }

      await prisma.personSkill.upsert({
        where: { personId_skillId: { personId: person.id, skillId } },
        create: { personId: person.id, skillId, level: 3 },
        update: {},
      });
    }
  }

  console.log(`Import selesai. People: ${countPeople}, Skills baru: ${countSkills}`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
