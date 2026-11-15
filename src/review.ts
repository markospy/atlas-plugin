import { buildSceneContext, type SceneContext, type SceneContextInput } from "./context.ts";
import { noteBody } from "./frontmatter.ts";
import { assertAllowedEndpoint, type ProviderSettings } from "./providers.ts";

/** What a finding is about: a style skill, the state of the world, or who knows what. */
export const FINDING_TYPES = ["estilo", "continuidad", "conocimiento"] as const;

export type FindingType = (typeof FINDING_TYPES)[number];

export interface ReviewFinding {
	tipo: FindingType;
	/** Exact scene text the finding points at. */
	cita: string;
	mensaje: string;
	/** 1-based line and column of `cita` in the scene note, frontmatter included. */
	linea: number;
	columna: number;
}

export type ReviewResult =
	| { ok: true; hallazgos: ReviewFinding[]; descartados: number; escenaRecortada: boolean }
	| { ok: false; mensaje: string };

/** Text model behind the review: one prompt in, one text out (`ollamaProvider` in the plugin). */
export interface ReviewProvider {
	complete(prompt: string): Promise<string>;
}

export const NO_PROVIDER =
	"Revisar con IA necesita un proveedor: en Settings → Atlas escribe el endpoint y el modelo.";

/** Character budget for the scene context sent to the provider. */
const BUDGET = 12_000;

/** Whether endpoint and model are both set. */
export function providerReady(settings: ProviderSettings): boolean {
	return settings.endpoint.trim().length > 0 && settings.model.trim().length > 0;
}

function reviewContext(input: SceneContextInput): SceneContext {
	return buildSceneContext({ ...input, presupuesto: Math.min(input.presupuesto, BUDGET) });
}

/** Prompt that asks for findings as JSON; the model proposes, the writer decides. */
export function reviewPrompt(input: SceneContextInput): string {
	return promptFor(reviewContext(input));
}

function promptFor(context: SceneContext): string {
	const sections = context.secciones.map((section) => `## ${section.nombre}\n${section.texto}`).join("\n\n");
	return [
		"Revisa la escena contra las skills de estilo, la continuidad del mundo y lo que sabe cada personaje.",
		"No reescribas la escena. Devuelve solo JSON: un array de objetos",
		'{"tipo": "estilo" | "continuidad" | "conocimiento", "cita": "<texto exacto de la escena>", "mensaje": "<qué falla>"}.',
		"Si no hay nada que señalar, devuelve [].",
		"",
		sections,
	].join("\n");
}

/** Findings from a model reply; drops the ones with an unknown type or a quote not in the scene. */
export function parseFindings(reply: string, scene: string): { hallazgos: ReviewFinding[]; descartados: number } | null {
	const items = jsonArray(reply);
	if (items === null) {
		return null;
	}
	const text = scene.replace(/\r\n/g, "\n");
	const body = noteBody(scene);
	const bodyStart = body.length === 0 ? text.length : text.lastIndexOf(body);
	const hallazgos: ReviewFinding[] = [];
	for (const item of items) {
		const finding = anchored(item, text, bodyStart, bodyStart + body.length);
		if (finding) {
			hallazgos.push(finding);
		}
	}
	return { hallazgos, descartados: items.length - hallazgos.length };
}

/** Reviews one scene with the configured provider. Never writes: it only returns findings. */
export async function reviewScene(
	input: SceneContextInput,
	settings: ProviderSettings,
	provider: ReviewProvider,
): Promise<ReviewResult> {
	if (!providerReady(settings)) {
		return { ok: false, mensaje: NO_PROVIDER };
	}
	try {
		assertAllowedEndpoint(settings, settings.endpoint);
	} catch (error) {
		return { ok: false, mensaje: error instanceof Error ? error.message : "Host no permitido." };
	}
	const context = reviewContext(input);
	let reply: string;
	try {
		reply = await provider.complete(promptFor(context));
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		return { ok: false, mensaje: `El proveedor no respondió: ${detail}` };
	}
	const parsed = parseFindings(reply, input.escena);
	if (parsed === null) {
		return { ok: false, mensaje: "El proveedor no devolvió hallazgos en JSON. Vuelve a intentarlo." };
	}
	return { ok: true, ...parsed, escenaRecortada: context.recortadas.includes("escena") };
}

/**
 * The findings array in `reply`: a ```json fence first, then each `[`…`]` span. Prose with
 * brackets around it (`Mira [1]: [...]`) is skipped; an array needs an object or no items.
 */
function jsonArray(reply: string): unknown[] | null {
	const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(reply);
	return (fence?.[1] === undefined ? null : firstArray(fence[1])) ?? firstArray(reply);
}

/** Starts that run to the end of the reply unclosed before giving up: a cut reply fails fast. */
const MAX_UNCLOSED = 16;

/**
 * Only a `[` that opens `{`, `null` or `]` can start the findings array, and each is parsed once,
 * up to its matching `]` (brackets inside strings skipped). `[[enlaces]]` are skipped, and after
 * `MAX_UNCLOSED` starts that never close the reply counts as cut, so the scan stays linear.
 */
function firstArray(text: string): unknown[] | null {
	let unclosed = 0;
	for (let start = text.indexOf("["); start !== -1; start = text.indexOf("[", start + 1)) {
		if (!/^\[\s*(?:[{\]]|null\b)/.test(text.slice(start, start + 64))) {
			continue;
		}
		const end = closing(text, start);
		if (end === text.length) {
			unclosed++;
			if (unclosed >= MAX_UNCLOSED) {
				return null;
			}
			continue;
		}
		if (end === -1) {
			continue;
		}
		const value = parsed(text.slice(start, end + 1));
		if (Array.isArray(value) && (value.length === 0 || value.some((item) => typeof item === "object" && item !== null))) {
			return value;
		}
	}
	return null;
}

/**
 * Index of the `]` that closes the `[` at `start`; -1 when a `}` closes it, `text.length` when
 * nothing does. Brackets inside JSON strings do not count.
 */
function closing(text: string, start: number): number {
	let depth = 0;
	let inString = false;
	for (let at = start; at < text.length; at++) {
		const char = text[at];
		if (inString) {
			if (char === "\\") {
				at++;
			} else if (char === '"') {
				inString = false;
			}
		} else if (char === '"') {
			inString = true;
		} else if (char === "[" || char === "{") {
			depth++;
		} else if (char === "]" || char === "}") {
			depth--;
			if (depth === 0) {
				return char === "]" ? at : -1;
			}
		}
	}
	return text.length;
}

function parsed(json: string): unknown {
	try {
		return JSON.parse(json);
	} catch {
		return undefined;
	}
}

/** Anchors `cita` in the scene body; line and column count from the top of the note. */
function anchored(item: unknown, text: string, from: number, to: number): ReviewFinding | null {
	if (typeof item !== "object" || item === null) {
		return null;
	}
	const { tipo, cita, mensaje } = item as Record<string, unknown>;
	if (!(FINDING_TYPES as readonly unknown[]).includes(tipo) || typeof cita !== "string" || typeof mensaje !== "string") {
		return null;
	}
	const quote = cita.trim();
	const at = quote.length === 0 ? -1 : text.indexOf(quote, from);
	if (at === -1 || at + quote.length > to) {
		return null;
	}
	const before = text.slice(0, at);
	const lineStart = before.lastIndexOf("\n") + 1;
	return {
		tipo: tipo as FindingType,
		cita: quote,
		mensaje: mensaje.trim(),
		linea: before.split("\n").length,
		columna: at - lineStart + 1,
	};
}
