/* scripts/import-from-excel.cjs */
const { PrismaClient } = require("@prisma/client");
const XLSX = require("xlsx");
const slugify = require("slugify");

const prisma = new PrismaClient();
const EXCEL_PATH = "data/Database Dosen Unmul dan Keahlian.xlsx";

const toSlug = (s) => slugify(s, { lower: true, strict: true, trim: true });
const splitSkills = (raw) =>
  String(raw || "")
    .split(/[,;/]|(?:\s+dan\s+)|&|\n/gi)
    .map((s) => s.trim())
    .filter(Boolean);

// gabung header 2 baris (row0 + row1)
function mergeTwoHeaderRows(h1, h2) {
  const len = Math.max(h1.length, h2.length);
  const out = [];
  for (let i = 0; i < len; i++) {
    const a = String(h1[i] || "").trim();
    const b = String(h2[i] || "").trim();
    out.push(`${a} ${b}`.replace(/\s+/g, " ").trim());
  }
  return out;
}

(async () => {
  try {
    const wb = XLSX.readFile(EXCEL_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    if (!rows || rows.length < 3) {
      throw new Error("Sheet kosong / terlalu pendek.");
    }

    const r0 = rows[0].map((v) => String(v || ""));
    const r1 = rows[1].map((v) => String(v || ""));
    const headerMerged = mergeTwoHeaderRows(r0, r1);

    // normalisasi header untuk pencarian indeks
    const H = headerMerged.map((h) =>
      h.toLowerCase().replace(/\s+/g, " ").trim()
    );

    // deteksi indeks kolom
    let col = {
      nama: H.findIndex((h) => h === "nama"),
      gelarDepan: H.findIndex((h) => /gelar.*depan/.test(h)),
      gelarBelakang: H.findIndex((h) => /gelar.*belakang/.test(h)),
      nip: H.findIndex((h) => /nip|nuptk/.test(h)),
      jk: H.findIndex((h) => /jenis\s*kelamin/.test(h)),
      status: H.findIndex((h) => /status\s*pegawai/.test(h)),
      usiaTahun: H.findIndex((h) => /usia.*tahun/.test(h)),
      usiaBulan: H.findIndex((h) => /usia.*bulan/.test(h)),
      pangkat: H.findIndex((h) => /(pangkat|golongan)/.test(h)),
      pendidikan: H.findIndex((h) => /pendidikan/.test(h)),
      unit: H.findIndex((h) => /unit kerja|unit|fakultas/.test(h)),
      bidang: H.findIndex((h) => /bidang\s*keahlian|keahlian/.test(h)),
      ket: H.findIndex((h) => /keterangan/.test(h)),
    };

    // fallback ke indeks yang Anda tunjukkan saat debug (0-based):
    const fallback = {
      nama: 1,
      gelarDepan: 2,
      gelarBelakang: 3,
      nip: 4,
      jk: 5,
      status: 6,
      usiaTahun: 7,
      usiaBulan: 8,
      pangkat: 9,
      pendidikan: 10,
      unit: 11,
      bidang: 12,
      ket: 13,
    };
    for (const k of Object.keys(col)) {
      if (col[k] === -1) col[k] = fallback[k];
    }

    console.log("Header merged:", headerMerged);
    console.log("Detected columns (with fallback):", col);

    // data start di baris 2 (index 2) sesuai debug Anda
    const dataStart = 2;
    let countPeople = 0;
    let countSkillsNew = 0;

    const skillCache = new Map(); // slug -> id

    for (let r = dataStart; r < rows.length; r++) {
      const row = rows[r] || [];
      const get = (i) => String(row[i] ?? "").trim();

      const nama = get(col.nama);
      if (!nama) continue;

      const unitName = get(col.unit) || "Unit Tidak Diketahui";
      const unit = await prisma.unit.upsert({
        where: { name: unitName },
        create: { name: unitName },
        update: {},
      });

      const person = await prisma.person.create({
        data: {
          nama,
          gelarDepan: get(col.gelarDepan) || null,
          gelarBelakang: get(col.gelarBelakang) || null,
          nipNuptk: get(col.nip) || null,
          jenisKelamin: get(col.jk) || null,
          statusPegawai: get(col.status) || null,
          usiaTahun: get(col.usiaTahun)
            ? Number(get(col.usiaTahun)) || null
            : null,
          usiaBulan: get(col.usiaBulan)
            ? Number(get(col.usiaBulan)) || null
            : null,
          pangkatGolongan: get(col.pangkat) || null,
          pendidikanTerakhir: get(col.pendidikan) || null,
          unitId: unit.id,
        },
      });
      countPeople++;

      const skills = splitSkills(get(col.bidang));
      for (const raw of skills) {
        const name = raw.replace(/\s+/g, " ").trim();
        if (!name) continue;
        const slug = toSlug(name);

        let skillId = skillCache.get(slug);
        if (!skillId) {
          const skill = await prisma.skill.upsert({
            where: { slug },
            create: { name, slug, aliases: [] }, // JSON array (schema: Json?)
            update: {},
          });
          skillId = skill.id;
          skillCache.set(slug, skillId);
          countSkillsNew++;
        }

        await prisma.personSkill.upsert({
          where: { personId_skillId: { personId: person.id, skillId } },
          create: { personId: person.id, skillId, level: 3 },
          update: {},
        });
      }

      if (countPeople % 200 === 0) {
        console.log(`Processed ${countPeople} rows…`);
      }
    }

    console.log(
      `Import selesai. People: ${countPeople}, Skills baru: ${countSkillsNew}`
    );
  } catch (e) {
    console.error("Import FAILED:", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
