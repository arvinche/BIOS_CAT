/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode  from 'vscode';
//
// Local define class file.
//
import {WorkSpace}  from './00_GeneralFunction';

//============= Middle Area =============//
import {
    CreatEnvAndBuildCode,
    CheckBuildLogAndJump2Error,
    CleanUpWorkSpace,
    BuildSingleModule
} from './M01_MainEditorFunction';

//=============  Left Area  =============//
import {
    //==   Class  ==
      Dependency,
      NodeDependenciesProvider,
    //== Function ==
      AddBookMarkElement,
      EditBookMarkElement,
      DelBookMarkElement,
      JumpInToBookMark,
      GetCurrentPath,
      GetGitThisRowPatch
} from './L01_SideBarBookmark';

import {
    //==   Class  ==
      MemoryDependency,
    //== Function ==
      RecordAllModuleGuidAndName,
      AvailableFilter,
      SearchModuleOrAddr,
      RefreshL02_2,
      GetAndCopyModuleInfo,
      StarOrStoptRecordLog
} from './L02_SideBarLogAnalyze';

import {
    //== Function ==
      CreateFspEditorView
} from './L03_FspEditor';

import {
  //==   Class  ==
  SctDependency,
  SctDependenciesProvider,
  //== Function ==
  AddOrRefreshSCTTree,
  GetEDK2SCTFromGitHub,
  GenBuildSCTEnv,
  Jump2SctErrorLine
} from './L04_SctToolFunction';


//=======================================
//          Function Entry ~
//
export function activate (context: vscode.ExtensionContext) {
    //
    // Init Variable that we need ~
    //
    const TreeL01 = new NodeDependenciesProvider(WorkSpace);
    vscode.window.registerTreeDataProvider ('L01', TreeL01);
    const TreeM02 = new SctDependenciesProvider(WorkSpace);
    vscode.window.registerTreeDataProvider ('M02', TreeM02);
    RecordAllModuleGuidAndName (0);
    console.log ('Great~ "BIOS-CAT" is now active!');

    //
    // FSP Editor
    //
    context.subscriptions.push (CreateFspEditorView ());

    //
    // M01 build Series function.
    //
    vscode.commands.registerCommand ('BIOS-CAT.CMD01', ()=> { CreatEnvAndBuildCode (); });
    vscode.commands.registerCommand ('BIOS-CAT.CMD02', ()=>{ CleanUpWorkSpace (); });
    vscode.commands.registerCommand ('BIOS-CAT.CMD03', ()=>{ CheckBuildLogAndJump2Error (); });
    vscode.commands.registerCommand ('BIOS-CAT.CMD04', ()=>{ BuildSingleModule (); });

    //
    // M02 Self-Certification Test related functions.
    //
    vscode.commands.registerCommand ('BIOS-CAT.M02AddLog', ()=>{ AddOrRefreshSCTTree(TreeM02); });
    vscode.commands.registerCommand ('BIOS-CAT.M02GetSct', ()=>{ GetEDK2SCTFromGitHub(); });
    vscode.commands.registerCommand ('BIOS-CAT.M02BuildSct', ()=>{ GenBuildSCTEnv(); });
    vscode.commands.registerCommand ('BIOS-CAT.M02Jump2SctError', (Item: SctDependency)=>{ Jump2SctErrorLine(Item); });

    //
    //  Sidebar L01 (Bookmark) command area.
    //
    vscode.commands.registerCommand ('BIOS-CAT.L01AddMark', () => { AddBookMarkElement (TreeL01); });
    vscode.commands.registerCommand ('BIOS-CAT.L01Edit', (Item: Dependency) => { EditBookMarkElement (TreeL01, Item); });
    vscode.commands.registerCommand ('BIOS-CAT.L01Delete', (Item: Dependency) => { DelBookMarkElement (TreeL01, Item); });
    vscode.commands.registerCommand ('BIOS-CAT.L01Refresh', () => { TreeL01.Refresh(); });
    vscode.commands.registerCommand ('BIOS-CAT.L01JumpToFile', (Item: Dependency) => { JumpInToBookMark (Item); });
    vscode.commands.registerCommand ('BIOS-CAT.L01CopyFullPath', () => { GetCurrentPath (1); });
    vscode.commands.registerCommand ('BIOS-CAT.L01CopyFolderPath', () => { GetCurrentPath (2); });
    vscode.commands.registerCommand ('BIOS-CAT.L01CopyFileName', () => { GetCurrentPath (3); });
    vscode.commands.registerCommand ('BIOS-CAT.L01GetGitPatch_Row', () => { GetGitThisRowPatch (0); });
    vscode.commands.registerCommand ('BIOS-CAT.L01GetGitPatch_Key', () => { GetGitThisRowPatch (1); });

    //
    //  Sidebar L02 (Record log) command area.
    //
    vscode.commands.registerCommand ('BIOS-CAT.L02StartRecord', function () { StarOrStoptRecordLog (); });
    vscode.commands.registerCommand ('BIOS-CAT.L02FullRefresh', function () { RecordAllModuleGuidAndName(1); });
    vscode.commands.registerCommand ('BIOS-CAT.L02Refresh', function () { RefreshL02_2 (); });
    vscode.commands.registerCommand ('BIOS-CAT.L02FilterAvailable', function () { AvailableFilter (); });
    vscode.commands.registerCommand ('BIOS-CAT.L02SearchModule', function () { SearchModuleOrAddr (); });
    vscode.commands.registerCommand ('BIOS-CAT.L02CopyName', (Item: MemoryDependency) => { GetAndCopyModuleInfo (Item, 1); });
    vscode.commands.registerCommand ('BIOS-CAT.L02CopyGuid', (Item: MemoryDependency) => { GetAndCopyModuleInfo (Item, 2); });
    vscode.commands.registerCommand ('BIOS-CAT.L02CopyAddress', (Item: MemoryDependency) => { GetAndCopyModuleInfo (Item, 3); });
}

// this method is called when your extension is deactivated
export function deactivate () {}
