/* eslint-disable @typescript-eslint/naming-convention */
import { dirname, sep } from "path";
import * as vscode  from 'vscode';
import * as FileSys from 'fs';
import { GitExtension } from './GitApi/git';
import {
    //== Variable ==
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
    if (IsCloning) { return; } else { IsCloning = 1; }
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
    //
    //  Check environment.
    //
    if ( !FileSys.existsSync(WorkSpace+"EDK2/edksetup.bat") || !FileSys.existsSync(WorkSpace+"SctRoot") ) {
        if (!FileSys.existsSync(WorkSpace+"EDK2_for_SCT/edksetup.bat")) {
            vscode.window.showInformationMessage (" 🧐 Your SCT environment may have lost something. Please click [🔧 Clone EDK2 & SCT from github] create it.");
            return;
        }
        CreatEdkForSct = 1;
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
// Analyze SCT log and make tree to make user easy to find out.
//
export async function AnalyzeSCTReportAndGenTree () {}