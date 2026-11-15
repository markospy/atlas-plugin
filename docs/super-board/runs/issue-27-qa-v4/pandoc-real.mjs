// Real pandoc probe: same args and stdin as the plugin (exportManuscript + main.ts runner).
import { execFile, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportManuscript, exportMessage } from "../../../../src/export.ts";
const vault = mkdtempSync(join(tmpdir(), "atlas-probe-"));
mkdirSync(join(vault, "Exportar"));
const run = (args, input) => new Promise((ok, ko) => {
	const c = execFile("pandoc", args, { cwd: vault }, (e, _o, err) => (e ? ko(new Error(String(err).trim() || e.message)) : ok()));
	c.stdin?.end(input);
});
const io = { writeBinary: async () => {}, pandoc: run };
const escenas = [{ titulo: "Cap 02", texto: "Primero va esta." }, { titulo: "Cap 01", texto: "Luego esta." }];
console.log(spawnSync("pandoc", ["--version"], { encoding: "utf8" }).stdout.split("\n")[0]);
for (const f of ["epub", "pdf"]) {
	const r = await exportManuscript(f, "Mi Novela", escenas, "Exportar", io);
	console.log(`${f}: ${exportMessage(r, [])}`);
	if (r.ok) console.log(spawnSync("unzip", ["-l", join(vault, r.ruta)], { encoding: "utf8" }).stdout);
}
// v4: DOCX real escrito por el plugin, releído por pandoc (abre y conserva el orden).
import { writeFileSync } from "node:fs";
import { docxFile } from "../../../../src/export.ts";
const docx = join(vault, "manuscrito.docx");
writeFileSync(docx, docxFile(escenas));
console.log("docx->md:\n" + spawnSync("pandoc", [docx, "-t", "markdown"], { encoding: "utf8" }).stdout);
