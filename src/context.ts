import type { CharacterSheet } from "./characters";
import { mentions } from "./entities.ts";
import { chapterNumber, linkTarget } from "./graph.ts";
import { memoryNoteName, READER, whatKnows, type ChapterMemory } from "./memory.ts";
import type { ObjectSheet } from "./objects";
import type { PlaceSheet } from "./places";
import { parseScene } from "./plot.ts";
import type { StyleSkill } from "./style";
import { worldAt } from "./world.ts";

/** Named sections of a scene context, in prompt order. */
export const CONTEXT_SECTIONS = ["skills", "fichas", "mundo", "conocimiento", "resumenes", "trama", "escena"] as const;

export type ContextSectionName = (typeof CONTEXT_SECTIONS)[number];

/** When the budget is short, sections are filled in this order; the rest are cut or dropped. */
const PRIORITY: ContextSectionName[] = ["escena", "skills", "fichas", "conocimiento", "mundo", "trama", "resumenes"];

/** Sections whose newest text is at the end: cut from the start. */
const KEEP_TAIL = new Set<ContextSectionName>(["escena", "resumenes"]);

export interface ChapterSummary {
	capitulo: number;
	texto: string;
}

export interface SceneContextInput {
	capitulo: number;
	/** Scene note: frontmatter (`pov`, `subtrama`) and text. */
	escena: string;
	skills: StyleSkill[];
	personajes: CharacterSheet[];
	objetos: ObjectSheet[];
	lugares: PlaceSheet[];
	memorias: ChapterMemory[];
	resumenes: ChapterSummary[];
	/** Active plot note text, or "". */
	trama: string;
	/** Maximum characters across all section texts. */
	presupuesto: number;
}

export interface ContextSection {
	nombre: ContextSectionName;
	texto: string;
}

export interface SceneContext {
	secciones: ContextSection[];
	total: number;
	/** Sections cut or dropped to fit the budget. */
	recortadas: ContextSectionName[];
}

/** Context for one scene task: only what the scene needs, within `presupuesto` characters. */
export function buildSceneContext(input: SceneContextInput): SceneContext {
	const scene = parseScene(input.escena);
	const text = sceneText(input.escena);
	const pov = key(scene.pov);
	const present = input.personajes.filter(
		(sheet) => (pov.length > 0 && key(sheet.nombre) === pov) || mentions(text, [sheet.nombre, ...sheet.alias]),
	);
	const presentNames = new Set(present.map((sheet) => key(sheet.nombre)));
	const objects = input.objetos.filter((sheet) => mentions(text, [sheet.nombre]));
	const places = input.lugares.filter((sheet) => mentions(text, [sheet.nombre]));

	const skills = input.skills.filter((skill) => {
		const targets = skill.aplica_a.map(key);
		switch (skill.alcance) {
			case "global":
				return true;
			case "POV":
				return pov.length > 0 && targets.includes(pov);
			case "personaje":
				return targets.some((target) => presentNames.has(target));
			case "capítulo":
				return skill.aplica_a.some((target) => chapterNumber(target) === input.capitulo);
			default:
				return false;
		}
	});

	const world = worldAt({ personajes: present, objetos: objects, lugares: places }, input.capitulo);
	const knowledge = [...present.map((sheet) => sheet.nombre), READER].flatMap((who) =>
		whatKnows(input.memorias, who, input.capitulo).map((fact) => `- ${who} · ${fact.estado} · ${fact.texto}`),
	);

	const raw: Record<ContextSectionName, string[]> = {
		skills: skills.map((skill) => `- [${skill.severidad}] ${skill.nombre} (${skill.alcance})`),
		fichas: [
			...present.map((sheet) => `- Personaje: ${sheet.nombre}${sheet.alias.length > 0 ? ` (alias: ${sheet.alias.join(", ")})` : ""}`),
			...objects.map((sheet) => `- Objeto: ${sheet.nombre}${sheet.funcion ? ` · ${sheet.funcion}` : ""}`),
			...places.map((sheet) => `- Lugar: ${sheet.nombre}${sheet.padre ? ` · en ${linkTarget(sheet.padre)}` : ""}`),
		],
		mundo: [
			...world.relaciones.map((r) => `- ${r.personaje} → ${linkTarget(r.con)}: ${r.tipo}`),
			...world.posesiones.map((p) => `- ${p.objeto}: ${linkTarget(p.poseedor)}`),
			...world.lugares.map((l) => `- ${l.lugar}: ${l.estado}`),
		],
		conocimiento: knowledge,
		resumenes: input.resumenes
			.filter((summary) => summary.capitulo < input.capitulo && summary.texto.trim().length > 0)
			.sort((a, b) => a.capitulo - b.capitulo)
			.map((summary) => `- ${memoryNoteName(summary.capitulo)}: ${summary.texto.trim()}`),
		trama: [
			...(scene.subtrama ? [`Subtrama activa: ${scene.subtrama}`] : []),
			...(input.trama.trim() ? [input.trama.trim()] : []),
		],
		escena: text ? [text] : [],
	};

	const fitted = new Map<ContextSectionName, string>();
	const recortadas: ContextSectionName[] = [];
	let left = Math.max(0, Math.floor(input.presupuesto));
	for (const name of PRIORITY) {
		const full = raw[name].join("\n");
		if (full.length === 0) {
			continue;
		}
		if (full.length <= left) {
			fitted.set(name, full);
			left -= full.length;
			continue;
		}
		recortadas.push(name);
		if (left > 1) {
			fitted.set(name, KEEP_TAIL.has(name) ? `…${full.slice(full.length - left + 1)}` : `${full.slice(0, left - 1)}…`);
			left = 0;
		}
	}

	const secciones = CONTEXT_SECTIONS.flatMap((nombre) => {
		const texto = fitted.get(nombre);
		return texto === undefined ? [] : [{ nombre, texto }];
	});
	return {
		secciones,
		total: secciones.reduce((sum, section) => sum + section.texto.length, 0),
		recortadas: CONTEXT_SECTIONS.filter((name) => recortadas.includes(name)),
	};
}

function sceneText(note: string): string {
	const text = note.replace(/\r\n/g, "\n");
	if (text.startsWith("---\n")) {
		const end = text.indexOf("\n---", 3);
		if (end !== -1) {
			const after = text.indexOf("\n", end + 1);
			return after === -1 ? "" : text.slice(after + 1).trim();
		}
	}
	return text.trim();
}

function key(name: string): string {
	return linkTarget(name).toLowerCase();
}
