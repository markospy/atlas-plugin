/** YAML frontmatter between the opening `---` and the next `---` line, with CRLF read as LF. */
export function frontmatterBody(note: string): string {
	const text = note.replace(/\r\n/g, "\n");
	if (!text.startsWith("---\n")) {
		return "";
	}
	const end = text.indexOf("\n---", 3);
	return end === -1 ? "" : text.slice(4, end);
}

/** Value of a top-level `key: value` line, unquoted; "" when missing. */
export function scalar(frontmatter: string, key: string): string {
	const match = new RegExp(`^${key}:[ \\t]*(.*)$`, "m").exec(frontmatter);
	return match ? unquote(match[1] ?? "") : "";
}

/**
 * Items of a top-level list: inline `key: [a, "b, c"]` (commas inside quotes kept),
 * block `key:` + `  - a` lines as Obsidian Properties writes them, or a lone scalar.
 */
export function list(frontmatter: string, key: string): string[] {
	const lines = frontmatter.split("\n");
	const at = lines.findIndex((line) => line.startsWith(`${key}:`));
	if (at === -1) {
		return [];
	}
	const value = (lines[at] ?? "").slice(key.length + 1).trim();
	if (value.startsWith("[") && value.endsWith("]")) {
		return splitOutsideQuotes(value.slice(1, -1)).map(unquote).filter((item) => item.length > 0);
	}
	if (value.length > 0) {
		return [unquote(value)];
	}
	const items: string[] = [];
	for (const line of lines.slice(at + 1)) {
		const item = /^\s+-\s*(.*)$/.exec(line);
		if (!item) {
			break;
		}
		const text = unquote(item[1] ?? "");
		if (text.length > 0) {
			items.push(text);
		}
	}
	return items;
}

function splitOutsideQuotes(inner: string): string[] {
	const parts: string[] = [];
	let current = "";
	let quote = "";
	for (const char of inner) {
		if (quote.length > 0) {
			quote = char === quote ? "" : quote;
		} else if (char === '"' || char === "'") {
			quote = char;
		} else if (char === ",") {
			parts.push(current);
			current = "";
			continue;
		}
		current += char;
	}
	parts.push(current);
	return parts;
}

/** Trimmed value with surrounding double (JSON) or single (YAML) quotes removed. */
export function unquote(value: string): string {
	const trimmed = value.trim();
	if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
		try {
			return JSON.parse(trimmed) as string;
		} catch {
			return trimmed.slice(1, -1);
		}
	}
	if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
		return trimmed.slice(1, -1).replace(/''/g, "'");
	}
	return trimmed;
}
