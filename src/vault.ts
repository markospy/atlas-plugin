export const PROJECT_FOLDERS = [
	"Manuscrito",
	"Personajes",
	"Lugares",
	"Objetos",
	"Trama",
	"Estilo",
	"_Memoria",
] as const;

export interface AtlasFiles {
	exists(path: string): Promise<boolean>;
	createFolder(path: string): Promise<void>;
	read(path: string): Promise<string>;
	write(path: string, data: string): Promise<void>;
}

export function parentPath(notePath: string): string {
	const slash = notePath.lastIndexOf("/");
	return slash === -1 ? "" : notePath.slice(0, slash);
}

export function noteTitle(notePath: string): string {
	const base = notePath.slice(notePath.lastIndexOf("/") + 1);
	return base.replace(/\.md$/i, "");
}

export function childPath(parent: string, name: string): string {
	return parent.length > 0 ? `${parent}/${name}` : name;
}

export function indexFrontmatter(title: string): string {
	return [
		"---",
		"longform:",
		"  format: scenes",
		`  title: ${JSON.stringify(title)}`,
		"  sceneFolder: Manuscrito",
		"  scenes: []",
		"atlas:",
		"  version: 1",
		"---",
		"",
	].join("\n");
}

function hasTopKey(frontmatter: string, key: string): boolean {
	return new RegExp(`^${key}:`, "m").test(frontmatter);
}

export function withProjectFrontmatter(existing: string, title: string): string {
	const fresh = indexFrontmatter(title);
	if (!existing.startsWith("---\n")) {
		return `${fresh}${existing}`;
	}
	const end = existing.indexOf("\n---", 3);
	if (end === -1) {
		return `${fresh}${existing}`;
	}
	const frontmatter = existing.slice(4, end);
	const rest = existing.slice(end + 4);
	if (hasTopKey(frontmatter, "longform") && hasTopKey(frontmatter, "atlas")) {
		return existing;
	}
	const longform = hasTopKey(frontmatter, "longform")
		? ""
		: `longform:\n  format: scenes\n  title: ${JSON.stringify(title)}\n  sceneFolder: Manuscrito\n  scenes: []\n`;
	const atlas = hasTopKey(frontmatter, "atlas") ? "" : "atlas:\n  version: 1\n";
	const body = rest.startsWith("\n") ? rest.slice(1) : rest;
	return `---\n${frontmatter.trimEnd()}\n${longform}${atlas}---\n${body}`;
}

export async function createAtlasProject(files: AtlasFiles, indexPath: string): Promise<void> {
	const parent = parentPath(indexPath);
	for (const folder of PROJECT_FOLDERS) {
		const path = childPath(parent, folder);
		if (!(await files.exists(path))) {
			await files.createFolder(path);
		}
	}
	const title = noteTitle(indexPath);
	const current = (await files.exists(indexPath)) ? await files.read(indexPath) : "";
	const next = current.length > 0 ? withProjectFrontmatter(current, title) : indexFrontmatter(title);
	if (next !== current) {
		await files.write(indexPath, next);
	}
}
