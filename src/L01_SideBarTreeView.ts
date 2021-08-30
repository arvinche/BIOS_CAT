/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode  from 'vscode';
import * as FileSys from 'fs';
import * as Path	from 'path';

const WorkSpace     = (vscode.workspace.rootPath + "/").replace(/\\/g,"/");
const BookmarkPath  = WorkSpace + ".vscode/Bookmark.json";
const WsIndex       = 0;
var   NeedtoShowTip = 1;

export class NodeDependenciesProvider implements vscode.TreeDataProvider<Dependency> {

	constructor (private WorkspaceRoot: string) {
		const BookMarkPath = Path.join (this.WorkspaceRoot, '.vscode/Bookmark.json');
		try { 
			FileSys.accessSync (BookMarkPath);
		} catch (err) {
			if (!FileSys.existsSync(this.WorkspaceRoot+"/.vscode")) {
				FileSys.mkdirSync(this.WorkspaceRoot+"/.vscode");
			}
			FileSys.writeFile (
				BookMarkPath,
				'[{"Group":"This is a sampel~","Time":"","FileAndPath":[{"Tag":"Welcome use bookmark","Path":"","Start":"0.0","End":"0.0","Time":""}]}]',
				'utf-8', (_err)=>{}
			);
		}
	}
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
		} catch (_err) { return false;
		} return true;
	}

	getTreeItem (Element: Dependency): vscode.TreeItem { return Element; }

	getChildren (Element: Dependency): Thenable<Dependency[]> {
		if (!this.WorkspaceRoot) {
			vscode.window.showInformationMessage(' ❗️❗️ Please assign a wrokspace first.');
			return Promise.resolve([]);
		}
		//
		// Check book mark file.
		//
		const BookMarkPath = Path.join (this.WorkspaceRoot, '.vscode/Bookmark.json');
		if (this.PathExists (BookMarkPath)) {
			return Promise.resolve (this.getBookMarkJson (BookMarkPath, Element));
		} else {
			vscode.window.showInformationMessage (' ❗️❗️ You don\' have bookmark.');
			try { 
				FileSys.accessSync (BookMarkPath);
			} catch (_err) {
				if (!FileSys.existsSync(this.WorkspaceRoot+"/.vscode")) {
					FileSys.mkdirSync(this.WorkspaceRoot+"/.vscode");
				}
				FileSys.writeFile (
					BookMarkPath,
					'[{"Group":"This is a sampel~","Time":"","FileAndPath":[{"Tag":"Welcome use bookmark","Path":"","Start":"0.0","End":"0.0","Time":""}]}]',
					'utf-8',(_err)=>{}
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
						Content.push(new Dependency (
							i,
							BookmarkJson[i].FileAndPath[i2].Tag,
							BookmarkJson[i].FileAndPath[i2].Path.replace("{WorkSpace["+WsIndex+"]}", WorkSpace),
							BookmarkJson[i].FileAndPath[i2].Time,
							vscode.TreeItemCollapsibleState.None));
					}
				}
			} else {
				if (BookmarkJson[i].Group === "This is a sampel~") { continue; }
				Content.push(new Dependency (
					i,
					BookmarkJson[i].Group,
					"",
					BookmarkJson[i].Time,
					vscode.TreeItemCollapsibleState.Collapsed));
			}
		}
		return Content;
	}
}

export class Dependency extends vscode.TreeItem {
	constructor (
		public groupIndex: Number,
		public readonly markTitle: string,
		public markPath: string,
		public time: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super (markTitle, collapsibleState);
		this.tooltip = `${this.markPath}`;
		this.description = this.markPath.split("/").pop()?.split("\\").pop()+"  ["+this.time+"]";
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
export function AddBookMarkElement (TreeL01: NodeDependenciesProvider) {
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
		var Now = new Date();
		var Time = (Now.getMonth()+1)+'/'+ Now.getDate()+'-'+Now.getHours()+':'+Now.getMinutes();
		if (SelectMsg === "Create New One. ✒️" || SelectMsg === "") {
			vscode.window.showInputBox({
				ignoreFocusOut:true,
				placeHolder:' 🔖 Please enter the bookmark group.'})
			.then (function (Msg) {
				for (let i=0; i<BM.length; i++) {
					if (BM[i].Group === Msg) {
						vscode.window.showInformationMessage (' ❗️❗️ Grope name ['+Msg+'] is exist in your bookmark.');
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
							NewGroup.Time  = Time;
							NewGroup.FileAndPath = [Object.assign({}, BM[0].FileAndPath[0])];
							NewGroup.FileAndPath[0].Tag   = Msg2;
							NewGroup.FileAndPath[0].Path  = Editor?.document.fileName.replace(/\\/g,"/").replace(WorkSpace, "{WorkSpace["+WsIndex+"]}");
							NewGroup.FileAndPath[0].Start = Editor?.selection.anchor.line+"."+Editor?.selection.anchor.character;
							NewGroup.FileAndPath[0].End   = Editor?.selection.active.line+"."+Editor?.selection.active.character;
							NewGroup.FileAndPath[0].Time  = Time;
							BM.push(NewGroup);
							FileSys.writeFile (BookmarkPath, JSON.stringify(BM), 'utf-8', (_err) =>{});
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
						for (let i2=0; i2<BM[i].FileAndPath.length; i2++) {
							if (BM[i].FileAndPath[i2].Tag === Msg2) {
								vscode.window.showInformationMessage (' ❗️❗️ The bookmark in same group must gave different name ~ ');
								return;
							}
						}
						if (BM[i].Group === SelectMsg) {
							let NewTag = Object.assign({}, BM[i].FileAndPath[0]);
							NewTag.Tag   = Msg2;
							NewTag.Path  = Editor?.document.fileName.replace(/\\/g,"/").replace(WorkSpace, "{WorkSpace["+WsIndex+"]}");
							NewTag.Start = Editor?.selection.anchor.line+"."+Editor?.selection.anchor.character;
							NewTag.End   = Editor?.selection.active.line+"."+Editor?.selection.active.character;
							NewTag.Time  = Time;
							BM[i].FileAndPath.push(NewTag);
							FileSys.writeFile (BookmarkPath, JSON.stringify(BM), 'utf-8', (_err) =>{});
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
export function EditBookMarkElement (TreeL01: NodeDependenciesProvider, Item: Dependency) {
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
						vscode.window.showInformationMessage (' ❗️❗️ Grope name ['+Message+'] is exist in your bookmark.');
						return;
					}
				}
			} else {
				for (let i2=0; i2<BM[GI].FileAndPath.length; i2++) {
					if (BM[GI].FileAndPath[i2].Tag === Message) {
						vscode.window.showInformationMessage (' ❗️❗️ The bookmark in same group must gave different name ~ ');
						return;
					} else if (BM[GI].FileAndPath[i2].Tag === Item.markTitle) {
						BM[GI].FileAndPath[i2].Tag = Message;
					}
				}
			}
			FileSys.writeFile (BookmarkPath, JSON.stringify(BM), 'utf-8', (_err) =>{});
			TreeL01.Refresh();
		}
	});
}

//
//  Function of delete book mark element.
//
export function DelBookMarkElement (TreeL01: NodeDependenciesProvider, Item: Dependency) {
	var BM = JSON.parse (FileSys.readFileSync(BookmarkPath, 'utf-8'));
	var i  = Item.groupIndex.valueOf();
	if (NeedtoShowTip) {
		vscode.window.showInformationMessage (
			" ❗️❗️ You sure you want to delete this ("+ Item.markTitle +") bookmark ?",
			'Yes I do !!',
			'No Thanks ~',
			'Don\'t show again.')
		.then (function (Select) {
			if (Select !== 'No Thanks ~') {
				if (Select === 'Don\'t show again.') { NeedtoShowTip = 0; }
				if ( Item.collapsibleState ) {
					if (BM[i].Group === Item.markTitle) {
						delete BM[i];
						let BookmarkString = JSON.stringify(BM).replace("null,","").replace(",null","").replace("null","");
						if (BookmarkString === "[]") {
							FileSys.unlink (BookmarkPath,(_err)=>{});
						} else {
							FileSys.writeFile (BookmarkPath, BookmarkString, 'utf-8', (_err) =>{});
						}
					}
				} else {
					for (let i2=0; i2<BM[i].FileAndPath.length; i2++) {
						if (BM[i].FileAndPath[i2].Tag === Item.markTitle) {
							delete BM[i].FileAndPath[i2];
							let BookmarkString = JSON.stringify(BM).replace("null,","").replace(",null","").replace("null","");
							FileSys.writeFile (BookmarkPath, BookmarkString, 'utf-8', (_err) =>{});
						}
					}
				} TreeL01.Refresh();
			}
		});
	} else {
		if ( Item.collapsibleState ) {
			if (BM[i].Group === Item.markTitle) {
				delete BM[i];
				let BookmarkString = JSON.stringify(BM).replace("null,","").replace(",null","").replace("null","");
				if (BookmarkString === "[]") {
					FileSys.unlink (BookmarkPath,(_err)=>{});
				} else {
					FileSys.writeFile (BookmarkPath, BookmarkString, 'utf-8', (_err) =>{});
				}
			}
		} else {
			for (let i2=0; i2<BM[i].FileAndPath.length; i2++) {
				if (BM[i].FileAndPath[i2].Tag === Item.markTitle) {
					delete BM[i].FileAndPath[i2];
					let BookmarkString = JSON.stringify(BM).replace("null,","").replace(",null","").replace("null","");
					FileSys.writeFile (BookmarkPath, BookmarkString, 'utf-8', (_err) =>{});
				}
			}
		} TreeL01.Refresh();
	}
}

//
//  Function jump to bookmark point.
//
export function JumpInToBookMark (Item: Dependency) {
	var BM = JSON.parse (FileSys.readFileSync (BookmarkPath, 'utf-8'));
	var GI = Item.groupIndex.valueOf();
	var SelectBookmark;
	var SelectMarkPath;
	for (let i=0; i<BM[GI].FileAndPath.length; i++) {
		if ( BM[GI].FileAndPath[i].Tag === Item.markTitle) {
			SelectBookmark = BM[GI].FileAndPath[i];
			SelectMarkPath = SelectBookmark.Path.replace("{WorkSpace["+WsIndex+"]}", WorkSpace);
			try { 
				FileSys.accessSync (SelectMarkPath);
			} catch (_err) {
				vscode.window.showInformationMessage (' ❗️❗️ File may be remove, please check it in your workspace. ');
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
	console.log ();
	vscode.window.showTextDocument (vscode.Uri.file (SelectMarkPath), options);
}