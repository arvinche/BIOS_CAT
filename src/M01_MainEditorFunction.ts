/* eslint-disable @typescript-eslint/naming-convention */

import * as vscode  from 'vscode';
import * as FileSys from 'fs';
import * as RLSys   from 'readline';

const WorkSpace     = (vscode.workspace.rootPath + "/").replace(/\\/g,"/");
const BuilFolder    = WorkSpace + "Build";
const Buildlog      = WorkSpace + "BuildLog.log";
const EnvCheck      = WorkSpace + ".vscode/EnvCheck";
var   BuildPath     = "";
var   PreBuildCmd   = "";
var   BuildCommand  = "";
var   CleanCommand  = "";
//
//  Change encode into 437
//    cmd /C to compatible between MS cmd and MS Powershell
//
var GlobalCommand  = "cmd /C \"chcp 437 & cd " + BuildPath + " & ";

//
// Clear Env file when project start.
//
FileSys.unlink (EnvCheck,(_err)=>{});


//============= Local Function =============//
//
// Get terminal and something that need to predo.
//
function GetTerminal (Message:string) {
    //
    // Re get all varlable, because user may change it any time.
    //
    BuildPath     = (vscode.workspace.getConfiguration().get("BuildPath")+"").replace(/\\/g, "/").indexOf (":/") === -1?
                    WorkSpace + vscode.workspace.getConfiguration().get("BuildPath"):
                    vscode.workspace.getConfiguration().get("BuildPath")+"";
    PreBuildCmd   = vscode.workspace.getConfiguration().get("PreBuildCmd")+"&" !== PreBuildCmd ?
                    vscode.workspace.getConfiguration().get("PreBuildCmd")+"&"+ DelEnvCheck() :
                    PreBuildCmd;
    BuildCommand  = "(" + PreBuildCmd + vscode.workspace.getConfiguration().get("BuildCmd") + ") > "+ Buildlog + " 2>&1";
    CleanCommand  = "" + vscode.workspace.getConfiguration().get("CleanCmd");
    GlobalCommand = "cmd /C \"chcp 437 & cd " + BuildPath + " & ";
    //
    // Create Terminal.
    //
    let Terminal = (vscode.window.activeTerminal?.name !== "Cat Build code ENV !!") ?
                    vscode.window.createTerminal ({name: "Cat Build code ENV !!"}) :
                    vscode.window.activeTerminal;
    Terminal.sendText ("cmd");
    if (Message !== "") { vscode.window.showInformationMessage (Message); }
    return Terminal;
}

//
// Clear Env Function.
//
function DelEnvCheck():string {FileSys.unlink (EnvCheck,(_err)=>{}); return "";}

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
            if ( FileSys.statSync(FilePath).isDirectory() === true && !FilePath.endsWith ("FV")) {
                if (FilePath.endsWith (FolderName)) {
                    if (FileSys.existsSync(FilePath+"/Makefile")) {
                        ModulesFolder.push(FilePath+"/Makefile");
                    } else {
                        ModulesFolder.push(FilePath+"/"+FolderName+"/Makefile");
                    }
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

//
// Delay function for use.
//
function Delay (Sec :number){
    return new Promise (function (Resolve,Reject){
     setTimeout (Resolve,Sec); 
    });
};

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
        FileSys.writeFile (Buildlog, "Creat File\n", 'utf-8',(_err)=>{});
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
    FileSys.unlink (Buildlog,(_err)=>{});
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
export async function BuildSingleModule () {

    const Terminal  =  GetTerminal (' 🔍 Checking build environment..... ');
    //
    // Check terminal environment.
    //
    if (!FileSys.existsSync(EnvCheck)) {
        vscode.window.showInformationMessage (' 🔬 Check prebuild command can work or not.... ');
        Terminal.sendText (GlobalCommand + "("+ PreBuildCmd +"nmake -t > "+ EnvCheck + " 2>&1)" + "\"");
        await Delay(100);
        do {/* Wait for EnvCheck create */} while (!FileSys.existsSync(EnvCheck));
    }
    let CheckFile = FileSys.readFileSync (EnvCheck, 'utf-8');
    if (CheckFile.indexOf ("not recognized") !== -1) {
        FileSys.unlink (EnvCheck,(_err)=>{});
        vscode.window.showInformationMessage (" ❗️❗️ Please help BIOS-Cat to check prebuild command too create environment~");
        return;
    } else if (!FileSys.existsSync (BuilFolder) && 1) {
        FileSys.unlink (EnvCheck,(_err)=>{});
        vscode.window.showInformationMessage (
            " ❗️❗️ BIOS-Cat need your makefile environment, please build at lest once time to create it.\
            Do you want to do full build now?",
            'Yes I do !!',
            'No Thanks ~')
        .then (function (Select) { if (Select === 'Yes I do !!') { CreatEnvAndBuildCode();} });
        return;
    }
    //
    //  Start find current file in inf and module path in build folder.
    //
    await Delay(100);
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
    let BuildCommand = "";
    for (let i=0; i<MakeFilePath.length; i++) {
        BuildCommand = BuildCommand+ PreBuildCmd +"nmake -f "+MakeFilePath[i]+"&";
    }
    Terminal.show (true);
    Terminal.sendText (GlobalCommand + BuildCommand + "\"");
}