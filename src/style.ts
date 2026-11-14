export const SCOPES = ["global", "personaje", "POV", "capítulo", "escena"] as const;
export const SEVERITIES = ["sugerencia", "aviso", "obligatoria"] as const;
export const CHECKS = ["patron", "ia"] as const;

export type SkillScope = (typeof SCOPES)[number];
export type SkillSeverity = (typeof SEVERITIES)[number];
export type SkillCheck = (typeof CHECKS)[number];

export interface StyleSkill {
	nombre: string;
	alcance: SkillScope;
	aplica_a: string[];
	severidad: SkillSeverity;
	verificacion: SkillCheck;
	patron?: string;
}

export function skillFolder(activePath: string): string {
	const marker = "/Estilo/";
	const at = activePath.indexOf(marker);
	if (at !== -1) {
		return activePath.slice(0, at + "/Estilo".length);
	}
	if (activePath === "Estilo" || activePath.startsWith("Estilo/")) {
		return "Estilo";
	}
	const parent = parentOf(activePath);
	if (parent === "Manuscrito" || parent.endsWith("/Manuscrito")) {
		const project = parentOf(parent);
		return project.length > 0 ? `${project}/Estilo` : "Estilo";
	}
	return parent.length > 0 ? `${parent}/Estilo` : "Estilo";
}

export function skillNote(name: string): string {
	return [
		"---",
		"tipo: skill",
		`nombre: ${JSON.stringify(name)}`,
		"alcance: global",
		"aplica_a: []",
		"severidad: aviso",
		"verificacion: ia",
		'patron: ""',
		"---",
		"",
		"## Regla",
		"",
		"## Ejemplo mal",
		"",
		"## Ejemplo bien",
		"",
	].join("\n");
}

export function parseSkill(note: string): StyleSkill {
	const frontmatter = frontmatterBody(note);
	const skill: StyleSkill = {
		nombre: scalar(frontmatter, "nombre"),
		alcance: oneOf(SCOPES, scalar(frontmatter, "alcance"), "global"),
		aplica_a: inlineList(frontmatter, "aplica_a"),
		severidad: oneOf(SEVERITIES, scalar(frontmatter, "severidad"), "aviso"),
		verificacion: oneOf(CHECKS, scalar(frontmatter, "verificacion"), "ia"),
	};
	if (skill.verificacion === "patron") {
		skill.patron = scalar(frontmatter, "patron");
	}
	return skill;
}

export function skillsFor(skills: StyleSkill[], scope: SkillScope, target?: string): StyleSkill[] {
	return skills.filter(
		(skill) => skill.alcance === scope && (target === undefined || skill.aplica_a.includes(target)),
	);
}

function oneOf<T extends string>(allowed: readonly T[], value: string, fallback: T): T {
	return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function parentOf(path: string): string {
	const slash = path.lastIndexOf("/");
	return slash === -1 ? "" : path.slice(0, slash);
}

function frontmatterBody(note: string): string {
	if (!note.startsWith("---\n")) {
		return "";
	}
	const end = note.indexOf("\n---", 3);
	return end === -1 ? "" : note.slice(4, end);
}

function scalar(frontmatter: string, key: string): string {
	const match = new RegExp(`^${key}:\\s*(.*)$`, "m").exec(frontmatter);
	if (!match) {
		return "";
	}
	return unquote(match[1] ?? "");
}

function unquote(value: string): string {
	const trimmed = value.trim();
	if (trimmed.startsWith('"')) {
		const end = /^"(?:[^"\\]|\\.)*"/.exec(trimmed);
		if (end) {
			try {
				return JSON.parse(end[0]) as string;
			} catch {
				return end[0].slice(1, -1);
			}
		}
	}
	if (trimmed.startsWith("'")) {
		const end = /^'((?:[^']|'')*)'/.exec(trimmed);
		if (end) {
			return (end[1] ?? "").replace(/''/g, "'");
		}
	}
	return trimmed.replace(/\s+#.*$/, "");
}

function inlineList(frontmatter: string, key: string): string[] {
	const match = new RegExp(`^${key}:\\s*\\[(.*)\\]`, "m").exec(frontmatter);
	const inner = match?.[1] ?? "";
	if (inner.trim().length === 0) {
		return [];
	}
	return inner.split(",").map((item) => unquote(item));
}
