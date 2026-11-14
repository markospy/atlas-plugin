import { GraphView } from "../../../../../src/graph-view.ts";
const notes = {
  "Novela/Personajes/Elena.md": `---\nrelaciones:\n  - con: "[[Marcos]]"\n    tipo: hermano\n  - con: "[[Iván|el traidor]]"\n    tipo: rival\n    desde: "[[Cap 07]]"\n  - con: "[[Lucía]]"\n    tipo: amiga\n    desde: "[[Cap 02]]"\n    hasta: "[[Cap 05]]"\n---\n`,
  "Novela/Personajes/Marcos.md": `---\nrelaciones:\n  - con: "[[Iván]]"\n    tipo: rival\n    hasta: "[[Cap 03]]"\n---\n`,
  "Novela/Personajes/Iván.md": `---\n---\n`,
  "Novela/Personajes/Lucía.md": `---\n---\n`,
};
const files = Object.keys(notes).map((path) => ({ path, basename: path.split("/").pop().replace(/\.md$/, "") }));
const app = { vault: { getMarkdownFiles: () => files, read: async (f) => notes[f.path] } };
const view = new GraphView({ app });
await view.onOpen();
const q = new URLSearchParams(location.search);
const sel = document.querySelector("select"), num = document.querySelector("input");
if (q.get("tipo")) { sel.value = q.get("tipo"); sel.dispatchEvent(new Event("change")); }
if (q.get("cap")) { const n = document.querySelector("input"); n.value = q.get("cap"); n.dispatchEvent(new Event("change")); }
document.body.dataset.ready = "1";
window.__edges = [...document.querySelectorAll("svg line")].length;
