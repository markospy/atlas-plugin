import { noteBody } from "./frontmatter.ts";

/** One day of one project: manuscript words when the day started and the last count seen. */
export interface WritingDay {
	inicio: number;
	total: number;
}

/** Writing log of one project, by local date `YYYY-MM-DD`. Stored only in the plugin's data.json. */
export type WritingLog = Record<string, WritingDay>;

export interface DayProgress {
	total: number;
	hoy: number;
	meta: number;
	/** 0–100; 0 when there is no goal. */
	porcentaje: number;
	racha: number;
}

// A Han, kana or Hangul character is one word; any other run of letters and digits is one word,
// joined across inner apostrophes and hyphens ("l'amour", "hispano-árabe").
const WORD = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

/** Words in a note's body, frontmatter left out. */
export function countWords(note: string): number {
	return noteBody(note).match(WORD)?.length ?? 0;
}

/** True when `path` is a scene under the project's `Manuscrito/` folder. */
export function inManuscript(root: string, path: string): boolean {
	const folder = root.length > 0 ? `${root}/Manuscrito/` : "Manuscrito/";
	return path.startsWith(folder) && path.toLowerCase().endsWith(".md");
}

/** Total words of the project's manuscript. */
export function manuscriptWords(root: string, notes: { path: string; text: string }[]): number {
	return notes.filter((note) => inManuscript(root, note.path)).reduce((sum, note) => sum + countWords(note.text), 0);
}

/** Local calendar date `YYYY-MM-DD`. */
export function dayKey(date: Date): string {
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function previousDay(day: string): string {
	const [year, month, date] = day.split("-").map(Number);
	return dayKey(new Date(year ?? 0, (month ?? 1) - 1, (date ?? 1) - 1));
}

/**
 * Log with today's count. The first count of a day starts from the last total of an earlier day,
 * so words written before that count still count; on the first day ever it starts from `total`.
 */
export function recordTotal(log: WritingLog, day: string, total: number): WritingLog {
	const current = log[day];
	if (current) {
		return { ...log, [day]: { inicio: current.inicio, total } };
	}
	const earlier = Object.keys(log)
		.filter((key) => key < day)
		.sort()
		.pop();
	const inicio = earlier ? (log[earlier]?.total ?? total) : total;
	return { ...log, [day]: { inicio, total } };
}

/** Net words added on `day`, never below 0. */
export function wordsOn(log: WritingLog, day: string): number {
	const entry = log[day];
	return entry ? Math.max(0, entry.total - entry.inicio) : 0;
}

/** Consecutive days with words added, ending today, or yesterday when today has none yet. */
export function streak(log: WritingLog, today: string): number {
	let day = wordsOn(log, today) > 0 ? today : previousDay(today);
	let days = 0;
	while (wordsOn(log, day) > 0) {
		days++;
		day = previousDay(day);
	}
	return days;
}

export function progress(log: WritingLog, today: string, meta: number): DayProgress {
	const hoy = wordsOn(log, today);
	const goal = Math.max(0, Math.floor(meta));
	return {
		total: log[today]?.total ?? 0,
		hoy,
		meta: goal,
		porcentaje: goal > 0 ? Math.min(100, Math.round((hoy / goal) * 100)) : 0,
		racha: streak(log, today),
	};
}

export function progressNotice(found: DayProgress): string {
	const dias = found.racha === 1 ? "día" : "días";
	const meta = found.meta > 0 ? `Hoy: ${found.hoy} / ${found.meta} (${found.porcentaje} %)` : `Hoy: ${found.hoy} (sin meta diaria)`;
	return `Manuscrito: ${found.total} palabras\n${meta}\nRacha: ${found.racha} ${dias}`;
}
