import { buildEntityIndex, type VaultNote } from "./entities.ts";
import { frontmatterBody, scalar } from "./frontmatter.ts";
import { parseObject } from "./objects.ts";
import { sheetFolder } from "./sheets.ts";

export const CLUE_STATES = ["sembrado", "reforzado", "resuelto"] as const;

export type ClueState = (typeof CLUE_STATES)[number];

export interface Clue {
	nombre: string;
	estado: string;
	sembrado: string;
	resuelto: string;
	objeto: string;
}

export interface OpenClue extends Clue {
	path: string;
}

export interface ForgottenObject {
	nombre: string;
	path: string;
	escenas: string[];
}

/** Clues live next to the plot notes, in the project's `Trama/`, marked `tipo: pista`. */
export function clueFolder(activePath: string): string {
	return sheetFolder(activePath, "Trama");
}

export function clueNote(name: string): string {
	return [
		"---",
		"tipo: pista",
		`nombre: ${JSON.stringify(name)}`,
		"estado: sembrado",
		"sembrado:",
		"reforzado: []",
		"resuelto:",
		"objeto:",
		"---",
		"",
		"<!-- estado: sembrado | reforzado | resuelto -->",
		"<!-- sembrado / resuelto: capítulo, p. ej. \"[[Cap 03]]\"; reforzado: lista de capítulos; objeto: \"[[Objeto]]\" -->",
		"",
		"## Pista",
		"",
		"## Cómo se resuelve",
		"",
	].join("\n");
}

export function parseClue(note: string): Clue {
	const frontmatter = frontmatterBody(note);
	return {
		nombre: scalar(frontmatter, "nombre"),
		estado: scalar(frontmatter, "estado"),
		sembrado: scalar(frontmatter, "sembrado"),
		resuelto: scalar(frontmatter, "resuelto"),
		objeto: scalar(frontmatter, "objeto"),
	};
}

export function isClueState(value: string): value is ClueState {
	return (CLUE_STATES as readonly string[]).includes(value);
}

/** One step forward: sembrado → reforzado → resuelto. An unknown state restarts at sembrado. */
export function nextState(current: string): ClueState {
	if (!isClueState(current)) {
		return "sembrado";
	}
	return CLUE_STATES[Math.min(CLUE_STATES.indexOf(current) + 1, CLUE_STATES.length - 1)] ?? "resuelto";
}

/** Forward only. A clue can be reinforced again; a resolved clue does not move. */
export function canMove(from: string, to: string): boolean {
	if (!isClueState(from) || !isClueState(to) || from === "resuelto") {
		return false;
	}
	const step = CLUE_STATES.indexOf(to) - CLUE_STATES.indexOf(from);
	return step > 0 || (step === 0 && to === "reforzado");
}

/** Clues of one project that are not `resuelto`, by path. */
export function openClues(project: string, notes: VaultNote[]): OpenClue[] {
	const prefix = project.length > 0 ? `${project}/Trama/` : "Trama/";
	return notes
		.filter((note) => note.path.startsWith(prefix) && scalar(frontmatterBody(note.text), "tipo") === "pista")
		.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))
		.map((note) => ({ ...parseClue(note.text), path: note.path }))
		.filter((clue) => clue.estado !== "resuelto");
}

/** Objects with a `funcion` (narrative weight) that the manuscript names in fewer than two scenes. */
export function forgottenObjects(project: string, notes: VaultNote[]): ForgottenObject[] {
	const texts = new Map(notes.map((note) => [note.path, note.text]));
	return buildEntityIndex(project, notes)
		.filter((entry) => entry.tipo === "objeto")
		.filter((entry) => parseObject(texts.get(entry.path) ?? "").funcion.length > 0)
		.filter((entry) => entry.escenas.length < 2)
		.map((entry) => ({ nombre: entry.nombre, path: entry.path, escenas: entry.escenas }));
}
