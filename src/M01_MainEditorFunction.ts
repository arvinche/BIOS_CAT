/* eslint-disable @typescript-eslint/naming-convention */

import * as vscode  from 'vscode';
import * as FileSys from 'fs';
import * as RLSys   from 'readline';
import { SendCommand } from './RunCommand';

const NOT_FOUND     = -1;
const WorkSpace     = (vscode.workspace.rootPath + "/").replace(/\\/g,"/");
const BuilFolder    = WorkSpace + "Build";
const Buildlog      = WorkSpace + "BuildLog.log";
const EnvCheck      = WorkSpace + ".vscode/CatEnvCheck.cat";
const StatusFile    = WorkSpace + ".vscode/CatStatus.cat";
var   PreBuildCmd   = "&";
var   BuildCommand  = "";
var   Parameter01   = "";
var   Parameter02   = "";
var   CleanCommand  = "";

//  Build status define (but now write directly in the "StatusFile"):
//  0 : Waiting for instructions.
//  1 : Building code.
//  2 : Clean up work space.
//  3 : Building single module.
//
FileSys.writeFile (StatusFile, "0", 'utf-8', (_err) =>{});
var   BuildStatus   = "0";


//
// Clear Env file when project start.
//
FileSys.unlink (EnvCheck,(_err)=>{});

//============= Local Function =============//
//
// Get terminal and something that need to pre do.
//
function GetTerminalAndCheckEnvironment (Message:string):vscode.Terminal|null {

    //
    // Check / Create StatusFile to make shure the file is exists.
    //
    if (!FileSys.existsSync(StatusFile) || (vscode.window.activeTerminal?.name !== "Cat Build code ENV !!")) {
        FileSys.writeFileSync (StatusFile, "0");
    }
    //
    // Check BIOS-CAT is doing something else or not.
    //
    BuildStatus = FileSys.readFileSync (StatusFile, 'utf-8');
    if (BuildStatus.indexOf("0") === NOT_FOUND) {
        vscode.window.showInformationMessage (" ❗️❗️ BIOS-CAT is now  ["+BuildStatus+"] !!.");
        return null;
    }
    //
    // Get Config value.
    //
    let GetConfig = vscode.workspace.getConfiguration();
    //
    // Check build path is exist or not.
    //
    var BuildPath;
    BuildPath     = (GetConfig.get("CAT.00_BuildPath")+"").replace(/\\/g, "/").indexOf (":/") === NOT_FOUND?
                    WorkSpace + GetConfig.get("CAT.00_BuildPath") : GetConfig.get("CAT.00_BuildPath")+"";
    if (!FileSys.existsSync(BuildPath) && !FileSys.existsSync(WorkSpace+BuildPath)) {
        vscode.window.showInformationMessage (" ❗️❗️ File path  ["+BuildPath+"]  seems not exist.");
        return null;
    }
    //
    // Reacquire all varlable, because user may change it any time.
    //
    PreBuildCmd   = GetConfig.get("CAT.01_PreBuildCmd")+"&" !== PreBuildCmd ?
                    GetConfig.get("CAT.01_PreBuildCmd")+"&"+ DelEnvCheck() : PreBuildCmd;
    BuildCommand  = GetConfig.get("CAT.02_BuildCmd") !== ""  ? "(" + PreBuildCmd + GetConfig.get("CAT.02_BuildCmd") + ")" : "";
    if (GetConfig.get("CAT.04_SetParameterWith") === "Build") {
        Parameter01   = GetConfig.get("CAT.Parameter01") !== "" ?
                        "(" + PreBuildCmd + GetConfig.get("CAT.02_BuildCmd") + " " +GetConfig.get("CAT.Parameter01") + ")" : "";
        Parameter02   = GetConfig.get("CAT.Parameter02") !== "" ?
                        "(" + PreBuildCmd + GetConfig.get("CAT.02_BuildCmd") + " " +GetConfig.get("CAT.Parameter02") + ")" : "";
    } else {
        Parameter01   = GetConfig.get("CAT.Parameter01") !== "" ?
                        "(" + PreBuildCmd .replace ("&", " "+GetConfig.get("CAT.Parameter01")+"&"+ GetConfig.get("CAT.02_BuildCmd")) + ")" : "";
        Parameter02   = GetConfig.get("CAT.Parameter02") !== "" ?
                        "(" + PreBuildCmd .replace ("&", " "+GetConfig.get("CAT.Parameter02")+"&"+ GetConfig.get("CAT.02_BuildCmd")) + ")" : "";
    }
    CleanCommand = "" + GetConfig.get("CAT.03_CleanCmd");
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
                FilePath.indexOf (Excluded) === NOT_FOUND) {
                    //
                    //  Recursive to findout.
                    //
                    Deepfine (FilePath, SearchContent, SubName, Excluded);
            } else {
                if (FilePath.endsWith (SubName)) {
                    let FileContent = FileSys.readFileSync (FilePath, 'utf-8');
                    if (FileContent.indexOf (SearchContent) !== NOT_FOUND) {
                        let Line = FileContent.split ("\n");
                        for (let i=0; i<Line.length; i++) {
                            if (Line[i].indexOf ("BASE_NAME") !== NOT_FOUND) {
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
export async function CreatEnvAndBuildCode () {

    const Terminal  = GetTerminalAndCheckEnvironment (' 🔍 Checking build environment..... ');
    var   GetConfig = vscode.workspace.getConfiguration();
    if (Terminal === null) { return; }
    //
    // Check Build commands.
    //
    if (PreBuildCmd === "&") {
        vscode.window.showInformationMessage (' ❗️❗️ Please set [CAT.01_PreBuildCmd] before you use this function.');
        return;
    }else if (BuildCommand === "") {
        vscode.window.showInformationMessage (' ❗️❗️ Please unless set [CAT.02_BuildCmd]');
        return;
    }
    //
    // Check if there have 02 or 03 command.
    //
    if (Parameter01 !== "" || Parameter02 !== "") {
        await vscode.window.showInformationMessage (
            " 🤔 Chouse time !! select one command to execute ~~",
            "1⃣️  Build without parameter.",
            "2⃣️  With ["+GetConfig.get("CAT.Parameter01")+"]",
            "3⃣️  With ["+GetConfig.get("CAT.Parameter02")+"]")
        .then (function (Select) {
            let Build = Select?.indexOf("1⃣️  ") !== NOT_FOUND ?
                        BuildCommand : Select?.indexOf("2⃣️  ") !== NOT_FOUND ?
                        Parameter01  : Parameter02;
            if (!Select || Build === "") {
                vscode.window.showInformationMessage (' ❗️❗️ Cancel execution.');
                return;
            }
            let BuildStatus = FileSys.readFileSync (StatusFile, 'utf-8');
            if (BuildStatus.indexOf("0") !== NOT_FOUND) {
                FileSys.writeFileSync (StatusFile, "Building");
                SendCommand (Terminal, Build, WorkSpace, true, Buildlog, StatusFile);
                vscode.window.showInformationMessage (" 🐈 Start to build code.");
            } else {
                vscode.window.showInformationMessage (" ❗️❗️ BIOS-CAT is now  ["+BuildStatus+"] !!.");
            }
        });
    } else {
        await Delay(1000);
        FileSys.writeFileSync (StatusFile, "Building");
        SendCommand (Terminal, BuildCommand, WorkSpace, true, Buildlog, StatusFile);
        vscode.window.showInformationMessage (" 🐈 Start to build code.");
    }
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
export async function CleanUpWorkSpace () {

    const Terminal  =  GetTerminalAndCheckEnvironment (" 🧹 Start to clean up your work spase.");
    if (Terminal === null) { return; }
    //
    // Check Clena command.
    //
    if (CleanCommand === "") {
        vscode.window.showInformationMessage (' ❗️❗️ Please set [CAT.03_CleanCmd] before you use it.');
        return;
    } await Delay(1000);
    //
    // Delete Build log and clean workspace.
    //
    FileSys.writeFileSync (StatusFile, "Cleaning");
    FileSys.unlink (Buildlog,(_err)=>{});
    SendCommand (Terminal, PreBuildCmd + CleanCommand, WorkSpace, true, "", StatusFile);
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

    const Terminal  =  GetTerminalAndCheckEnvironment (' 🔍 Checking build environment..... ');
    if (Terminal === null) { return; }
    //
    // Check prebuild command.
    //
    if (PreBuildCmd === "&") {
        vscode.window.showInformationMessage (' ❗️❗️ Please set [CAT.01_PreBuildCmd] before you use this function.');
        return;
    } await Delay(1000);
    //
    // Check terminal environment.
    //
    if (!FileSys.existsSync(EnvCheck)) {
        FileSys.writeFileSync (StatusFile, "Checking environment");
        vscode.window.showInformationMessage (' 🔬 Check prebuild command can work or not.... ');
        SendCommand (Terminal, "("+ PreBuildCmd +"nmake -t > "+ EnvCheck + " 2>&1)", WorkSpace, true, "", StatusFile);
        await Delay(500);
        do {/* Wait for EnvCheck create */} while (!FileSys.existsSync(EnvCheck));
    }
    let CheckFile = FileSys.readFileSync (EnvCheck, 'utf-8');
    if (CheckFile.indexOf ("not recognized") !== NOT_FOUND) {
        FileSys.unlink (EnvCheck,(_err)=>{});
        vscode.window.showInformationMessage (" ❗️❗️ Please help BIOS-Cat to check prebuild command too create environment~");
        return;
    } else if (!FileSys.existsSync (BuilFolder) && 1) {
        FileSys.unlink (EnvCheck,(_err)=>{});
        vscode.window.showInformationMessage (
            " ❗️❗️ BIOS-Cat need your \"Makefile\" environment, please build at lest once time to create it.\
            Do you want to do full build now?",
            'Yes I do !!',
            'No Thanks ~')
        .then (function (Select) { if (Select === 'Yes I do !!') { CreatEnvAndBuildCode();} });
        return;
    }
    //
    //  Start find current file in inf and module path in build folder.
    //
    FileSys.writeFileSync (StatusFile, "Analyze the build environment");
    let FileName = vscode.window.activeTextEditor?.document.fileName.replace(/\\/g,"/").split("/").pop()+"";
    let ModuleName = FindModuleName (vscode.window.activeTextEditor?.document.fileName+"", FileName, ".inf", BuilFolder);
    if (ModuleName === "") {
        vscode.window.showInformationMessage (" ❗️❗️ Can\'t find [ "+FileName+" ] in inf file, please check it and rebuild again.");
        FileSys.writeFileSync (StatusFile, "0");
        return;
    }
    let MakeFilePath = SearchBuildFolder (BuilFolder, ModuleName);
    if (!MakeFilePath.length) {
        vscode.window.showInformationMessage (" ❗️❗️ Can\'t find [ "+ModuleName+" ] in Build folder, please unliess full build once time or make sure this module will been build.");
        FileSys.writeFileSync (StatusFile, "0");
        return;
    }
    vscode.window.showInformationMessage (' 🐈 Start to build module =>[ '+ModuleName+' ].');
    let ModuleBuildCmd = "";
    for (let i=0; i<MakeFilePath.length; i++) {
        ModuleBuildCmd = ModuleBuildCmd+ PreBuildCmd +"nmake -f "+MakeFilePath[i]+"&";
    }
    Terminal.show (true);
    FileSys.writeFileSync (StatusFile, "Building module");
    SendCommand (Terminal, ModuleBuildCmd, WorkSpace, true, "", StatusFile);
}