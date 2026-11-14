import { GraphView } from "../../../../../src/graph-view.ts";
// v2: folder link (R1) and a second project in the same vault (R2).
const notes = {
  "Novela/Personajes/Elena.md": `---\nrelaciones:\n  - con: "[[Personajes/Marcos]]"\n    tipo: hermano\n  - con: "[[Iván|el traidor]]"\n    tipo: rival\n    desde: "[[Cap 07]]"\n  - con: "[[Lucía]]"\n    tipo: amiga\n    desde: "[[Cap 02]]"\n    hasta: "[[Cap 05]]"\n---\n`,
  "Novela/Personajes/Marcos.md": `---\nrelaciones:\n  - con: "[[Iván]]"\n    tipo: rival\n    hasta: "[[Cap 03]]"\n---\n`,
  "Novela/Personajes/Iván.md": `---\n---\n`,
  "Novela/Personajes/Lucía.md": `---\n---\n`,
  "Novela/Manuscrito/Cap 01.md": `Capítulo uno.\n`,
  "Otra/Personajes/Elena.md": `---\nrelaciones:\n  - con: "[[Zoe]]"\n    tipo: mentora\n---\n`,
  "Otra/Personajes/Zoe.md": `---\n---\n`,
};
const files = Object.keys(notes).map((path) => ({ path, basename: path.split("/").pop().replace(/\.md$/, "") }));
const q = new URLSearchParams(location.search);
const active = files.find((f) => f.path === (q.get("active") ?? "Novela/Manuscrito/Cap 01.md")) ?? null;
const app = { vault: { getMarkdownFiles: () => files, read: async (f) => notes[f.path] }, workspace: { getActiveFile: () => active } };
const view = new GraphView({ app });
await view.onOpen();
const sel = document.querySelector("select");
if (q.get("tipo") && sel) { sel.value = q.get("tipo"); sel.dispatchEvent(new Event("change")); }
if (q.get("cap")) { const n = document.querySelector("input"); n.value = q.get("cap"); n.dispatchEvent(new Event("change")); }
window.__edges = document.querySelectorAll("svg line").length;
window.__nodes = [...document.querySelectorAll("svg circle")].map((c) => c.nextElementSibling.textContent);
window.__labels = [...document.querySelectorAll("svg line + text")].map((t) => t.textContent);
document.body.dataset.ready = "1";
