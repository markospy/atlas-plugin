/**
 * Folder that holds `folderName` sheets for the note at `activePath`: the enclosing
 * `<folderName>/` when the note is inside one, the project folder next to `Manuscrito/`,
 * else a sibling of the note.
 */
export function sheetFolder(activePath: string, folderName: string): string {
	const marker = `/${folderName}/`;
	const at = activePath.indexOf(marker);
	if (at !== -1) {
		return activePath.slice(0, at + marker.length - 1);
	}
	if (activePath === folderName || activePath.startsWith(`${folderName}/`)) {
		return folderName;
	}
	const parent = parentOf(activePath);
	if (parent === "Manuscrito" || parent.endsWith("/Manuscrito")) {
		const project = parentOf(parent);
		return project.length > 0 ? `${project}/${folderName}` : folderName;
	}
	return parent.length > 0 ? `${parent}/${folderName}` : folderName;
}

/** Whether `path` sits inside the project folder `root` (`""` holds every note). */
export function inProject(root: string, path: string): boolean {
	return root.length === 0 || path.startsWith(`${root}/`);
}

function parentOf(path: string): string {
	const slash = path.lastIndexOf("/");
	return slash === -1 ? "" : path.slice(0, slash);
}
