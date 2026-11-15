// QA #70 v3: sondas de bordes de appendToList y de frontmatterEnd (export). Ejecutar desde la raíz:
// node --experimental-strip-types docs/super-board/runs/issue-70-qa-v3/probe.mjs
import { parseProposal, writeApproved } from "../../../../src/extract.ts";
import { parseMemory } from "../../../../src/memory.ts";
import { manuscriptScenes } from "../../../../src/export.ts";
const MEMORIA = "P/_Memoria/Cap 03.md";
const destino = { capitulo: 3, memoria: MEMORIA, lugar: (n) => `P/Lugares/${n}.md` };
const R = JSON.stringify({
  hechos: [{ id: "carta", texto: "La carta es falsa", verdad: false }],
  conocimiento: [{ hecho: "carta", quien: "Ana", estado: "sabe" }],
});
function mock(init){const store=new Map(Object.entries(init));return{store,exists:async p=>store.has(p),createFolder:async()=>{},read:async p=>store.get(p),write:async(p,d)=>{store.set(p,d)}}}
const fm = (...l) => ["---", "tipo: memoria", "capitulo: 3", ...l, "---", "Cuerpo", ""].join("\n");
const cases = {
  block_trailing_comment: fm("hechos:", "  - id: anillo", "    texto: El anillo", "  # fin de hechos", "otro: x"),
  block_blank_before_close: fm("hechos:", "  - id: anillo", "    texto: El anillo", ""),
  block_literal_scalar: fm("hechos:", "  - id: anillo", "    texto: |", "      Línea uno", "      Línea dos", "otro: x"),
  block_zero_indent: fm("hechos:", "- id: anillo", "  texto: El anillo", "otro: x"),
  flow_trailing_comma: fm("hechos: [{id: anillo, texto: El anillo},]"),
  flow_with_comment: fm("hechos: [{id: anillo, texto: El anillo}] # a mano"),
  flow_multiline_trailing_comma: fm("hechos: [", "  {id: anillo, texto: El anillo},", "]"),
  empty_flow_comment: fm("hechos: [] # a mano", "otro: x"),
  empty_tilde: fm("hechos: ~", "otro: x"),
  empty_key_then_key: fm("hechos:", "otro: x"),
  missing_key_comment_last: fm("# comentario final"),
  quoted_key: fm('"hechos":', "  - id: anillo"),
};
for (const [k, n] of Object.entries(cases)) {
  const f = mock({ [MEMORIA]: n });
  try {
    await writeApproved(f, destino, parseProposal(R), new Set(["h1", "k1"]));
    const w = f.store.get(MEMORIA);
    const m = parseMemory(w);
    console.log(`== ${k}\n${w}parsed hechos=${JSON.stringify(m.hechos.map((h) => h.id))} conocimiento=${JSON.stringify((m.conocimiento ?? []).map((c) => c.hecho))} capitulo=${m.capitulo}`);
  } catch (e) {
    console.log(`== ${k} THREW: ${e.message} · nota intacta: ${f.store.get(MEMORIA) === n}`);
  }
}
// Export: escenas que abren con un `---` de escena y un bloque que no es YAML válido.
const INDEX = "Novela/Mi Novela.md";
const scenes = {
  dialogo_comillas: '---\n"Hola", dijo ella.\n---\nTras una pausa.',
  dos_puntos: "---\nElla dijo: hola: adiós\n---\nTras una pausa.",
  linea_suelta: "---\nUna línea suelta\n---\nTras una pausa.",
};
for (const [k, text] of Object.entries(scenes)) {
  const { escenas } = await manuscriptScenes(INDEX, { titulo: "", carpeta: "", escenas: ["E"] }, async () => text);
  console.log(`== export ${k}: ${JSON.stringify(escenas[0].texto)}`);
}
