import { frontmatterBody, list, mapList, scalar } from "./frontmatter.ts";
import { sheetFolder } from "./sheets.ts";

export interface CharacterRelation {
	con: string;
	tipo: string;
	desde?: string;
	hasta?: string;
	nota?: string;
}

export interface CharacterSheet {
	nombre: string;
	alias: string[];
	relaciones: CharacterRelation[];
}

const WIKILINK = /^\[\[[^\]]+\]\]$/;

export function characterFolder(activePath: string): string {
	return sheetFolder(activePath, "Personajes");
}

export function characterNote(name: string): string {
	return [
		"---",
		"tipo: personaje",
		`nombre: ${JSON.stringify(name)}`,
		"alias: []",
		"relaciones: []",
		"---",
		"",
		"## Físico",
		"",
		"## Psicología",
		"",
		"- Deseo:",
		"- Miedo:",
		"- Herida:",
		"- Contradicción:",
		"",
		"## Voz",
		"",
		"## Arco",
		"",
		"- Inicio:",
		"- Final:",
		"",
	].join("\n");
}

export function relationErrors(relations: CharacterRelation[]): string[] {
	return relations
		.filter((relation) => !WIKILINK.test(relation.con.trim()))
		.map((relation) => `La relación «${relation.tipo || "sin tipo"}» necesita un destino [[nota]].`);
}

export function parseCharacter(note: string): CharacterSheet {
	const frontmatter = frontmatterBody(note);
	return {
		nombre: scalar(frontmatter, "nombre"),
		alias: list(frontmatter, "alias"),
		relaciones: parseRelations(frontmatter),
	};
}

function parseRelations(frontmatter: string): CharacterRelation[] {
	return mapList(frontmatter, "relaciones").map((item) => {
		const relation: CharacterRelation = { con: item.con ?? "", tipo: item.tipo ?? "" };
		for (const key of ["desde", "hasta", "nota"] as const) {
			if (item[key] !== undefined) {
				relation[key] = item[key];
			}
		}
		return relation;
	});
}
