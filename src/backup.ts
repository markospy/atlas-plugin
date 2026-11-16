/** Hidden vault folder for note backups: Obsidian does not index it, search and the graph skip it. */
export const BACKUP_ROOT = ".atlas/respaldos";

/** Per note: keep the newest `maxVersiones`, drop the ones older than `maxDias`, never the newest one. */
export const RETENTION = { maxVersiones: 10, maxDias: 7 } as const;

const DAY_MS = 24 * 60 * 60 * 1000;
/** `2026-11-15T10-30-00.000Z.md`: an ISO date with `-` for `:`, which some file systems refuse. */
const STAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2}\.\d{3}Z)\.md$/;

/** Raw file access (Obsidian's `vault.adapter`), so backups stay out of the vault index. */
export interface BackupFiles {
	exists(path: string): Promise<boolean>;
	mkdir(path: string): Promise<void>;
	read(path: string): Promise<string>;
	write(path: string, data: string): Promise<void>;
	/** File paths directly inside `folder`. */
	list(folder: string): Promise<string[]>;
	remove(path: string): Promise<void>;
}

export interface BackupVersion {
	path: string;
	fecha: Date;
}

export function backupFolder(notePath: string): string {
	return `${BACKUP_ROOT}/${notePath.replace(/\.md$/i, "")}`;
}

/** Save `text` as a new version of the note, then apply the retention policy. Returns the backup path. */
export async function backup(files: BackupFiles, notePath: string, text: string, now = new Date()): Promise<string> {
	const folder = backupFolder(notePath);
	await mkdirs(files, folder);
	let stamp = now.getTime();
	let path = versionPath(folder, stamp);
	while (await files.exists(path)) {
		path = versionPath(folder, ++stamp);
	}
	await files.write(path, text);
	await prune(files, notePath, now);
	return path;
}

/** Backups of the note, newest first. */
export async function listBackups(files: BackupFiles, notePath: string): Promise<BackupVersion[]> {
	const folder = backupFolder(notePath);
	if (!(await files.exists(folder))) {
		return [];
	}
	const versions: BackupVersion[] = [];
	for (const path of await files.list(folder)) {
		const match = STAMP.exec(path.slice(folder.length + 1));
		if (match) {
			versions.push({ path, fecha: new Date(`${match[1]}T${match[2]}:${match[3]}:${match[4]}`) });
		}
	}
	return versions.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
}

/** Text of the chosen version. The current text is backed up first, so a restore can be undone too. */
export async function restore(
	files: BackupFiles,
	notePath: string,
	backupPath: string,
	actual: string,
	now = new Date(),
): Promise<string> {
	if (!(await listBackups(files, notePath)).some((version) => version.path === backupPath)) {
		throw new Error("Ese archivo no es un respaldo de esta nota.");
	}
	const text = await files.read(backupPath);
	await backup(files, notePath, actual, now);
	return text;
}

async function prune(files: BackupFiles, notePath: string, now: Date): Promise<void> {
	const oldest = now.getTime() - RETENTION.maxDias * DAY_MS;
	const versions = await listBackups(files, notePath);
	for (const [index, version] of versions.entries()) {
		if (index > 0 && (index >= RETENTION.maxVersiones || version.fecha.getTime() < oldest)) {
			await files.remove(version.path);
		}
	}
}

async function mkdirs(files: BackupFiles, folder: string): Promise<void> {
	let path = "";
	for (const part of folder.split("/")) {
		path = path ? `${path}/${part}` : part;
		if (!(await files.exists(path))) {
			await files.mkdir(path);
		}
	}
}

function versionPath(folder: string, time: number): string {
	return `${folder}/${new Date(time).toISOString().replace(/:/g, "-")}.md`;
}
