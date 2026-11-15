import { frontmatterBody, mapList, scalar } from "./frontmatter.ts";
import { sheetFolder } from "./sheets.ts";

export interface PlaceState {
	capitulo: string;
	descripcion: string;
}

export interface PlaceSheet {
	nombre: string;
	padre: string;
	estados: PlaceState[];
}

export function placeFolder(activePath: string): string {
	return sheetFolder(activePath, "Lugares");
}

export function placeNote(name: string): string {
	return [
		"---",
		"tipo: lugar",
		`nombre: ${JSON.stringify(name)}`,
		"padre:",
		"estados: []",
		"viajes: []",
		"---",
		"",
		"## Vista",
		"",
		"## Sonido",
		"",
		"## Olor",
		"",
		"## Tacto",
		"",
		"## Disposición",
		"",
		"## Atmósfera",
		"",
	].join("\n");
}

export function parsePlace(note: string): PlaceSheet {
	const frontmatter = frontmatterBody(note);
	return {
		nombre: scalar(frontmatter, "nombre"),
		padre: scalar(frontmatter, "padre"),
		estados: parseStates(frontmatter),
	};
}

function parseStates(frontmatter: string): PlaceState[] {
	return mapList(frontmatter, "estados").map((item) => ({
		capitulo: item.capitulo ?? "",
		descripcion: item.descripcion ?? "",
	}));
}
