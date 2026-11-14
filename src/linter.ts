import type { SkillSeverity, StyleSkill } from "./style";

export interface LintMatch {
	index: number;
	text: string;
}

export interface LintRule {
	id: string;
	message: string;
	severidad: SkillSeverity;
	find(line: string, previous: string): LintMatch[];
}

export interface LintFinding {
	rule: string;
	line: number;
	column: number;
	match: string;
	message: string;
	severidad: SkillSeverity;
}

const IGNORE = /%%\s*atlas-ignorar:\s*([^%]*)%%/g;
const SCENE_BREAK = /^\s*([-*_])(\s*\1){2,}\s*$/;
const NOT_GERUNDS = new Set(["cuando", "mando", "bando", "blando", "comando", "nefando", "fernando", "orlando", "rolando"]);
const NOT_ADVERBS = new Set(["mente", "demente", "clemente", "inclemente", "vehemente"]);
const DEQUEISMO =
	/(?<![\p{L}])(pienso|piensa|pensaba|pensé|pensó|creo|cree|creía|creí|creyó|opino|opina|supongo|supone|imagino|imagina|considero|considera|digo|dije|dijo|dijeron)\s+de\s+que(?![\p{L}])/giu;

function all(regex: RegExp, line: string): LintMatch[] {
	const found: LintMatch[] = [];
	regex.lastIndex = 0;
	let match = regex.exec(line);
	while (match) {
		found.push({ index: match.index, text: match[0] });
		if (match[0].length === 0) {
			regex.lastIndex++;
		}
		match = regex.exec(line);
	}
	return found;
}

function words(segment: string, offset: number): LintMatch[] {
	return all(/\p{L}+/gu, segment).map((word) => ({ index: word.index + offset, text: word.text }));
}

export const BASE_RULES: LintRule[] = [
	{
		id: "raya-dialogo",
		message: "Diálogo: abre con raya (—) pegada al texto, sin guion ni espacio.",
		severidad: "aviso",
		find: (line) => (SCENE_BREAK.test(line) ? [] : all(/^\s*(?:[-–]\s*|—\s+)(?=\S)/gu, line)),
	},
	{
		id: "gerundios-encadenados",
		message: "Tres o más gerundios en la misma frase.",
		severidad: "aviso",
		find: (line) => {
			const found: LintMatch[] = [];
			for (const sentence of all(/[^.!?…]+/gu, line)) {
				const gerunds = words(sentence.text, sentence.index).filter((word) => {
					const lower = word.text.toLowerCase();
					return /(?:ando|iendo|yendo)$/.test(lower) && lower.length > 4 && !NOT_GERUNDS.has(lower);
				});
				if (gerunds.length >= 3 && gerunds[0]) {
					found.push(gerunds[0]);
				}
			}
			return found;
		},
	},
	{
		id: "dijo-repetido",
		message: "«dijo» repetido: varía la acotación o quítala.",
		severidad: "aviso",
		find: (line, previous) => {
			const said = all(/(?<!\p{L})dijo(?!\p{L})/giu, line);
			return all(/(?<!\p{L})dijo(?!\p{L})/giu, previous).length > 0 ? said : said.slice(1);
		},
	},
	{
		id: "mente-acotacion",
		message: "Adverbio en -mente en la acotación: muestra el tono en vez de nombrarlo.",
		severidad: "aviso",
		find: (line) => {
			const opening = line.search(/\S/);
			if (opening === -1 || line[opening] !== "—") {
				return [];
			}
			const start = line.indexOf("—", opening + 1);
			if (start === -1) {
				return [];
			}
			const end = line.indexOf("—", start + 1);
			const tag = line.slice(start + 1, end === -1 ? undefined : end);
			return words(tag, start + 1).filter((word) => {
				const lower = word.text.toLowerCase();
				return lower.endsWith("mente") && !NOT_ADVERBS.has(lower);
			});
		},
	},
	{
		id: "dequeismo",
		message: "Posible dequeísmo: «de que» tras verbo de pensar o decir.",
		severidad: "aviso",
		find: (line) => all(DEQUEISMO, line),
	},
];

export function patternRules(skills: StyleSkill[]): LintRule[] {
	const rules: LintRule[] = [];
	for (const skill of skills) {
		if (skill.verificacion !== "patron" || !skill.patron) {
			continue;
		}
		let regex: RegExp;
		try {
			regex = new RegExp(skill.patron, "gi");
		} catch {
			continue;
		}
		rules.push({
			id: `skill-${skill.nombre.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}`,
			message: skill.nombre,
			severidad: skill.severidad,
			find: (line) => all(regex, line),
		});
	}
	return rules;
}

export function lint(text: string, rules: LintRule[]): LintFinding[] {
	const findings: LintFinding[] = [];
	const lines = text.split("\n");
	let index = frontmatterEnd(lines);
	let previous = "";
	for (; index < lines.length; index++) {
		const raw = lines[index] ?? "";
		const ignored = ignoredRules(raw);
		const line = raw.replace(IGNORE, (comment) => " ".repeat(comment.length));
		for (const rule of rules) {
			if (ignored.has(rule.id)) {
				continue;
			}
			for (const match of rule.find(line, previous)) {
				findings.push({
					rule: rule.id,
					line: index + 1,
					column: match.index + 1,
					match: match.text,
					message: rule.message,
					severidad: rule.severidad,
				});
			}
		}
		if (line.trim().length > 0) {
			previous = line;
		}
	}
	return findings;
}

export function ignoreHere(text: string, finding: LintFinding): string {
	const lines = text.split("\n");
	const line = lines[finding.line - 1];
	if (line === undefined || ignoredRules(line).has(finding.rule)) {
		return text;
	}
	lines[finding.line - 1] = `${line} %% atlas-ignorar: ${finding.rule} %%`;
	return lines.join("\n");
}

function ignoredRules(line: string): Set<string> {
	const ids = new Set<string>();
	for (const comment of line.matchAll(IGNORE)) {
		for (const id of (comment[1] ?? "").split(",")) {
			if (id.trim().length > 0) {
				ids.add(id.trim());
			}
		}
	}
	return ids;
}

function frontmatterEnd(lines: string[]): number {
	if (lines[0] !== "---") {
		return 0;
	}
	const end = lines.indexOf("---", 1);
	return end === -1 ? 0 : end + 1;
}
