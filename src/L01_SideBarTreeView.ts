/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode  from 'vscode';
import * as FileSys from 'fs';
import * as Path	from 'path';

export class NodeDependenciesProvider implements vscode.TreeDataProvider<Dependency> {

	constructor (private WorkspaceRoot: string) { }
    //
    //  Reflash area.
    //
	private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | null | void> = new vscode.EventEmitter<Dependency | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | null | void> = this._onDidChangeTreeData.event;
	Refresh(): void { this._onDidChangeTreeData.fire(); }
	//
	// Check Path function.
	//
	private PathExists (Path: string): boolean {
		try { FileSys.accessSync (Path);
		} catch (err) { return false;
		} return true;
	}

	getTreeItem (Element: Dependency): vscode.TreeItem { return Element; }

	getChildren (Element: Dependency): Thenable<Dependency[]> {
		if (!this.WorkspaceRoot) {
			vscode.window.showInformationMessage('Please assign a wrokspace first.');
			return Promise.resolve([]);
		}
		//
		// Check book mark file.
		//
		const BookMarkPath = Path.join (this.WorkspaceRoot, '.vscode/Bookmark.json');
		if (this.PathExists (BookMarkPath)) {
			return Promise.resolve (this.getBookMarkJson (BookMarkPath, Element));
		} else {
			vscode.window.showInformationMessage ('You don\' have bookmark.');
			try { 
				FileSys.accessSync (BookMarkPath);
			} catch (err) {
				FileSys.writeFile (
					BookMarkPath,
					'[{"Group":"This is a sampel~","FileAndPath":[{"Tag":"Welcome use bookmark","Path":"","Start":"0.0","End":"0.0"}]}]',
					'utf-8',(err)=>{}
				);
			}
			return Promise.resolve ([]);
		}
	}

	private getBookMarkJson (BookMarkPath: string, Element: Dependency): Dependency[] {
		let Content = [];
		const BookmarkJson = JSON.parse (FileSys.readFileSync(BookMarkPath, 'utf-8'));
		for (let i=0; i<BookmarkJson.length; i++) {
			if (Element) {
				if (i === Element.groupIndex) {
					for (let i2=0; i2<BookmarkJson[i].FileAndPath.length; i2++) {
						Content.push(new Dependency (BookmarkJson[i].FileAndPath[i2].Tag, i, BookmarkJson[i].FileAndPath[i2].Path, vscode.TreeItemCollapsibleState.None));
					}
				}
			} else {
				Content.push(new Dependency (BookmarkJson[i].Group, i, "", vscode.TreeItemCollapsibleState.Collapsed));
			}
		}
		return Content;
	}
}

export class Dependency extends vscode.TreeItem {
	constructor (
		public readonly markTitle: string,
		public groupIndex: Number,
		public markPath: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super (markTitle, collapsibleState);
		this.tooltip = `${this.markPath}`;
		this.description = this.markPath.split("/").pop();
		this.iconPath = collapsibleState ? {
			light: Path.join (__filename, '../..', './Images/L01_GroupRoot.png'),
			dark: Path.join (__filename, '../..', './Images/L01_GroupRoot.png')
		}:{
			light: Path.join (__filename, '../..', './Images/00_CatIcon.png'),
			dark: Path.join (__filename, '../..', './Images/00_CatIcon.png')
		};
	}
	contextValue = this.collapsibleState?'Depn_G':'Depn_M';
}

//
//  Function of Edit book mark element.
//
export function AddBookMarkElement (BookmarkPath: string, TreeL01: NodeDependenciesProvider) {
	let GroupArray = ["Create New One. ✒️"];
	let BM = JSON.parse (FileSys.readFileSync(BookmarkPath, 'utf-8'));
	const Editor = vscode.window.activeTextEditor;

	for (let i=0; i<BM.length; i++) {
		if (BM[i].Group === "This is a sampel~") {continue;}
		GroupArray.push (BM[i].Group);
	}
	vscode.window.showQuickPick (
		GroupArray, 
		{canPickMany:false, placeHolder:' 👇 Select or input the Group that you want:'})
	.then( function (SelectMsg) {
		if (SelectMsg === "Create New One. ✒️") {
			vscode.window.showInputBox({
				ignoreFocusOut:true,
				placeHolder:' 🔖 Please enter the bookmark group.'})
			.then (function (Msg) {
				for (let i=0; i<BM.length; i++) {
					if (BM[i].Group === Msg) {
						vscode.window.showInformationMessage (' Grope name ['+Msg+'] is exist in your bookmark.');
						return;
					}
				}
				if (Msg) {
					vscode.window.showInputBox({
						ignoreFocusOut:true,
						placeHolder:' 🔖 Please enter the tag name.'})
					.then (function (Msg2) {
						if (Msg2) {
							let NewGroup = Object.assign({}, BM[0]);
							NewGroup.Group = Msg;
							NewGroup.FileAndPath = [Object.assign({}, BM[0].FileAndPath[0])];
							NewGroup.FileAndPath[0].Tag   = Msg2;
							NewGroup.FileAndPath[0].Path  = Editor?.document.fileName;
							NewGroup.FileAndPath[0].Start = Editor?.selection.anchor.line+"."+Editor?.selection.anchor.character;
							NewGroup.FileAndPath[0].End   = Editor?.selection.active.line+"."+Editor?.selection.active.character;
							BM.push(NewGroup);
							FileSys.writeFile (BookmarkPath, JSON.stringify(BM), 'utf-8', (err) =>{});
							TreeL01.Refresh();
						}
					});
				}
			});
		} else {
			vscode.window.showInputBox({
				ignoreFocusOut:true,
				placeHolder:' 🔖 Please enter the tag name.'})
			.then (function (Msg2) {
				if (Msg2) {
					for (let i=0; i<BM.length; i++) {
						if (BM[i].Group === SelectMsg) {
							let NewTag = Object.assign({}, BM[i].FileAndPath[0]);
							NewTag.Tag   = Msg2;
							NewTag.Path  = Editor?.document.fileName;
							NewTag.Start = Editor?.selection.anchor.line+"."+Editor?.selection.anchor.character;
							NewTag.End   = Editor?.selection.active.line+"."+Editor?.selection.active.character;
							BM[i].FileAndPath.push(NewTag);
							FileSys.writeFile (BookmarkPath, JSON.stringify(BM), 'utf-8', (err) =>{});
							TreeL01.Refresh();
						}
					}
				}
			});
		}
	});
}

//
//  Function of Edit book mark element.
//
export function EditBookMarkElement (BookmarkPath: string, Item: Dependency, TreeL01: NodeDependenciesProvider) {
	let UnitType = Item.collapsibleState? "Group":"Tag";
	vscode.window.showInputBox({
		ignoreFocusOut:true,
		placeHolder:'Please edit your '+ UnitType +' name.'})
	.then (function (Message) {
		if (Message) {
			var BM = JSON.parse (FileSys.readFileSync(BookmarkPath, 'utf-8'));
			var GI  = Item.groupIndex.valueOf();
			if ( Item.collapsibleState ) {
				if (BM[GI].Group === Item.markTitle) {
					BM[GI].Group = Message;
				}
				for (let i=0; i<BM.length; i++) {
					if (BM[i].Group === Message && i !== GI) {
						vscode.window.showInformationMessage (' Grope name ['+Message+'] is exist in your bookmark.');
						return;
					}
				}
			} else {
				for (let i2=0; i2<BM[GI].FileAndPath.length; i2++) {
					if (BM[GI].FileAndPath[i2].Tag === Message) {
						vscode.window.showInformationMessage (' The bookmark in same group must gave different name ~ ');
						return;
					} else if (BM[GI].FileAndPath[i2].Tag === Item.markTitle) {
						BM[GI].FileAndPath[i2].Tag = Message;
					}
				}
			}
			FileSys.writeFile (BookmarkPath, JSON.stringify(BM), 'utf-8', (err) =>{});
			TreeL01.Refresh();
		}
	});
}

//
//  Function of delete book mark element.
//
export function DelBookMarkElement (BookmarkPath: string, Item: Dependency, TreeL01: NodeDependenciesProvider) {
	vscode.window.showInformationMessage (
		"You sure you want to delete this ("+ Item.markTitle +") bookmark ?",
		'Yes I do !!',
		'No Thanks ~')
	.then (function (Select) {
		if (Select === 'Yes I do !!') {
			var BM = JSON.parse (FileSys.readFileSync(BookmarkPath, 'utf-8'));
			var i  = Item.groupIndex.valueOf();
			if ( Item.collapsibleState ) {
				if (BM[i].Group === Item.markTitle) {
					delete BM[i];
					let BookmarkString = JSON.stringify(BM).replace("null,","").replace(",null","").replace("null","");
					if (BookmarkString === "[]") {
						FileSys.unlink (BookmarkPath,(err)=>{});
					} else {
						FileSys.writeFile (BookmarkPath, BookmarkString, 'utf-8', (err) =>{});
					}
				}
			} else {
				for (let i2=0; i2<BM[i].FileAndPath.length; i2++) {
					if (BM[i].FileAndPath[i2].Tag === Item.markTitle) {
						delete BM[i].FileAndPath[i2];
						let BookmarkString = JSON.stringify(BM).replace("null,","").replace(",null","").replace("null","");
						FileSys.writeFile (BookmarkPath, BookmarkString, 'utf-8', (err) =>{});
					}
				}
			} TreeL01.Refresh();
		}
	});
}

//
//  Function jump to bookmark point.
//
export function JumpInToBookMark (BookmarkPath: string, Item: Dependency) {
	var BM = JSON.parse (FileSys.readFileSync (BookmarkPath, 'utf-8'));
	var GI = Item.groupIndex.valueOf();
	var SelectBookmark;
	for (let i=0; i<BM[GI].FileAndPath.length; i++) {
		if ( BM[GI].FileAndPath[i].Tag === Item.markTitle) {
			SelectBookmark = BM[GI].FileAndPath[i];
			try { 
				FileSys.accessSync (SelectBookmark.Path);
			} catch (err) {
				vscode.window.showInformationMessage (' File may be remove, please check it in your workspace. ');
				return;
			} break;
		}
	}
	let Start = SelectBookmark.Start.split(".");
	let End   = SelectBookmark.End.split(".");
	const options = {
		selection: new vscode.Range (
			new vscode.Position (parseInt(Start[0]), parseInt(Start[1])),
			new vscode.Position (parseInt(End[0]), parseInt(End[1]))
		),
		preview: true,
		viewColumn: vscode.ViewColumn.One
	};
	vscode.window.showTextDocument (vscode.Uri.file(SelectBookmark.Path), options);
}