/* eslint-disable @typescript-eslint/naming-convention */

import * as vscode  from 'vscode';

//
// Local define class file.
//
//============= Middle Area =============//
import { 
	CreatEnvAndBuildCode,
	ChecBuildLogAndJump2Error,
	CleanUpWorkSpace,
	BuildSingleModule
} from './M01_MainEditorFunction';

//=============  Left Area  =============//
import { 
	NodeDependenciesProvider, 
	Dependency,
	AddBookMarkElement,
	EditBookMarkElement, 
	DelBookMarkElement,
	JumpInToBookMark
} from './L01_SideBarTreeView';

import { 

} from './L02_SideBarRecordLog';

//
//  Function Entry ~
//
export function activate (context: vscode.ExtensionContext) {
	//
	// Init Variable that we need ~
	//
	const WorkSpace = (vscode.workspace.rootPath + "/").replace(/\\/g,"/");
	const TreeL01   = new NodeDependenciesProvider(WorkSpace);
	vscode.window.registerTreeDataProvider ('L01', TreeL01);
	console.log ('Great~ "BIOS-CAT" is now active!');
	//
	// Start to build code
	//
	vscode.commands.registerCommand ('BIOS-CAT.CMD01', ()=> { CreatEnvAndBuildCode (); });

	//
	//  Clean up work space
	//
	vscode.commands.registerCommand ('BIOS-CAT.CMD02', ()=>{ CleanUpWorkSpace (); });

	//
	// Check build log & show build error (if it have)
	//
	vscode.commands.registerCommand ('BIOS-CAT.CMD03', ()=>{ ChecBuildLogAndJump2Error (); });

	//
	//  Build individual module
	//
	vscode.commands.registerCommand ('BIOS-CAT.CMD04', ()=>{ BuildSingleModule (); });	

	//
	//  Sidebar L01 (Bookmark) command area.
	//
	vscode.commands.registerCommand ('BIOS-CAT.L01AddMark', () => { AddBookMarkElement (TreeL01); });
	vscode.commands.registerCommand ('BIOS-CAT.L01Edit', (Item: Dependency) => { EditBookMarkElement (TreeL01, Item); });
	vscode.commands.registerCommand ('BIOS-CAT.L01Delete', (Item: Dependency) => { DelBookMarkElement (TreeL01, Item); });
	vscode.commands.registerCommand ('BIOS-CAT.L01Reflash', () => { TreeL01.Refresh(); });
	vscode.commands.registerCommand ('BIOS-CAT.L01JumpToFile', (Item: Dependency) => { JumpInToBookMark (Item); });

	//
	//  Sidebar L02 (Record log) command area.
	//
	vscode.commands.registerCommand ('BIOS-CAT.L02StartRecord!!', function () {
		
	});
}

// this method is called when your extension is deactivated
export function deactivate () {}
