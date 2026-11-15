import { buildSceneContext, type SceneContext, type SceneContextInput } from "./context.ts";
import { noteBody } from "./frontmatter.ts";

export const COWRITE_MODES = ["borrador", "alternativa", "continuacion"] as const;

export type CoWriteMode = (typeof COWRITE_MODES)[number];

const INSTRUCTIONS: Record<CoWriteMode, string> = {
	borrador: "Escribe un borrador nuevo de la escena. Devuelve solo el texto de la escena.",
	alternativa: "Reescribe la escena con otra versión. Devuelve solo el texto de la escena.",
	continuacion: "Continúa la escena desde donde termina. Devuelve solo el texto nuevo.",
};

/** Text model behind co-writing: one prompt in, one text out. */
export interface CoWriteProvider {
	complete(prompt: string): Promise<string>;
}

export interface DiffLine {
	tipo: "igual" | "quitar" | "añadir";
	texto: string;
}

export interface Proposal {
	modo: CoWriteMode;
	/** Note text when the proposal was made. */
	actual: string;
	/** Note text if the writer approves. */
	propuesta: string;
	diff: DiffLine[];
}

export interface HistoryEntry {
	modo: CoWriteMode;
	decision: "aprobada" | "rechazada";
	antes: string;
	despues: string;
	fecha: Date;
}

/** Line diff (longest common subsequence) from `before` to `after`. */
export function diffLines(before: string, after: string): DiffLine[] {
	const a = before.replace(/\r\n/g, "\n").split("\n");
	const b = after.replace(/\r\n/g, "\n").split("\n");
	// lcs(i, j) = length of the longest common subsequence of a[i..] and b[j..].
	const width = b.length + 1;
	const common = new Int32Array((a.length + 1) * width);
	const lcs = (i: number, j: number): number => common[i * width + j] ?? 0;
	for (let i = a.length - 1; i >= 0; i--) {
		for (let j = b.length - 1; j >= 0; j--) {
			common[i * width + j] = a[i] === b[j] ? lcs(i + 1, j + 1) + 1 : Math.max(lcs(i + 1, j), lcs(i, j + 1));
		}
	}
	const diff: DiffLine[] = [];
	let i = 0;
	let j = 0;
	while (i < a.length || j < b.length) {
		const left = a[i];
		const right = b[j];
		if (left !== undefined && left === right) {
			diff.push({ tipo: "igual", texto: left });
			i++;
			j++;
		} else if (right !== undefined && (left === undefined || lcs(i, j + 1) > lcs(i + 1, j))) {
			diff.push({ tipo: "añadir", texto: right });
			j++;
		} else {
			diff.push({ tipo: "quitar", texto: left ?? "" });
			i++;
		}
	}
	return diff;
}

/**
 * Scene context for a co-write prompt. The prompt carries the whole note apart, so
 * `presupuesto` covers skills, sheets, knowledge and world, not the scene text.
 */
export function coWriteContext(input: SceneContextInput): SceneContext {
	return buildSceneContext({ ...input, presupuesto: input.presupuesto + noteBody(input.escena).length });
}

/** Ask the provider for a proposal. The note is never written here. */
export async function propose(
	provider: CoWriteProvider,
	modo: CoWriteMode,
	actual: string,
	contexto: SceneContext,
): Promise<Proposal> {
	const reply = (await provider.complete(prompt(modo, actual, contexto))).trim();
	if (reply.length === 0) {
		throw new Error("El proveedor devolvió una respuesta vacía.");
	}
	// Keep the note's line endings: the diff ignores them, so a silent switch would go unseen.
	const eol = actual.includes("\r\n") ? "\r\n" : "\n";
	const text = reply.replace(/\r?\n/g, eol);
	const propuesta = modo === "continuacion" ? `${actual.trimEnd()}${eol}${eol}${text}` : `${frontmatter(actual, eol)}${text}`;
	return { modo, actual, propuesta, diff: diffLines(actual, propuesta) };
}

/** Decisions on proposals during one plugin session; nothing is stored on disk. */
export class CoWriteSession {
	readonly historial: HistoryEntry[] = [];

	/** Note text to keep: the current one, unchanged. */
	rechazar(proposal: Proposal): string {
		this.record(proposal, "rechazada", proposal.actual);
		return proposal.actual;
	}

	/** Note text to write. Fails when the note changed after the proposal was made. */
	aprobar(proposal: Proposal, notaAhora: string): string {
		if (notaAhora !== proposal.actual) {
			throw new Error("La nota cambió desde la propuesta. Pide una nueva.");
		}
		this.record(proposal, "aprobada", proposal.propuesta);
		return proposal.propuesta;
	}

	private record(proposal: Proposal, decision: HistoryEntry["decision"], despues: string): void {
		this.historial.push({ modo: proposal.modo, decision, antes: proposal.actual, despues, fecha: new Date() });
	}
}

function prompt(modo: CoWriteMode, actual: string, contexto: SceneContext): string {
	const sections = contexto.secciones.filter((section) => section.nombre !== "escena");
	return [
		INSTRUCTIONS[modo],
		"Respeta la voz del texto y las skills de estilo.",
		...sections.map((section) => `## ${section.nombre}\n${section.texto}`),
		`## escena\n${noteBody(actual)}`,
	].join("\n\n");
}

/** Frontmatter block with its closing line, as `noteBody` detects it; "" when there is none. */
function frontmatter(note: string, eol: string): string {
	const lines = note.replace(/\r\n/g, "\n").split("\n");
	if (lines[0] !== "---" || !/^[\p{L}\w-]+:(\s|$)/u.test(lines[1] ?? "")) {
		return "";
	}
	const end = lines.indexOf("---", 1);
	return end === -1 ? "" : `${lines.slice(0, end + 1).join(eol)}${eol}`;
}
