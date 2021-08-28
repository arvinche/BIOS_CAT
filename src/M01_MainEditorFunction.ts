/* eslint-disable @typescript-eslint/naming-convention */

import * as vscode  from 'vscode';
import * as FileSys from 'fs';
import * as RLSys   from 'readline';

const WorkSpace     = (vscode.workspace.rootPath + "/").replace(/\\/g,"/");
const BuilFolder    = WorkSpace + "Build";
const Buildlog      = WorkSpace + "BuildLog.log";
const BuildPath     = WorkSpace + vscode.workspace.getConfiguration().get("BuildPath");
const BuildCommand  = "(" + vscode.workspace.getConfiguration().get("BuildCmd") + ") > "+ Buildlog + " 2>&1";
const CleanCommand  = "" + vscode.workspace.getConfiguration().get("CleanCmd");
const EnvCheck      = WorkSpace+".vscode/EnvCheck";

//
//  Change encode into 437
//    cmd /C to compatible between MS cmd and MS Powershell
//
const GlobalCommand = "cmd /C \"chcp 437 & cd " + BuildPath + " & ";


//============= Local Function =============//
function GetTerminal (Message:string) {
    let Terminal = (vscode.window.activeTerminal?.name !== "Cat Build code ENV !!") ?
                    vscode.window.createTerminal ({name: "Cat Build code ENV !!"}) :
                    vscode.window.activeTerminal;
    if (Message !== "") { vscode.window.showInformationMessage (Message); }
    return Terminal;
}

//
//  Find the file with sub file name. (from inside out)
//
function FindModuleName (Root:string, SearchContent:string, SubName:string, Excluded:string):string {
    Root = Root.replace(/\\/g,"/");
    let Filefolder = Root.split("/");
    let ModuleName = "";

    function Deepfine (Root:string, SearchContent:string, SubName:string, Excluded:string) {
        FileSys.readdirSync(Root).forEach ( function (item) {
            let FilePath = require('path').join (Root,item);
            if ( FileSys.statSync(FilePath).isDirectory() === true &&
                FilePath.indexOf (Excluded) === -1) {
                    //
                    //  Recursive to findout.
                    //
                    Deepfine (FilePath, SearchContent, SubName, Excluded);
            } else {
                if (FilePath.endsWith (SubName)) {
                    let FileContent = FileSys.readFileSync (FilePath, 'utf-8');
                    if (FileContent.indexOf (SearchContent) !== -1) {
                        let Line = FileContent.split ("\n");
                        for (let i=0; i<Line.length; i++) {
                            if (Line[i].indexOf ("BASE_NAME") !== -1) {
                                ModuleName = Line[i].split(" ").pop()?.replace("\r","")+"";
                            }
                        }
                    }
                }
            }
        });
    }
    for (let i=Filefolder.length ; i!==0 && ModuleName === ""; i--){
        Root = Root.replace ("/"+Filefolder[i-1], "");
        if (Root+"/" === WorkSpace) {return "";}
        Deepfine (Root, SearchContent, SubName, Excluded);
    }
    return ModuleName;
}

//
//  Find the file with sub file name. (from the outside in)
//
function SearchBuildFolder (Root:string, FolderName:string):string[] {
    let ModulesFolder:string[] = [];
    function Deepfine (Root:string, FolderName:string) {
        FileSys.readdirSync(Root).forEach ( function (item) {
            let FilePath = require('path').join (Root,item);
            if ( FileSys.statSync(FilePath).isDirectory() === true) {
                if (FilePath.endsWith (FolderName)) {
                    ModulesFolder.push(FilePath+"/"+FolderName+"/Makefile");
                    return;
                }
                //
                //  Recursive to findout.
                //
                Deepfine (FilePath, FolderName);
            }
        });
    }
    Deepfine (Root, FolderName);
    return ModulesFolder;
}

//============= External Function =============//
//
// Start to build code
//
export function CreatEnvAndBuildCode () {

    const Terminal  =  GetTerminal (" 🐈 Start to build code.");
    //
    //  Check buildlog file exists to make sure "showTextDocument" can works will.
    //
    if (!FileSys.existsSync (Buildlog)) {
        FileSys.writeFile (Buildlog, "Creat File\n", 'utf-8',(err)=>{});
    }
    Terminal.sendText (GlobalCommand + BuildCommand + "\"");
    Terminal.show (true);
    const options = {
        selection: new vscode.Range (new vscode.Position(0, 0), new vscode.Position(0, 0)),
        preview: true,
        viewColumn: vscode.ViewColumn.One
    };
    vscode.window.showTextDocument (vscode.Uri.file (Buildlog), options);
}

//
//  Clean up work space
//
export function CleanUpWorkSpace () {

    const Terminal  =  GetTerminal (" 🧹 Start to clean up your work spase.");
    //
    // Delete Build log and clean workspace.
    //
    FileSys.unlink (Buildlog,(err)=>{});
    Terminal.sendText (GlobalCommand + CleanCommand + "\"");
    Terminal.show (true);
}

//
// Check build log & show build error (if it have)
//
export function ChecBuildLogAndJump2Error () {
    var LineCount  = 0;
    var ErrorCount = 0;
    if (!FileSys.existsSync (Buildlog)) {
        vscode.window.showInformationMessage (' ❗️❗️ There have no build log to analyze.');
        return;
    }
    vscode.window.showInformationMessage (' 🔍 Checking build log ......... ');
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
    }).on ('close', ()=>{ vscode.window.showInformationMessage (' ❗️ There have ['+ ErrorCount + "] error in your code."); });
}

//
//  Build individual module
//
export function BuildSingleModule () {

    const Terminal  =  GetTerminal (' 🔍 Checking build environment..... ');
    //
    // Check terminal environment.
    //
    FileSys.unlink (EnvCheck,(err)=>{});
    Terminal.sendText (GlobalCommand + "(nmake > "+ EnvCheck + " 2>&1)" + "\"");
    let CheckFile = FileSys.readFileSync (EnvCheck, 'utf-8');
    if (!FileSys.existsSync (BuilFolder) || CheckFile.indexOf("not recognized") !== -1) {
        vscode.window.showInformationMessage (
            " ❗️❗️ BIOS-Cat need your build environment, please build at least one time and keep terminal.\
             Do you want to build it now?",
            'Yes I do !!',
            'No Thanks ~')
        .then (function (Select) { if (Select === 'Yes I do !!') { CreatEnvAndBuildCode();} });
        return;
    }
    //
    //  Start find current file in inf and module path in build folder.
    //
    let FileName = vscode.window.activeTextEditor?.document.fileName.replace(/\\/g,"/").split("/").pop()+"";
    let ModuleName = FindModuleName (vscode.window.activeTextEditor?.document.fileName+"", FileName, ".inf", BuilFolder);
    if (ModuleName === "") {
         vscode.window.showInformationMessage (" ❗️❗️ Can\'t find [ "+FileName+" ] in inf file, please check it and rebuild again.");
         return;
    }
    let MakeFilePath = SearchBuildFolder (BuilFolder, ModuleName);
    if (!MakeFilePath.length) {
        vscode.window.showInformationMessage (" ❗️❗️ Can\'t find [ "+ModuleName+" ] in Build folder, please make sure this module will been build.");
        return;
    }
    vscode.window.showInformationMessage (' 🐈 Start to build module [ '+ModuleName+' ].');
    Terminal.show (true);
    let BuildCommand = "";
    for (let i=0; i<MakeFilePath.length; i++) {
        BuildCommand = BuildCommand+"nmake "+MakeFilePath[i]+"&";
    }
    Terminal.sendText (GlobalCommand + BuildCommand + "\"");
}