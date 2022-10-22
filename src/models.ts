import { ListedFiles, normalizePath, Vault } from "obsidian";
import { basename, dirname } from "./path";

export const TRASH_ROOT = normalizePath(".trash");

export type TrashItem = TrashedFile | TrashedFolder;

export class TrashRoot {
	items: TrashItem[] = [];

	constructor(private readonly vault: Vault) {}

	async refresh(): Promise<void> {
		if (await this.vault.adapter.exists(TRASH_ROOT)) {
			const trashedFiles = await this.vault.adapter.list(TRASH_ROOT);
			this.items = await this.buildItems(trashedFiles);
		} else {
			this.items = [];
		}
	}

	async empty(): Promise<void> {
		if (await this.vault.adapter.exists(TRASH_ROOT)) {
			await this.vault.adapter.rmdir(TRASH_ROOT, true);
		}

		this.items = [];
	}

	private async buildItems(trashedFiles: ListedFiles): Promise<TrashItem[]> {
		const items = [];

		for (const path of trashedFiles.folders.sort(this.compareName)) {
			const files = await this.vault.adapter.list(path);
			const children = await this.buildItems(files);

			const trashedFolder = new TrashedFolder(this.vault, path, children);
			items.push(trashedFolder);
		}

		for (const path of trashedFiles.files.sort(this.compareName)) {
			const trashedFile = new TrashedFile(this.vault, path);
			items.push(trashedFile);
		}

		return items;
	}

	private readonly collator = new Intl.Collator(undefined, {
		sensitivity: "base",
	});
	private readonly compareName = (a: string, b: string) =>
		this.collator.compare(a, b);
}

abstract class TrashedBase {
	readonly path: string;
	readonly basename: string;

	constructor(readonly vault: Vault, path: string) {
		this.path = normalizePath(path);
		this.basename = basename(this.path);
	}

	async restore(): Promise<boolean> {
		const restorePath = normalizePath(
			this.path.replace(`${TRASH_ROOT}/`, "")
		);

		if (await this.vault.adapter.exists(restorePath)) {
			return false;
		}

		const restoreParentDir = dirname(restorePath);

		if (!(await this.vault.adapter.exists(restoreParentDir))) {
			await this.vault.adapter.mkdir(restoreParentDir);
		}

		await this.vault.adapter.rename(this.path, restorePath);

		return true;
	}

	abstract remove(): Promise<void>;
}

class TrashedFile extends TrashedBase {
	readonly kind = "file";

	async remove(): Promise<void> {
		await this.vault.adapter.remove(this.path);
	}
}

class TrashedFolder extends TrashedBase {
	readonly kind = "folder";

	constructor(vault: Vault, path: string, readonly children: TrashItem[]) {
		super(vault, path);
	}

	async remove(): Promise<void> {
		await this.vault.adapter.rmdir(this.path, true);
	}
}
