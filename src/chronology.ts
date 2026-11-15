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

/** A vault note as the chronology reads it: its path, its file name (what links point to) and its text. */
export interface ChronologyNote {
	path: string;
	nombre: string;
	note: string;
}

/** Scenes from `Manuscrito/` notes and routes from `tipo: lugar` sheets; everything else is ignored. */
export function readChronology(notes: ChronologyNote[]): { scenes: SceneTime[]; travels: Travel[] } {
	const scenes: SceneTime[] = [];
	const travels: Travel[] = [];
	for (const { path, nombre, note } of notes) {
		if (scalar(frontmatterBody(note), "tipo") === "lugar") {
			travels.push(...parseTravels(nombre, note));
		}
		const scene = isManuscript(path) ? parseSceneTime(nombre, note) : null;
		if (scene) {
			scenes.push(scene);
		}
	}
	return { scenes, travels };
}

/**
 * The `viajes:` list of the place sheet whose file name is `desde`: `- a: "[[Place]]"` + `dias: <n>`,
 * items at column zero or indented, as long as each item's fields line up.
 */
export function parseTravels(desde: string, note: string): Travel[] {
	const frontmatter = frontmatterBody(note);
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
	let indent = -1;
	for (const line of lines.slice(start + 1)) {
		const field = /^( *)(- )?(\w+):\s*(.*)$/.exec(line);
		const spaces = field?.[1]?.length ?? -1;
		if (field?.[2] && (indent === -1 || spaces === indent)) {
			push();
			indent = spaces;
			current = { a: "", dias: "" };
		} else if (!field || field[2] || indent === -1 || spaces !== indent + 2) {
			break;
		}
		const key = field[3];
		if (current && (key === "a" || key === "dias")) {
			const value = unquote(field[4] ?? "");
			current[key] = key === "a" ? linkName(value) : value;
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

/** `[[Lugares/Puerto#Muelle|el puerto]]` → `Puerto`: the file name a link points to, without folder, heading or alias. */
function linkName(value: string): string {
	const link = /^\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]$/.exec(value.trim());
	const target = (link ? (link[1] ?? "") : value).trim();
	return (target.split("/").pop() ?? "").trim();
}

function isManuscript(path: string): boolean {
	return path.startsWith("Manuscrito/") || path.includes("/Manuscrito/");
}
