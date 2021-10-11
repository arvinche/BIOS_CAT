/* eslint-disable @typescript-eslint/naming-convention */
import { dirname, sep } from "path";
import * as vscode  from 'vscode';
import * as FileSys from 'fs';
import * as Path    from 'path';
import { GitExtension } from './GitApi/git';
import {
    //== Variable ==
      NOT_FOUND,
      WorkSpace,
      IsWindows,
      BuildSctBAT,
    //== Function ==
      Delay,
      RunGit
}  from './00_GeneralFunction';

const EDK2Git        = "https://github.com/tianocore/edk2.git";
const SctToolGit     = "https://github.com/tianocore/edk2-test.git";
let   Terminal:any   = null;
let   CreatEdkForSct = 0;
let   IsCloning      = 0;


//============= External Function =============//
//
// Class for SCT user interface.
//
export class SctDependenciesProvider implements vscode.TreeDataProvider<SctDependency> {

    constructor (private WorkspaceRoot: string) {}
    //
    //  Refresh area.
    //
    private _onDidChangeTreeData: vscode.EventEmitter<SctDependency | undefined | null | void> = new vscode.EventEmitter<SctDependency | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SctDependency | undefined | null | void> = this._onDidChangeTreeData.event;
    Refresh(): void { this.GroupList = []; this._onDidChangeTreeData.fire(); }
    //
    // Check Path function.
    //
    private PathExists (Path: string): boolean {
        try { FileSys.accessSync (Path);
        } catch (_err) { return false;
        } return true;
    }
    private GroupList:string[] = [];

    getTreeItem (Element: SctDependency): vscode.TreeItem { return Element; }

    getChildren (Element: SctDependency): Thenable<SctDependency[]> {
        if (!this.WorkspaceRoot) {
            vscode.window.showInformationMessage(' ❗️❗️ Please assign a workspace first.');
            return Promise.resolve([]);
        }
        //
        // Check book mark file.
        //
        let SctLogPath = vscode.workspace.getConfiguration().get("CAT.04_SctResultPath")+"";
        if (!this.PathExists(SctLogPath)) {
            SctLogPath = WorkSpace+SctLogPath;
            if (this.PathExists(SctLogPath)) {
                return Promise.resolve (this.getSctInfoTree (SctLogPath, Element));
            } else {
                vscode.window.showInformationMessage (" 🤔 Sct log path can not open, please check again.");
                return Promise.resolve ([]);
            }
        }
        return Promise.resolve (this.getSctInfoTree (SctLogPath, Element));
    }

    private getSctInfoTree (SctLogPath: string, Element: SctDependency): SctDependency[] {
        let SctLogFile = FileSys.readFileSync(SctLogPath, 'utf-8').split ("\n");
        let AreaSplit  = '"Service\\Protocol Name","Index"';
        let FailList   = [];
        for (let i=0, Index=0, Step=0; i<SctLogFile.length; i++) {
            //
            // Step 0 : find error area.
            //
            if (!Step && SctLogFile[i].indexOf(AreaSplit) !== NOT_FOUND) { Step = 1; }
            //
            // Step 1 : Check it's error then record the useless information.
            //
            else if (Step === 1 && SctLogFile[i].indexOf("FAIL")!==NOT_FOUND) {
                let LineCon  = SctLogFile[i].split('","');
                let Title    = LineCon[6];
                let Group    = LineCon[0].replace('"',"");
                let FailPath = WorkSpace+"SctRoot/uefi-sct/SctPkg/"+LineCon[7].split("\\SctPkg\\")[1].split(":")[0];
                let FailLine = LineCon[7].split("\\SctPkg\\")[1].split(":")[1];
                if (!Element) {
                    if (this.GroupList.indexOf(Group) === NOT_FOUND ) {
                        this.GroupList.push(Group); Index++;
                        FailList.push(new SctDependency(Index, Group, "", 0, Group,vscode.TreeItemCollapsibleState.Collapsed));
                    }
                } else if (this.GroupList.indexOf(Group) === Element.groupIndex) {
                    FailList.push(new SctDependency (
                        Index,
                        Title,
                        FailPath,
                        parseInt(FailLine),
                        Group,
                        vscode.TreeItemCollapsibleState.None
                    ));
                }
            }
            //
            // Step 2 : Emd of search then return
            //
            else if (Step===1 && SctLogFile[i].indexOf(AreaSplit) !== NOT_FOUND) {
                vscode.window.showInformationMessage (" 🧐 Analysis Sct log end.");
                break;
            }
        }
        return FailList;
    }
}


export class SctDependency extends vscode.TreeItem {
    constructor (
        public groupIndex: Number,
        public readonly markTitle: string,
        public markPath: string,
        public line:number,
        public group: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super (markTitle, collapsibleState);
        this.tooltip = `${this.markTitle}`;
        this.description = this.markTitle;
        this.iconPath = collapsibleState ? {
            light: Path.join (__filename, '../..', './Images/L01_GroupRoot.png'),
            dark: Path.join (__filename, '../..', './Images/L01_GroupRoot.png')
        }:{
            light: Path.join (__filename, '../..', './Images/00_CatIcon.png'),
            dark: Path.join (__filename, '../..', './Images/00_CatIcon.png')
        };
    }
    contextValue = this.collapsibleState?'SCT_G':'SCT_M';
}


//
// This function can help use get SCT and EDK2 form git hub.
//
export async function GetEDK2SCTFromGitHub () {
    //
    // Check environment have git or not.
    //
    if (vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports === undefined) {
        vscode.window.showInformationMessage (" 🤔 Please install git.");
        return;
    }
    //
    //  If is getting, return.
    //
    if (IsCloning) {
        vscode.window.showInformationMessage (" 🤚 Cloning now, please wait a min.");
        return;
    } else { IsCloning = 1; }
    //
    // If SCT tool is not exist in work space, get it!!
    //
    if ( !FileSys.existsSync(WorkSpace+"SctRoot") ) {
        vscode.window.showInformationMessage (" 🤔 Can't find SCT in your workspace, start clone one.....");
        await RunGit (WorkSpace, 'clone', SctToolGit, WorkSpace+"SctRoot");
        vscode.window.showInformationMessage (" 👍 Get SCT done !!");
    } else { vscode.window.showInformationMessage (" ✔ SCT already in your workspace !!"); }
    //
    // If EDK2 is not exist in work space, get it!!
    //
    if ( !FileSys.existsSync(WorkSpace+"EDK2") ) {
        vscode.window.showInformationMessage (" 🤔 Can't find EDK2 in your workspace, start clone one.....");
        await RunGit (WorkSpace, 'clone', '--recurse-submodules', EDK2Git, WorkSpace+"EDK2");
        vscode.window.showInformationMessage (" 👍 Get EDK2 done !!");
    } else { vscode.window.showInformationMessage (" ✔ EDK2 already in your workspace !!"); }
    //
    // Check if edk2setup exists or not.
    //
    if ( !FileSys.existsSync(WorkSpace+"EDK2/edksetup.bat") ) {
        vscode.window.showInformationMessage (" 🤔 Your EDK2 may be modify, clone a new one.....");
        await RunGit (WorkSpace, 'clone', '--recurse-submodules', EDK2Git, WorkSpace+"EDK2_for_SCT");
        vscode.window.showInformationMessage (" ✔ Get an new EDK2 into EDK2_for_SCT !!");
        CreatEdkForSct = 1;
    } IsCloning = 0;
    vscode.window.showInformationMessage (" 👍 Establish your SCT environment done.");
}

//
// Function to build SCT
//
export async function GenBuildSCTEnv () {
    //
    //  Now build SCT only support windows OS.
    //
    if (!IsWindows) {
        vscode.window.showInformationMessage (" 🧐 This feature only support Windows now.");
        return;
    }
    if (IsCloning) {
        vscode.window.showInformationMessage (" 🤚 Cloning now, please wait a min.");
        return;
    }
    //
    //  Check environment.
    //
    if ( !FileSys.existsSync(WorkSpace+"EDK2/edksetup.bat") || !FileSys.existsSync(WorkSpace+"SctRoot") ) {
        if (FileSys.existsSync(WorkSpace+"EDK2_for_SCT/edksetup.bat") && FileSys.existsSync(WorkSpace+"SctRoot")) {
            CreatEdkForSct = 1;
        } else {
            await vscode.window.showInformationMessage (
                " 🤔 Your SCT environment may have lost something. Like to fix it out?",
                "Yes I do !!",
                "No Thanks ~"
            ).then (async function (Select) { if (Select === 'Yes I do !!') {
                await GetEDK2SCTFromGitHub();
                vscode.window.showInformationMessage (" 🧐 If you still want to build. Please check build SCT once again.");
            }});
            return;
        }
    }
    //
    //  Check Build SCT environment have exist or not.
    //
    if (vscode.window.activeTerminal?.name !== "Cat Build code ENV !!") {
        let Compile = vscode.workspace.getConfiguration().get("CAT.04_SctBuildWith")+"";
        Terminal  = vscode.window.createTerminal ({name: "Cat SCT ENV !!"});
        Terminal.sendText("cmd");
        await Delay(1000);
        let SctBat = CreatEdkForSct ?
                     BuildSctBAT.replace("%2", Compile).replace("=%1","="+WorkSpace.substring(0, WorkSpace.length-1)).replace("\\EDK2","\\EDK2_for_SCT"):
                     BuildSctBAT.replace("%2", Compile).replace("=%1","="+WorkSpace.substring(0, WorkSpace.length-1));
        FileSys.writeFile (WorkSpace+".vscode/CatGenSCT.bat", SctBat, (_err)=>{});
        await Delay(1000);
    }
    Terminal.show (true);
    vscode.window.showInformationMessage (" 🧐 Please use terminal send instruction.");
    Terminal.sendText(WorkSpace+".vscode/CatGenSCT.bat");
}

//
// Let user can input the path of SCT log or just refresh it.
//
export async function AddOrRefreshSCTTree (TreeM02: SctDependenciesProvider) {
    vscode.window.showQuickPick (
        [" 👉 1. Gave or renew a path to SCT", " 👉 2. Refresh SCT tree view"],
        {canPickMany:false, placeHolder:' 👇 Select or input the Group that you want:'})
    .then( async function (SelectMsg) {
        if (SelectMsg?.indexOf(" 👉 1.") !== NOT_FOUND) {
            await vscode.window.showInputBox({
                ignoreFocusOut:true,
                placeHolder:' 🔖 Please gave BIOS-CAT your SCT log path.'})
            .then (async function (Msg2) {
                await vscode.workspace.getConfiguration().update('CAT.04_SctResultPath', Msg2, true);
                TreeM02.Refresh();
            });
        } else if (SelectMsg?.indexOf(" 👉 2.") !== NOT_FOUND) {
            TreeM02.Refresh();
        }
    });
}

//
//  Jump to SCT error line.
//
export function Jump2SctErrorLine (Item: SctDependency) {
    const options = {
        selection: new vscode.Range (
            new vscode.Position (Item.line-1, 0),
            new vscode.Position (Item.line, 0)
        ),
        preview: true,
        viewColumn: vscode.ViewColumn.One
    };
    vscode.window.showTextDocument (vscode.Uri.file (Item.markPath), options);
}