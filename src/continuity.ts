import { type ChapterMemory, READER, whatKnows } from "./memory.ts";

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
			if (known !== "sabe") {
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

function states(memories: ChapterMemory[], who: string, chapter: number): Map<string, string> {
	return new Map(whatKnows(memories, who, chapter).map((fact) => [fact.hecho, fact.estado]));
}

function pair(fact: string, who: string): string {
	return `${fact}|${who.replace(/^\[\[|\]\]$/g, "").trim().toLowerCase()}`;
}
