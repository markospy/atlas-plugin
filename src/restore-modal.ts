import { type App, FuzzySuggestModal } from "obsidian";

import type { BackupVersion } from "./backup";

/** Pick one backup of the note, newest first. */
export class RestoreModal extends FuzzySuggestModal<BackupVersion> {
	constructor(
		app: App,
		private readonly versions: BackupVersion[],
		private readonly choose: (version: BackupVersion) => void,
	) {
		super(app);
		this.setPlaceholder("Elige la versión a restaurar");
	}

	getItems(): BackupVersion[] {
		return this.versions;
	}

	getItemText(version: BackupVersion): string {
		return version.fecha.toLocaleString();
	}

	onChooseItem(version: BackupVersion): void {
		this.choose(version);
	}
}
