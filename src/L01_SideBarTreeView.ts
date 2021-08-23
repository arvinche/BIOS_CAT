import * as vscode  from 'vscode';
import * as FileSys from 'fs';
import * as Path	from 'path';

export class NodeDependenciesProvider implements vscode.TreeDataProvider<Dependency> {
    //
    //  Reflash area.
    //
	private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | null | void> = new vscode.EventEmitter<Dependency | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | null | void> = this._onDidChangeTreeData.event;
	refresh(): void { this._onDidChangeTreeData.fire(); }

	constructor (private workspaceRoot: string) { }
	getTreeItem (element: Dependency): vscode.TreeItem { return element; }

	getChildren (element: Dependency): Thenable<Dependency[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('Please assign a wrokspace first.');
			return Promise.resolve([]);
		}
		//
		// Check book mark file.
		//
		const bookMarkPath = Path.join (this.workspaceRoot, 'Bookmark.json');
		if (this.pathExists (bookMarkPath)) {
			return Promise.resolve (this.getBookMarkJson (bookMarkPath, element));
		} else {
			vscode.window.showInformationMessage ('You don\' have bookmark.');
			return Promise.resolve ([]);
		}
	}

	private getBookMarkJson (bookMarkPath: string, element: Dependency): Dependency[] {
		let bookMark = [];
		const depBookmarkJson = JSON.parse (FileSys.readFileSync(bookMarkPath, 'utf-8'));
		for (let i=0; i<depBookmarkJson.length; i++) {
			if (element) {
				if (i === element.index) {
					for (let i2=0; i2<depBookmarkJson[i].FileAndPath.length; i2++) {
						bookMark.push(new Dependency (depBookmarkJson[i].FileAndPath[i2].Tag, i2, depBookmarkJson[i].FileAndPath[i2].Path, vscode.TreeItemCollapsibleState.None));
					}
				}
			} else {
				bookMark.push(new Dependency (depBookmarkJson[i].Group, i, "", vscode.TreeItemCollapsibleState.Collapsed));
			}
		}
		return bookMark;
	}

	private pathExists (p: string): boolean {
		try {
			FileSys.accessSync (p);
		} catch (err) {
			return false;
		}
		return true;
	}
}

export class Dependency extends vscode.TreeItem {
	constructor (
		public readonly markTitle: string,
		public index: Number,
		public markPath: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super (markTitle, collapsibleState);
		this.tooltip = `${this.markPath}`;
		this.description = this.markPath.split("/").pop();
		//this.command = "BIOS-CAT.L01AddMark";
		this.iconPath = collapsibleState ? {
			light: Path.join (__filename, '../..', './Images/L01_GroupRoot.png'),
			dark: Path.join (__filename, '../..', './Images/L01_GroupRoot.png')
		}:{
			light: Path.join (__filename, '../..', './Images/00_CatIcon.png'),
			dark: Path.join (__filename, '../..', './Images/00_CatIcon.png')
		};
	}
	contextValue = 'Depn';
}