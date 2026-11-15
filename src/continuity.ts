import { type ChapterMemory, holderKey, READER, whatKnows } from "./memory.ts";

export type AlertKind = "spoiler" | "omnisciente" | "ironia";

export interface ContinuityAlert {
	tipo: AlertKind;
	hecho: string;
	quien: string;
	error: boolean;
	mensaje: string;
}

export function checkContinuity(memories: ChapterMemory[], chapter: number): ContinuityAlert[] {
	const here = memories.filter((memory) => memory.capitulo === chapter);
	const reader = states(memories, READER, chapter);
	const alerts: ContinuityAlert[] = [];
	const flagged = new Set<string>();
	for (const use of here.flatMap((memory) => memory.usos)) {
		const fact = use.hecho;
		if (use.modo === "menciona") {
			const known = reader.get(fact) ?? "ignora";
			if (known === "ignora") {
				alerts.push({
					tipo: "spoiler",
					hecho: fact,
					quien: use.quien,
					error: true,
					mensaje: `Posible spoiler: ${use.quien} menciona «${fact}», que el lector aún ignora.`,
				});
			}
		} else if (use.modo === "actua") {
			const known = states(memories, use.quien, chapter).get(fact);
			if (known !== "sabe" && known !== "cree-falso") {
				flagged.add(pair(fact, use.quien));
				alerts.push({
					tipo: "omnisciente",
					hecho: fact,
					quien: use.quien,
					error: true,
					mensaje: `Personaje omnisciente: ${use.quien} actúa según «${fact}» (estado: ${known ?? "sin registrar"}).`,
				});
			}
		}
	}
	const named = new Set(
		here.flatMap((memory) => [...memory.conocimiento, ...memory.usos].map((entry) => entry.quien)),
	);
	for (const who of named) {
		if (who.trim().toLowerCase() === READER) {
			continue;
		}
		for (const [fact, known] of states(memories, who, chapter)) {
			if (known !== "sabe" && reader.get(fact) === "sabe" && !flagged.has(pair(fact, who))) {
				flagged.add(pair(fact, who));
				alerts.push({
					tipo: "ironia",
					hecho: fact,
					quien: who,
					error: false,
					mensaje: `Ironía dramática (intencional): el lector sabe «${fact}» y ${who} no (${known}).`,
				});
			}
		}
	}
	return alerts;
}

const MODES = ["menciona", "actua"];

export function usageErrors(memories: ChapterMemory[], chapter: number): string[] {
	const here = memories.filter((memory) => memory.capitulo === chapter);
	const declared = new Set(
		memories.filter((memory) => memory.capitulo <= chapter).flatMap((memory) => memory.hechos.map((fact) => fact.id)),
	);
	const modes = here
		.flatMap((memory) => memory.usos)
		.filter((use) => !MODES.includes(use.modo))
		.map((use) => `Modo «${use.modo}» no válido para ${use.hecho || "un hecho"}: usa menciona o actua.`);
	const undeclared = new Set(
		here
			.flatMap((memory) => [...memory.conocimiento, ...memory.usos])
			.map((entry) => entry.hecho)
			.filter((fact) => fact && !declared.has(fact)),
	);
	return [...modes, ...[...undeclared].map((fact) => `Hecho «${fact}» sin declarar en hechos hasta el cap. ${chapter}.`)];
}

function states(memories: ChapterMemory[], who: string, chapter: number): Map<string, string> {
	return new Map(whatKnows(memories, who, chapter).map((fact) => [fact.hecho, fact.estado]));
}

function pair(fact: string, who: string): string {
	return `${fact}|${holderKey(who)}`;
}
