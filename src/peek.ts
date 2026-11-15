import { parseCharacter } from "./characters.ts";
import { buildEntityIndex, type EntityEntry, type EntityKind, type VaultNote } from "./entities.ts";
import { linkTarget } from "./graph.ts";
import { chapterNumber } from "./memory.ts";
import { parseObject } from "./objects.ts";
import { parsePlace } from "./places.ts";
import { inProject } from "./sheets.ts";
import { worldAt, type WorldSheets } from "./world.ts";

export type Peek = { ok: true; entidad: EntityEntry; estado: string[] } | { ok: false };

/** Entity whose name or alias, as a whole word, covers column `ch` of `line`; the longest match wins. */
export function entityAt(line: string, ch: number, entities: EntityEntry[]): EntityEntry | null {
	let best: EntityEntry | null = null;
	let bestLength = 0;
	for (const entity of entities) {
		for (const term of [entity.nombre, ...entity.alias]) {
			const clean = term.trim();
			if (clean.length <= bestLength) {
				continue;
			}
			const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu");
			for (const match of line.matchAll(pattern)) {
				const start = match.index ?? 0;
				if (start <= ch && ch <= start + match[0].length) {
					best = entity;
					bestLength = clean.length;
					break;
				}
			}
		}
	}
	return best;
}

/** The entity under the cursor and its state in `chapter` (relations, holder, place state). */
export function peekAt(
	line: string,
	ch: number,
	entities: EntityEntry[],
	sheets: WorldSheets,
	chapter: number | null,
): Peek {
	const entidad = entityAt(line, ch, entities);
	if (!entidad) {
		return { ok: false };
	}
	return { ok: true, entidad, estado: chapter === null ? [] : stateOf(entidad, sheets, chapter) };
}

function stateOf(entity: EntityEntry, sheets: WorldSheets, chapter: number): string[] {
	const world = worldAt(sheets, chapter);
	const name = entity.nombre.toLowerCase();
	const is = (value: string) => linkTarget(value).toLowerCase() === name;
	if (entity.tipo === "objeto") {
		return world.posesiones.filter((item) => is(item.objeto)).map((item) => `Poseedor: ${linkTarget(item.poseedor)}`);
	}
	if (entity.tipo === "lugar") {
		return world.lugares.filter((item) => is(item.lugar)).map((item) => `Estado: ${item.estado} (desde ${item.desde})`);
	}
	return [
		...world.relaciones.filter((item) => is(item.personaje)).map((item) => `Relación: ${item.tipo} de ${linkTarget(item.con)}`),
		...world.relaciones.filter((item) => is(item.con)).map((item) => `Relación: ${item.personaje} → ${item.tipo}`),
		...world.posesiones.filter((item) => is(item.poseedor)).map((item) => `Posee: ${item.objeto}`),
	];
}

/** Whether `path` is an entity sheet of `project`: inside the project and outside `Manuscrito/`. */
export function isSheetPath(project: string, path: string): boolean {
	const prefix = project.length > 0 ? `${project}/` : "";
	return inProject(project, path) && !path.startsWith(`${prefix}Manuscrito/`);
}

/** Chapter of the note at `path`: from its own name (`Cap 03.md`), else its folder (`Cap 03/`). */
export function chapterOf(path: string): number | null {
	return chapterNumber(path) ?? chapterNumber(path.slice(0, Math.max(0, path.lastIndexOf("/"))));
}

/** Entity index and parsed sheets of `project`; a sheet without `nombre` takes its note title, as in the index. */
export function projectSheets(project: string, notes: VaultNote[]): { entities: EntityEntry[]; sheets: WorldSheets } {
	const sheetNotes = notes.filter((note) => isSheetPath(project, note.path));
	const entities = buildEntityIndex(project, sheetNotes);
	const text = new Map(sheetNotes.map((note) => [note.path, note.text]));
	const parsed = <T extends { nombre: string }>(tipo: EntityKind, parse: (note: string) => T): T[] =>
		entities
			.filter((entity) => entity.tipo === tipo)
			.map((entity) => ({ ...parse(text.get(entity.path) ?? ""), nombre: entity.nombre }));
	return {
		entities,
		sheets: {
			personajes: parsed("personaje", parseCharacter),
			objetos: parsed("objeto", parseObject),
			lugares: parsed("lugar", parsePlace),
		},
	};
}
