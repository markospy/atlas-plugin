import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
const root = process.argv[2];
const ex = await import(join(root, "src/export.ts"));
const dir = mkdtempSync(join(tmpdir(), "atlas27-"));
mkdirSync(join(dir, "Libro/Escenas"), { recursive: true });
const index = `---\nlongform:\n  format: scenes\n  title: Mi Libro\n  sceneFolder: Escenas\n  scenes:\n    - Cap 02\n    - - Hija\n    - Cap 01\n    - Falta\n---\n`;
writeFileSync(join(dir, "Libro/Indice.md"), index);
writeFileSync(join(dir, "Libro/Escenas/Cap 02.md"), `---\nFecha escena: 2024\n---\nElla dijo <raro> y siguió. Ver [[nota#seccion]] y [[otra#^bloque]] y [[x#s|alias]]. ![[img.png]]`);
writeFileSync(join(dir, "Libro/Escenas/Hija.md"), "Texto hija & <b>negrita</b>\u000b fin");
writeFileSync(join(dir, "Libro/Escenas/Cap 01.md"), "Primero [[#solo-ancla]].");
const order = ex.sceneOrder(index);
const { escenas, faltan } = await ex.manuscriptScenes("Libro/Indice.md", order, async (p) => readFileSync(join(dir, p), "utf8"));
console.log("orden:", escenas.map((e) => e.titulo).join(" | "), "· faltan:", faltan.join(","));
const bin = await ex.pandocBinary(async (b) => spawnSync(b, ["--version"]).status === 0);
console.log("pandocBinary:", bin);
const io = (pandoc) => ({ writeBinary: async (p, d) => writeFileSync(join(dir, p), d), pandoc });
const real = async (args, input) => { const r = spawnSync(bin, args, { cwd: dir, input }); if (r.status !== 0) throw new Error(String(r.stderr).trim()); };
mkdirSync(join(dir, "Libro/Exportar"));
for (const f of ["docx", "epub", "pdf"]) {
  const r = await ex.exportManuscript(f, order.titulo, escenas, "Libro/Exportar", io(real));
  console.log(f, "->", ex.exportMessage(r, faltan).replace(/\n/g, " / ").slice(0, 160));
  if (r.ok) console.log("  texto:", execFileSync(bin, [join(dir, r.ruta), "-t", "plain", "--wrap=none"]).toString().replace(/\s+/g, " ").trim());
}
for (const f of ["docx", "epub"]) { const r = await ex.exportManuscript(f, order.titulo, escenas, "Libro/Exportar", io(null)); console.log("sin pandoc", f, "->", r.ok ? "ok " + r.ruta : r.mensaje); }
