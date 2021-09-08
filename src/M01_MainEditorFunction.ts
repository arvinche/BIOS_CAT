/* eslint-disable @typescript-eslint/naming-convention */

import * as vscode  from 'vscode';
import * as FileSys from 'fs';
import * as RLSys   from 'readline';
import {
  //== Variable ==
    WorkSpace,
    EnvCheck,
    StatusFile,
  //== Function ==
    SendCommand2PY,
    Delay,
    DelEnvCheck
} from './00_GeneralFunction';

const NOT_FOUND     = -1;
const BuilFolder    = WorkSpace + "Build";
const Buildlog      = WorkSpace + ".vscode/BuildLog.log";
const NmakeCheck    = "NMAKE : fatal error U1064:";
var   PreBuildCmd   = "&";
var   BuildCommand  = "";
var   CleanCommand  = "";
var   BuildStatus   = "0";

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
    var BuildPath = (GetConfig.get("CAT.00_BuildPath")+"").replace(/\\/g, "/").indexOf (":/") === NOT_FOUND?
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
    // Get Build parameter.
    //
     var ParameterList: {[key:string]: string} = Object.assign({}, GetConfig.get("CAT.Parameter"));
     let ChooseBuildList: {[key:string]: string} = Object.create (null);

    for (var Parameter in ParameterList) {
        var KeyName  = `${Parameter} [${ParameterList[Parameter]}]`;
        var KeyValue = `${ParameterList[Parameter]}`;
        ChooseBuildList[KeyName] = KeyValue;
    }

    await vscode.window.showInformationMessage (
        " 🤔 Choose time !! select one command to execute ~~",
        ...Object.keys (ChooseBuildList)
        )
    .then (function (Select) {
        var Build:string;
        if (!Select) {
            vscode.window.showInformationMessage (' ❗️❗️ Cancel execution.');
            return;
        } else {
            var SelectString = Select + "";
            if (GetConfig.get("CAT.04_SetParameterWith") === "Build") {
                Parameter =   "(" + PreBuildCmd + GetConfig.get("CAT.02_BuildCmd") + " " + ChooseBuildList[SelectString] + ")";
            } else {
                Parameter = "(" + PreBuildCmd .replace ("&", " "+ ChooseBuildList[SelectString] + "&" + GetConfig.get("CAT.02_BuildCmd")) + ")";
            }
            Build = Parameter;
        }
        let BuildStatus = FileSys.readFileSync (StatusFile, 'utf-8');
        if (BuildStatus.indexOf("0") !== NOT_FOUND) {
            FileSys.writeFileSync (StatusFile, "Building");
            SendCommand2PY (Terminal, Build, WorkSpace, true, Buildlog);
            vscode.window.showInformationMessage (" 🐈 Start to build code.");
        } else {
            vscode.window.showInformationMessage (" ❗️❗️ BIOS-CAT is now  ["+BuildStatus+"] !!.");
        }
    });
    Terminal.show (true);
}

//
//  Clean up work space
//
export async function CleanUpWorkSpace () {

    const Terminal  =  GetTerminalAndCheckEnvironment (" 🧹 Start to clean up your work spase.");
    if (Terminal === null) { return; }
    //
    // Check Clean command.
    //
    if (CleanCommand === "") {
        vscode.window.showInformationMessage (' ❗️❗️ Please set [CAT.03_CleanCmd] before you use it.');
        return;
    } await Delay(1000);
    //
    // Delete Build log and clean workspace.
    //
    FileSys.writeFileSync (StatusFile, "Cleaning");
    FileSys.unlink (Buildlog, (_err)=>{});
    SendCommand2PY (Terminal, PreBuildCmd + CleanCommand, WorkSpace, true, "");
    Terminal.show (true);
}

//
// Check build log & show build error (if it have)
//
export function CheckBuildLogAndJump2Error () {
    var LineCount  = 0;
    var ErrorCount = 0;
    if (!FileSys.existsSync (Buildlog)) {
        vscode.window.showInformationMessage (' ❗️❗️ There have no build log to analyze.');
        return;
    }
    //
    //  Open build log in vscode.
    //
    const options = {
        selection: new vscode.Range (new vscode.Position (0, 0), new vscode.Position (0, 0)),
        preview: true,
        viewColumn: vscode.ViewColumn.One
    };
    vscode.window.showTextDocument (vscode.Uri.file (Buildlog), options);
    vscode.window.showInformationMessage (' 🔍 Checking build log ......... ');
    //
    // If there have error, open the file and jump to the error line.
    //
    RLSys.createInterface ({ input: FileSys.createReadStream (Buildlog) }).on ('line', function(Line) {
        LineCount++;
        if ( (/ error +\w+:/g.test(Line)) === true ) {
            ErrorCount++;
            //
            // C & inf checker.
            //
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
        SendCommand2PY (Terminal, "("+ PreBuildCmd +"nmake -t)", WorkSpace, false, EnvCheck);
        //
        // Wait 5 sec to make sure the pyhton command can indeed marge, and wait for "EnvCheck" file generate.
        // (If prebuild can do successful this part will only run once time.)
        //
        await Delay(5000);
        //do {/* Wait for EnvCheck create */} while (!FileSys.existsSync(EnvCheck));
    }
    await Delay(1000);
    let CheckFile = FileSys.readFileSync (EnvCheck, 'utf-8');
    if (CheckFile.indexOf (NmakeCheck) === NOT_FOUND) {
        FileSys.unlink (EnvCheck,(_err)=>{});
        vscode.window.showInformationMessage (" ❗️❗️ Prebuild command error! \n Please help BIOS-Cat to check prebuild command too create environment~");
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
        vscode.window.showInformationMessage (" ❗️❗️ Can\'t find [ "+FileName+" ] in \"inf\" file, please check it and rebuild again.");
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
    SendCommand2PY (Terminal, ModuleBuildCmd, WorkSpace, true, "");
}