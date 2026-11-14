import type { CharacterSheet } from "./characters";
import type { ObjectSheet } from "./objects";
import type { PlaceSheet } from "./places";

export interface WorldSheets {
	personajes: CharacterSheet[];
	objetos: ObjectSheet[];
	lugares: PlaceSheet[];
}

export interface WorldRelation {
	personaje: string;
	con: string;
	tipo: string;
	nota?: string;
}

export interface WorldPossession {
	objeto: string;
	poseedor: string;
}

export interface WorldPlace {
	lugar: string;
	estado: string;
	desde: string;
}

export interface WorldState {
	relaciones: WorldRelation[];
	posesiones: WorldPossession[];
	lugares: WorldPlace[];
}

/** Snapshot of the world in chapter `chapter`: relations in force, object holders, place states. */
export function worldAt(sheets: WorldSheets, chapter: number): WorldState {
	return {
		relaciones: sheets.personajes.flatMap((sheet) =>
			sheet.relaciones
				.filter((relation) => inForce(relation.desde, relation.hasta, chapter))
				.map((relation) => ({
					personaje: sheet.nombre,
					con: relation.con,
					tipo: relation.tipo,
					...(relation.nota ? { nota: relation.nota } : {}),
				})),
		),
		posesiones: sheets.objetos
			.flatMap((sheet) => {
				const holder = latestAt(sheet.posesiones, chapter);
				return holder && holder.poseedor.length > 0 ? [{ objeto: sheet.nombre, poseedor: holder.poseedor }] : [];
			}),
		lugares: sheets.lugares.flatMap((sheet) => {
			const state = latestAt(sheet.estados, chapter);
			return state ? [{ lugar: sheet.nombre, estado: state.descripcion, desde: state.capitulo }] : [];
		}),
	};
}

/** A relation starts at `desde` and ends when `hasta` begins; a missing bound is open. */
function inForce(desde: string | undefined, hasta: string | undefined, chapter: number): boolean {
	const start = desde ? chapterNumber(desde) : null;
	const end = hasta ? chapterNumber(hasta) : null;
	return (start === null || start <= chapter) && (end === null || chapter < end);
}

/** The latest change at or before `chapter`, or null. Ties go to the later entry. */
function latestAt<T extends { capitulo: string }>(changes: T[], chapter: number): T | null {
	let current: T | null = null;
	let since = -Infinity;
	for (const change of changes) {
		const at = chapterNumber(change.capitulo);
		if (at !== null && at <= chapter && at >= since) {
			current = change;
			since = at;
		}
	}
	return current;
}

function chapterNumber(chapter: string): number | null {
	const match = /\d+/.exec(chapter);
	return match ? Number(match[0]) : null;
}
