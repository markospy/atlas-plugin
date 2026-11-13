export type MarkerKind = "tk" | "investigar";

export interface TextMarker {
	kind: MarkerKind;
	line: number;
	label: string;
}

const MARKER = /\[(?:TK|INVESTIGAR:\s*([^\]]*))\]/g;

export function parseMarkers(text: string): TextMarker[] {
	const found: TextMarker[] = [];
	const lines = text.split("\n");
	for (let index = 0; index < lines.length; index++) {
		const line = lines[index] ?? "";
		MARKER.lastIndex = 0;
		let match = MARKER.exec(line);
		while (match) {
			const raw = match[0];
			found.push({
				kind: raw.startsWith("[TK]") ? "tk" : "investigar",
				line: index + 1,
				label: raw.startsWith("[TK]") ? "TK" : (match[1] ?? "").trim(),
			});
			match = MARKER.exec(line);
		}
	}
	return found;
}

export function insertMarker(text: string, offset: number, kind: MarkerKind): string {
	const token = kind === "tk" ? "[TK]" : "[INVESTIGAR: ]";
	const at = Math.min(Math.max(offset, 0), text.length);
	return `${text.slice(0, at)}${token}${text.slice(at)}`;
}

export function collectMarkers(notes: { path: string; text: string }[]): { path: string; marker: TextMarker }[] {
	const listed: { path: string; marker: TextMarker }[] = [];
	for (const note of notes) {
		for (const marker of parseMarkers(note.text)) {
			listed.push({ path: note.path, marker });
		}
	}
	return listed;
}
