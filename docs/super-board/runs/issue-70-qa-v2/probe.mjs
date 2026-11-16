import { parseProposal, writeApproved } from "../../../../src/extract.ts";
import { parseMemory } from "../../../../src/memory.ts";
const MEMORIA = "P/_Memoria/Cap 03.md";
const destino = { capitulo: 3, memoria: MEMORIA, lugar: (n) => `P/Lugares/${n}.md` };
const R = JSON.stringify({ hechos: [{ id: "carta", texto: "La carta es falsa", verdad: false }] });
function mock(init){const store=new Map(Object.entries(init));return{store,exists:async p=>store.has(p),createFolder:async()=>{},read:async p=>store.get(p),write:async(p,d)=>{store.set(p,d)}}}
const cases = {
 wikilink: ["---","tipo: memoria","capitulo: 3","hechos:","  - id: anillo","    texto: El anillo","conocimiento:","  - hecho: anillo","    quien: [[Ana]]","    estado: sabe","---","Cuerpo",""].join("\n"),
 crlf_tab: ["---","tipo: memoria","capitulo: 03","hechos:","  - id: anillo","    texto: 'El anillo'","---\t","Cuerpo",""].join("\r\n"),
 blanklines: ["---","tipo: memoria","","capitulo: 3  # cap","aliases: [a, b]","tags:","- x","hechos: [{id: anillo, texto: El anillo}]","---","Cuerpo con: dos puntos",""].join("\n"),
 nofm_scene: ["---","Ella dijo: hola: adios","---","Cuerpo",""].join("\n"),
 trailing_no_nl: "---\nhechos:\n---",
};
for (const [k,n] of Object.entries(cases)) {
  const f = mock({[MEMORIA]: n});
  try { await writeApproved(f, destino, parseProposal(R), new Set(["h1"])); const w=f.store.get(MEMORIA); console.log("== "+k+"\n"+JSON.stringify(w)+"\n"+w); console.log("parsed:", JSON.stringify(parseMemory(w).hechos), JSON.stringify(parseMemory(w).conocimiento ?? null)); }
  catch(e){ console.log("== "+k+" THREW: "+e.message, "unchanged:", f.store.get(MEMORIA)===n); }
}
