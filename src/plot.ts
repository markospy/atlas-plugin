import { sheetFolder } from "./places.ts";

export const PLOT_STRUCTURES = {
	"tres-actos": {
		nombre: "Tres actos",
		beats: ["Acto I", "Acto II", "Acto III"],
	},
	"save-the-cat": {
		nombre: "Save the Cat",
		beats: [
			"Imagen de apertura",
			"Tema expuesto",
			"Planteamiento",
			"Catalizador",
			"Debate",
			"Paso al segundo acto",
			"Trama B",
			"Juegos y diversión",
			"Punto medio",
			"Los malos se acercan",
			"Todo está perdido",
			"Noche oscura del alma",
			"Paso al tercer acto",
			"Final",
			"Imagen final",
		],
	},
	"viaje-del-heroe": {
		nombre: "Viaje del héroe",
		beats: [
			"El mundo ordinario",
			"La llamada a la aventura",
			"El rechazo de la llamada",
			"El encuentro con el mentor",
			"El cruce del primer umbral",
			"Pruebas, aliados y enemigos",
			"La aproximación a la caverna",
			"La odisea",
			"La recompensa",
			"El camino de regreso",
			"La resurrección",
			"El regreso con el elixir",
		],
	},
} as const;

export type PlotStructure = keyof typeof PLOT_STRUCTURES;

export const SCENE_FIELDS = ["objetivo", "conflicto", "resultado", "pov", "subtrama"] as const;

export type SceneFields = Record<(typeof SCENE_FIELDS)[number], string>;

export function plotFolder(activePath: string): string {
	return sheetFolder(activePath, "Trama");
}

export function plotNote(name: string, structure: PlotStructure): string {
	const { nombre, beats } = PLOT_STRUCTURES[structure];
	return [
		"---",
		"tipo: trama",
		`nombre: ${JSON.stringify(name)}`,
		`estructura: ${structure}`,
		"---",
		"",
		"## Premisa",
		"",
		"## Tema",
		"",
		"## Conflicto central",
		"",
		"## Arcos",
		"",
		"## Subtramas",
		"",
		`## Estructura: ${nombre}`,
		"",
		...beats.flatMap((beat) => [`### ${beat}`, ""]),
	].join("\n");
}

export function parseScene(note: string): SceneFields {
	const frontmatter = frontmatterBody(note);
	const scene = {} as SceneFields;
	for (const field of SCENE_FIELDS) {
		scene[field] = scalar(frontmatter, field);
	}
	return scene;
}

function frontmatterBody(note: string): string {
	if (!note.startsWith("---\n")) {
		return "";
	}
	const end = note.indexOf("\n---", 3);
	return end === -1 ? "" : note.slice(4, end);
}

function scalar(frontmatter: string, key: string): string {
	const match = new RegExp(`^${key}:[ \\t]*(.*)$`, "m").exec(frontmatter);
	const value = (match?.[1] ?? "").trim();
	if (value.startsWith('"') && value.endsWith('"') && value.length > 1) {
		try {
			return JSON.parse(value) as string;
		} catch {
			return value.slice(1, -1);
		}
	}
	return value;
}
