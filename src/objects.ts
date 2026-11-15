import { frontmatterBody, mapList, scalar } from "./frontmatter.ts";
import { chapterNumber } from "./graph.ts";
import { sheetFolder } from "./sheets.ts";

export interface ObjectPossession {
	poseedor: string;
	capitulo: string;
}

export interface ObjectSheet {
	nombre: string;
	valor_material: string;
	valor_sentimental: string;
	funcion: string;
	foreshadowing: string;
	posesiones: ObjectPossession[];
}

export function objectFolder(activePath: string): string {
	return sheetFolder(activePath, "Objetos");
}

export function objectNote(name: string): string {
	return [
		"---",
		"tipo: objeto",
		`nombre: ${JSON.stringify(name)}`,
		"valor_material:",
		"valor_sentimental:",
		"funcion:",
		"foreshadowing:",
		"posesiones: []",
		"---",
		"",
		"## Descripción",
		"",
		"## Origen",
		"",
		"## Valor material",
		"",
		"## Valor sentimental",
		"",
		"Para quién y por qué.",
		"",
		"## Función en la trama",
		"",
	].join("\n");
}

export function parseObject(note: string): ObjectSheet {
	const frontmatter = frontmatterBody(note);
	return {
		nombre: scalar(frontmatter, "nombre"),
		valor_material: scalar(frontmatter, "valor_material"),
		valor_sentimental: scalar(frontmatter, "valor_sentimental"),
		funcion: scalar(frontmatter, "funcion"),
		foreshadowing: scalar(frontmatter, "foreshadowing"),
		posesiones: parsePossessions(frontmatter),
	};
}

/** Who holds the object in chapter `chapter`: the latest change at or before it, or "". */
export function holderAt(sheet: ObjectSheet, chapter: number): string {
	let holder = "";
	let since = -Infinity;
	for (const possession of sheet.posesiones) {
		const at = chapterNumber(possession.capitulo);
		if (at !== null && at <= chapter && at >= since) {
			holder = possession.poseedor;
			since = at;
		}
	}
	return holder;
}

function parsePossessions(frontmatter: string): ObjectPossession[] {
	return mapList(frontmatter, "posesiones").map((item) => ({
		poseedor: item.poseedor ?? "",
		capitulo: item.capitulo ?? "",
	}));
}
