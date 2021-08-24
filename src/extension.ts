/* eslint-disable @typescript-eslint/naming-convention */

import * as vscode  from 'vscode';
import * as FileSys from 'fs';
import * as RLSys   from 'readline';

//
// Local define class file.
//
import { 
	NodeDependenciesProvider, 
	Dependency,
	AddBookMarkElement,
	EditBookMarkElement, 
	DelBookMarkElement,
	JumpInToBookMark
} from './L01_SideBarTreeView';

//
// Global variable.
//
const Terminal  = vscode.window.createTerminal ({name: "Cat Build code ENV !!"});
const WorkSpace = vscode.workspace.rootPath + "/";
const Buildlog  = WorkSpace + "BuildLog.log";
const BuildPath = WorkSpace + vscode.workspace.getConfiguration().get("BuildPath");
//const BuildCommand = vscode.workspace.getConfiguration().get("BuildCmd").replace(/&/, "> "+Buildlog+" 2>&1 &") + " > "+ Buildlog + " 2>&1";
const BuildCommand = "(" + vscode.workspace.getConfiguration().get("BuildCmd") + ") > "+ Buildlog + " 2>&1";
const CleanCommand = "" + vscode.workspace.getConfiguration().get("CleanCmd");
const BookmarkPath = WorkSpace + "Bookmark.json";

export function activate (context: vscode.ExtensionContext) {

	console.log ('Congratulations, your extension "BIOS-CAT" is now active!');
	
	//
	// Init sidebar Class of treeview "Part 01 book mark"
	//
	const TreeL01 = new NodeDependenciesProvider(WorkSpace);
	vscode.window.registerTreeDataProvider ( 'L01',  TreeL01);

	//
	// Start to build code
	//
	vscode.commands.registerCommand ('BIOS-CAT.CMD01', function () {
		Terminal.sendText("chcp 437 & cd " + BuildPath);
		if (!Terminal.name.indexOf("powershell")) {
			vscode.window.showInformationMessage ('Plase exchange your terminal into command prompt. (cmd.exe)');
			return;
		}
		vscode.window.showInformationMessage ('Start to build code.');
		if (!FileSys.existsSync (Buildlog)) {
			FileSys.writeFile (Buildlog, "Creat File\n", 'utf-8',(err)=>{});
		}
		Terminal.sendText (BuildCommand);
		Terminal.show (true);
		const options = {
			selection: new vscode.Range (new vscode.Position(0, 0), new vscode.Position(0, 0)),
			preview: true,
			viewColumn: vscode.ViewColumn.One
		};
		vscode.window.showTextDocument (vscode.Uri.file (Buildlog), options);
	});

	//
	//  Clean up work space
	//
	vscode.commands.registerCommand ('BIOS-CAT.CMD02', function () {
		Terminal.sendText ("chcp 437 & cd " + BuildPath);
		if (!Terminal.name.indexOf ("powershell")) {
			vscode.window.showInformationMessage ('Plase exchange your terminal into command prompt. (cmd.exe)');
			return;
		}
		vscode.window.showInformationMessage ('Start to clean up your work spase.');
		FileSys.unlink (Buildlog,(err)=>{});
		Terminal.sendText (CleanCommand);
		Terminal.show (true);
	});

	//
	// Check build log & show build error (if it have)
	//
	vscode.commands.registerCommand ('BIOS-CAT.CMD03', function () {
		var LineCount  = 0;
		var ErrorCount = 0;
		if (!FileSys.existsSync (Buildlog)) {
			vscode.window.showInformationMessage ('There have no build log to analyze.');
			return;
		}
		vscode.window.showInformationMessage ('Checking build log ......... ');
		//
		// If there have error, open the file and jump to the error line.
		//
		RLSys.createInterface ({ input: FileSys.createReadStream (Buildlog) }).on ('line', function(Line) {
			LineCount++;
			if ( (/: error +\w+:/g.test(Line)) === true ) {
				ErrorCount++;
				//
				//  Open build log in vscode.
				//
				const options = {
					selection: new vscode.Range (new vscode.Position (LineCount-1, 0), new vscode.Position (LineCount, 0)),
					preview: true,
					viewColumn: vscode.ViewColumn.One
				};
				vscode.window.showTextDocument (vscode.Uri.file (Buildlog), options);
				if (Line.indexOf (":\\")) {
					Line.split (" ").forEach (function (Units) {
						if (Units.indexOf (":\\") === 1) {
							var Unit = Units.split ("(");
							var LineNumber = 0;
							if (Unit[1]) { LineNumber = parseInt (Unit[1].replace (")", ""))-1; }
							const options = {
								selection: new vscode.Range (new vscode.Position (LineNumber, 0), new vscode.Position (LineNumber, 0)),
								preview: false,
								viewColumn: vscode.ViewColumn.One
							}; vscode.window.showTextDocument (vscode.Uri.file (Unit[0]), options);
						}
					});
				}
			}
		}).on ('close', ()=>{ vscode.window.showInformationMessage ('There have ['+ ErrorCount + "] error in your code."); });
	});

	//
	//  Sidebar 01 (Bookmark) command area.
	//
	vscode.commands.registerCommand ('BIOS-CAT.L01AddMark', function () {
		AddBookMarkElement (BookmarkPath, TreeL01);
	});
	vscode.commands.registerCommand ('BIOS-CAT.L01Edit', (Item: Dependency) => {
		EditBookMarkElement (BookmarkPath, Item, TreeL01);
	});
	vscode.commands.registerCommand ('BIOS-CAT.L01Delete', (Item: Dependency) => {
		DelBookMarkElement (BookmarkPath, Item, TreeL01);
	});
	vscode.commands.registerCommand ('BIOS-CAT.L01Reflash', function () {
		TreeL01.Refresh();
	});
	vscode.commands.registerCommand ('BIOS-CAT.L01JumpToFile', (Item: Dependency) => {
		JumpInToBookMark (BookmarkPath, Item);
	});
}

// this method is called when your extension is deactivated
export function deactivate () {}
