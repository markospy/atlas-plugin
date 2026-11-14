// Loads the bundled plugin (src/main.ts) and checks the merge kept graph + entity views and commands.
const { default: AtlasPlugin } = await import(process.argv[2]);
const p = new AtlasPlugin({ workspace: {}, vault: {} });
await p.onload();
const ids = p.commands.map((c) => c.id);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
console.log("views", JSON.stringify(p.views));
console.log("commands", JSON.stringify(p.commands.map((c) => `${c.id}=${c.name}`)));
const ok = p.views.includes("atlas-relation-graph") || p.views.some((v) => /graph/.test(v));
const need = ["show-relation-graph", "scan-entities", "new-object", "new-skill"].filter((id) => !ids.includes(id));
console.log(dup.length || need.length || !ok ? `FAIL dup=${dup} missing=${need} graphView=${ok}` : "OK no duplicate ids, graph + entity views and commands present");
process.exit(dup.length || need.length || !ok ? 1 : 0);
