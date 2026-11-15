import { frontmatterBody, list, scalar, unquote } from "./frontmatter.ts";

/** A scene placed in time: relative `dia`, where it happens and who is there. */
export interface SceneTime {
	nombre: string;
	dia: number;
	lugar: string;
	personajes: string[];
}

/** Minimum days to travel between two places; it holds in both directions, the shortest declared route wins. */
export interface Travel {
	desde: string;
	a: string;
	dias: number;
}

export interface ImpossibleTravel {
	personaje: string;
	desde: string;
	hasta: string;
	origen: string;
	destino: string;
	dias: number;
	minimo: number;
}

/** Reads `dia`, `lugar`, `pov` and `personajes`; null when the scene has no numeric day or place. */
export function parseSceneTime(nombre: string, note: string): SceneTime | null {
	const frontmatter = frontmatterBody(note);
	const day = scalar(frontmatter, "dia");
	const lugar = linkName(scalar(frontmatter, "lugar"));
	if (day.length === 0 || !Number.isFinite(Number(day)) || lugar.length === 0) {
		return null;
	}
	const pov = linkName(scalar(frontmatter, "pov"));
	const personajes = [...new Set([pov, ...list(frontmatter, "personajes").map(linkName)])].filter(
		(name) => name.length > 0,
	);
	return { nombre, dia: Number(day), lugar, personajes };
}

/** The `viajes:` list of a place sheet: `- a: "[[Place]]"` + `dias: <n>`. */
export function parseTravels(note: string): Travel[] {
	const frontmatter = frontmatterBody(note);
	const desde = linkName(scalar(frontmatter, "nombre"));
	const lines = frontmatter.split("\n");
	const start = lines.findIndex((line) => line === "viajes:");
	if (start === -1) {
		return [];
	}
	const travels: Travel[] = [];
	let current: { a: string; dias: string } | null = null;
	const push = () => {
		if (current && desde.length > 0 && current.a.length > 0 && Number.isFinite(Number(current.dias)) && current.dias.length > 0) {
			travels.push({ desde, a: current.a, dias: Number(current.dias) });
		}
	};
	for (const line of lines.slice(start + 1)) {
		const field = /^ {2}(- | {2})(\w+):\s*(.*)$/.exec(line);
		if (!field) {
			break;
		}
		if (field[1] === "- ") {
			push();
			current = { a: "", dias: "" };
		}
		if (current && (field[2] === "a" || field[2] === "dias")) {
			const value = unquote(field[3] ?? "");
			current[field[2]] = field[2] === "a" ? linkName(value) : value;
		}
	}
	push();
	return travels;
}

/** Consecutive scenes (by day) of one character in two places closer in time than the route allows. */
export function impossibleTravels(scenes: SceneTime[], travels: Travel[]): ImpossibleTravel[] {
	const found: ImpossibleTravel[] = [];
	const characters = [...new Set(scenes.flatMap((scene) => scene.personajes))];
	for (const personaje of characters) {
		const own = scenes.filter((scene) => scene.personajes.includes(personaje)).sort((a, b) => a.dia - b.dia);
		for (let i = 1; i < own.length; i++) {
			const before = own[i - 1] as SceneTime;
			const after = own[i] as SceneTime;
			const minimo = minimumDays(travels, before.lugar, after.lugar);
			const dias = after.dia - before.dia;
			if (minimo !== null && dias < minimo) {
				found.push({
					personaje,
					desde: before.nombre,
					hasta: after.nombre,
					origen: before.lugar,
					destino: after.lugar,
					dias,
					minimo,
				});
			}
		}
	}
	return found;
}

function minimumDays(travels: Travel[], from: string, to: string): number | null {
	if (from === to) {
		return null;
	}
	const matches = travels
		.filter((travel) => (travel.desde === from && travel.a === to) || (travel.desde === to && travel.a === from))
		.map((travel) => travel.dias);
	return matches.length === 0 ? null : Math.min(...matches);
}

function linkName(value: string): string {
	const link = /^\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]$/.exec(value.trim());
	return (link ? (link[1] ?? "") : value).trim();
}
