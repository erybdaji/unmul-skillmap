const XLSX = require("xlsx");

const EXCEL_PATH = "data/Database Dosen Unmul dan Keahlian.xlsx";
const wb = XLSX.readFile(EXCEL_PATH);
console.log("Sheet names:", wb.SheetNames);

const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

console.log("Total rows:", rows.length);
for (let r = 0; r < Math.min(8, rows.length); r++) {
  const row = rows[r].slice(0, 20).map(v => String(v ?? ""));
  console.log(r, row);
}
