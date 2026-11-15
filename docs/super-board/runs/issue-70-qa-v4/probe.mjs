// QA #70 v4: bordes de aprobar en _Memoria/ y del export. Ejecutar desde la raíz:
// node --experimental-strip-types docs/super-board/runs/issue-70-qa-v4/probe.mjs
import { parseProposal, writeApproved } from "../../../../src/extract.ts";
import { parseMemory } from "../../../../src/memory.ts";
import { manuscriptScenes } from "../../../../src/export.ts";
const MEMORIA = "P/_Memoria/Cap 03.md";
const destino = { capitulo: 3, memoria: MEMORIA, lugar: (n) => `P/Lugares/${n}.md` };
const R = JSON.stringify({
  hechos: [{ id: "007", texto: 'Dice: "no" # y [[Ana]], {x}', verdad: true }],
  conocimiento: [{ hecho: "007", quien: "[[Ana]]", estado: "sabe" }],
});
function mock(init){const store=new Map(Object.entries(init));return{store,exists:async p=>store.has(p),createFolder:async()=>{},read:async p=>store.get(p),write:async(p,d)=>{store.set(p,d)}}}
const cases = {
  crlf_close_spaces: ["---", "capitulo: 3", "hechos:", "  - id: anillo", "    texto: El anillo", "---  ", "Cuerpo", ""].join("\r\n"),
  close_tab: ["---", "capitulo: 3", "hechos: [{id: anillo, texto: El anillo}]", "---\t", "Cuerpo", ""].join("\n"),
  body_scene_break: ["---", "capitulo: 3", "hechos:", "  - id: anillo", "    texto: El anillo", "---", "Cuerpo", "---", "hechos: falso", "---", ""].join("\n"),
  flow_inline_spaces_close: ["---", "capitulo: 3", "hechos: [{id: anillo, texto: El anillo}]", "--- ", "Cuerpo", ""].join("\n"),
  comments_and_spaced_props: ["---", "# a mano", "mi propiedad: valor con espacios", "capitulo: 3 # cap", "hechos:", "  - id: anillo # fijo", "    texto: El anillo", "---", ""].join("\n"),
};
for (const [k, n] of Object.entries(cases)) {
  const f = mock({ [MEMORIA]: n });
  try {
    await writeApproved(f, destino, parseProposal(R), new Set(["h1", "c1"]));
    const w = f.store.get(MEMORIA);
    const m = parseMemory(w);
    const prefix = n.split(/\r?\n/).filter((l) => !/^---\s*$/.test(l));
    const lost = prefix.filter((l) => !w.includes(l));
    console.log(`== ${k}\n${JSON.stringify(w)}\nfrontmatters=${w.split(/\r?\n/).filter((l) => l === "---").length} hechos=${JSON.stringify(m.hechos)} conocimiento=${JSON.stringify(m.conocimiento)} capitulo=${m.capitulo} lineas_perdidas=${JSON.stringify(lost)}`);
  } catch (e) {
    console.log(`== ${k} THREW: ${e.message} · nota intacta: ${f.store.get(MEMORIA) === n}`);
  }
}
const INDEX = "Novela/Mi Novela.md";
const scenes = {
  dialogo_comillas: '---\n"Hola", dijo ella.\n---\nTras una pausa.',
  nota_autor: "---\n{Nota del autor}\n---\nTras una pausa.",
  frontmatter_real: "---\ntitulo: Uno\n---\nTexto.",
};
for (const [k, text] of Object.entries(scenes)) {
  const { escenas } = await manuscriptScenes(INDEX, { titulo: "", carpeta: "", escenas: ["E"] }, async () => text);
  console.log(`== export ${k}: ${JSON.stringify(escenas[0].texto)}`);
}
