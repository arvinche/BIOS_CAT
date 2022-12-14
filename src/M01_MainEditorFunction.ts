/* eslint-disable @typescript-eslint/naming-convention */

import * as vscode  from 'vscode';
import * as FileSys from 'fs';
import * as RLSys   from 'readline';
import {
  //== Variable ==
    WorkSpace,
    EnvCheck,
    StatusFile,
    BuildFolder,
    NOT_FOUND,
  //== Function ==
    SendBuildCommand2PY,
    Delay,
    DelEnvCheck
} from './00_GeneralFunction';

const BuildLog      = WorkSpace + ".vscode/BuildLog.log";
const NmakeCheck    = "NMAKE : fatal error U1062:";
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
    // Check / Create StatusFile to make sure the file is exists.
    //
    if (!FileSys.existsSync(StatusFile) || (vscode.window.activeTerminal?.name !== "Cat Build code ENV !!")) {
        FileSys.writeFileSync (StatusFile, "0");
    }
    //
    // Check BIOS-CAT is doing something else or not.
    //
    BuildStatus = FileSys.readFileSync (StatusFile, 'utf-8');
    if (BuildStatus.indexOf("0") === NOT_FOUND) {
        vscode.window.showInformationMessage (" 💦 BIOS-CAT is now  ["+BuildStatus+"] !!.");
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
    // Reacquire all variable, because user may change it any time.
    //
    PreBuildCmd   = GetConfig.get("CAT.01_BuildCmdPreload")+"&" !== PreBuildCmd ?
                    GetConfig.get("CAT.01_BuildCmdPreload")+"&"+ DelEnvCheck() : PreBuildCmd;
    BuildCommand  = GetConfig.get("CAT.01_BuildCmdStart") !== ""  ? "(" + PreBuildCmd + GetConfig.get("CAT.01_BuildCmdStart") + ")" : "";
    CleanCommand = "" + GetConfig.get("CAT.01_CleanCmd");
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
    let FileFolder = Root.split("/");
    let ModuleName = "";

    function DeepFind (Root:string, SearchContent:string, SubName:string, Excluded:string) {
        FileSys.readdirSync(Root).forEach ( function (item) {
            let FilePath = require('path').join (Root,item);
            if ( FileSys.statSync(FilePath).isDirectory() === true &&
                FilePath.indexOf (Excluded) === NOT_FOUND) {
                    //
                    //  Recursive to find out.
                    //
                    DeepFind (FilePath, SearchContent, SubName, Excluded);
            } else {
                if (FilePath.endsWith (SubName)) {
                    let FileContent = FileSys.readFileSync (FilePath, 'utf-8');
                    if (FileContent.indexOf (SearchContent) !== NOT_FOUND) {
                        let Line = FileContent.split ("\n");
                        for (let i=0; i<Line.length; i++) {
                            if (Line[i].indexOf ("BASE_NAME") !== NOT_FOUND) {
                                ModuleName = Line[i].split(" ").pop()?.replace("\r","")+"";
                                break;
                            }
                        }
                    }
                }
            }
        });
    }
    for (let i=FileFolder.length ; i!==0 && ModuleName === ""; i--){
        Root = Root.replace ("/"+FileFolder[i-1], "");
        if (Root+"/" === WorkSpace) {return "";}
        DeepFind (Root, SearchContent, SubName, Excluded);
    }
    return ModuleName;
}

//
//  Find the file with sub file name. (from the outside in)
//
function SearchBuildFolder (Root:string, FolderName:string):string[] {
    let ModulesFolder:string[] = [];
    function DeepFind (Root:string, FolderName:string) {
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
                //  Recursive to find out.
                //
                DeepFind (FilePath, FolderName);
            }
        });
    }
    DeepFind (Root, FolderName);
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
        vscode.window.showInformationMessage (' ❗️❗️ Please set [CAT.01_BuildCmdPreload] before you use this function.');
        return;
    }else if (BuildCommand === "") {
        vscode.window.showInformationMessage (' ❗️❗️ Please unless set [CAT.01_BuildCmdStart]');
        return;
    }
    //
    // Get Build parameter.
    //
    var ParameterList: {[key:string]: string} = Object.assign({}, GetConfig.get("CAT.01_ParameterSettingDetail"));
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
            if (GetConfig.get("CAT.01_ParameterGoWith") === "Build") {
                Parameter = "(" + PreBuildCmd + GetConfig.get("CAT.01_BuildCmdStart") + " " + ChooseBuildList[SelectString] + ")";
            } else {
                Parameter = "(" + PreBuildCmd .replace ("&", " "+ ChooseBuildList[SelectString] + "&" + GetConfig.get("CAT.01_BuildCmdStart")) + ")";
            }
            Build = Parameter;
        }
        let BuildStatus = FileSys.readFileSync (StatusFile, 'utf-8');
        if (BuildStatus.indexOf("0") !== NOT_FOUND) {
            FileSys.writeFileSync (StatusFile, "Building");
            SendBuildCommand2PY (Terminal, Build, WorkSpace, true, BuildLog);
            vscode.window.showInformationMessage (" 🐾 Start to build code.");
        } else {
            vscode.window.showInformationMessage (" 💢 BIOS-CAT is now  ["+BuildStatus+"] !!.");
        }
    });
    Terminal.show (true);
}

//
//  Clean up work space
//
export async function CleanUpWorkSpace () {

    const Terminal  =  GetTerminalAndCheckEnvironment (" 🧹 Start to clean up your work space.");
    if (Terminal === null) { return; }
    //
    // Check Clean command.
    //
    if (CleanCommand === "") {
        vscode.window.showInformationMessage (' ❗️❗️ Please set [CAT.01_CleanCmd] before you use it.');
        return;
    } await Delay(1000);
    //
    // Delete Build log and clean workspace.
    //
    FileSys.writeFileSync (StatusFile, "Cleaning");
    FileSys.unlink (BuildLog, (_err)=>{});
    SendBuildCommand2PY (Terminal, PreBuildCmd + CleanCommand, WorkSpace, true, "");
    Terminal.show (true);
}

//
// Check build log & show build error (if it have)
//
export function CheckBuildLogAndJump2Error () {
    var LineCount  = 0;
    var ErrorCount = 0;
    if (!FileSys.existsSync (BuildLog)) {
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
    vscode.window.showTextDocument (vscode.Uri.file (BuildLog), options);
    vscode.window.showInformationMessage (' 🔍 Checking build log ......... ');
    //
    // If there have error, open the file and jump to the error line.
    //
    RLSys.createInterface ({ input: FileSys.createReadStream (BuildLog) }).on ('line', function(Line) {
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
    // Check pre-build command.
    //
    if (PreBuildCmd === "&") {
        vscode.window.showInformationMessage (' ❗️❗️ Please set [CAT.01_BuildCmdPreload] before you use this function.');
        return;
    } await Delay(1000);
    //
    // Check terminal environment.
    //
    if (!FileSys.existsSync(EnvCheck)) {
        FileSys.writeFileSync (StatusFile, "Checking environment");
        vscode.window.showInformationMessage (' 🔬 Check pre-build command can work or not.... ');
        SendBuildCommand2PY (Terminal, "("+ PreBuildCmd +"nmake -x)", WorkSpace, true, EnvCheck);
        //
        // Wait 5 sec to make sure the python command can indeed marge, and wait for "EnvCheck" file generate.
        // (If pre-build can do successful this part will only run once time.)
        //
        await Delay(5000);
        //do {/* Wait for EnvCheck create */} while (!FileSys.existsSync(EnvCheck));
    }
    await Delay(1000);
    let CheckFile = FileSys.readFileSync (EnvCheck, 'utf-8');
    await Delay(100);
    if (CheckFile.indexOf (NmakeCheck) === NOT_FOUND) {
        FileSys.unlink (EnvCheck,(_err)=>{});
        vscode.window.showInformationMessage (" ❗️❗️ Pre-build command error! \n Please help BIOS-Cat to check pre-build command too create environment~");
        return;
    } else if (!FileSys.existsSync (BuildFolder) && 1) {
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
    let ModuleName = FindModuleName (vscode.window.activeTextEditor?.document.fileName+"", FileName, ".inf", BuildFolder);
    if (ModuleName === "") {
        vscode.window.showInformationMessage (" ❗️❗️ Can\'t find [ "+FileName+" ] in \"inf\" file, please check it and rebuild again.");
        FileSys.writeFileSync (StatusFile, "0");
        return;
    }
    let MakeFilePath = SearchBuildFolder (BuildFolder, ModuleName);
    if (!MakeFilePath.length) {
        vscode.window.showInformationMessage (
            " ❗️❗️ Can\'t find [ "+ModuleName+" ] in Build folder, please unless full build once time or make sure this module will been build. 🏭 Like to Build now?",
            "Yes Sure!",
            "No Thanks.").
        then(function (Message) { if (Message === "Yes Sure!") {CreatEnvAndBuildCode();} });
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
    SendBuildCommand2PY (Terminal, ModuleBuildCmd, WorkSpace, true, "");
}

//
//  List tag or function in file, then jump to it.
//
export async function ListFunctionTag () {
    const Editor   = vscode.window.activeTextEditor;
    const FileName = Editor?.document.fileName.replace(/\\/g,"/")+"";
    let   TagArray:string[] = [];

    if (FileName.endsWith(".fdf") || FileName.endsWith(".dec") || FileName.endsWith(".dsc") ||
        FileName.endsWith(".inf")) {
        let Line = FileSys.readFileSync (FileName, 'utf-8').split ("\n");
        for (let i=0; i<Line.length; i++) {
            if ( Line[i].indexOf("[") !== NOT_FOUND &&
                 Line[i].indexOf("]") !== NOT_FOUND &&
                (Line[i].indexOf("#") === NOT_FOUND || Line[i].indexOf("#")>Line[i].indexOf("["))
            ){
                TagArray.push("Line:"+i+": "+Line[i].split("#")[0]);
            }
        }
    } else if (FileName.endsWith(".c") || FileName.endsWith(".asl") || FileName.endsWith(".ts") || FileName.endsWith(".js") ||
               FileName.endsWith(".ASL") || FileName.endsWith(".asi")) {
        let Line         = FileSys.readFileSync (FileName, 'utf-8').split ("\n");
        let FunctionName = "";
        let FunctionLine = 0;
        for (let i=0, Step=0, A=0, B=0; i<Line.length; i++) {
            //
            //  If there have "/*" in it, skip all of it until "*/".
            //
            if (Line[i].indexOf("/*") !== NOT_FOUND && Step < 0xFF) {
                if (Line[i].indexOf("*/") === NOT_FOUND) { Step += 0xFF; }
                continue;
            } else if (Line[i].indexOf("*/") !== NOT_FOUND && Step >= 0xFF) {
                Step -= 0xFF;
                continue;
            } else if (Step >= 0xFF) { continue; }
            //
            //  Filter comment & string & character.
            //
            if (Line[i].indexOf("//") !== NOT_FOUND) { Line[i] = Line[i].split("//")[0]; }
            if (Line[i].indexOf('"') !== NOT_FOUND) {
                for (let x=0, tmp=Line[i].split('"'); (tmp.length-1)===0, x<tmp.length; x++) {
                    if (!(x%2)) {
                        if (!x) { Line[i] = ""; }
                        Line[i] += tmp[x];
                    }
                }
            }
            if (Line[i].indexOf("'") !== NOT_FOUND) {
                for (let x=0, tmp=Line[i].split("'"); (tmp.length-1)===0, x<tmp.length; x++) {
                    if (!(x%2)) {
                        if (!x) { Line[i] = ""; }
                        Line[i] += tmp[x];
                    }
                }
            }
            //
            //  Start parsing.
            //
            if (Line[i].indexOf("(") !== NOT_FOUND) { A += Line[i].split("(").length-1;
                if (Step !== 2 && !B) {
                    if (FileName.endsWith(".c") || FileName.endsWith(".ts") || FileName.endsWith(".js") ) {
                        FunctionName = Line[i].split("(")[0].replace(/ /g,"") === ""? Line[i-1] : Line[i].split("(")[0];
                    } else if (FileName.endsWith(".asl") || FileName.endsWith(".ASL") || FileName.endsWith(".asi")) {
                        FunctionName = Line[i].split("{")[0].replace(/ /g,"") === ""? Line[i-1] : Line[i].split("{")[0];
                    }
                    FunctionLine = i;
                    Step = 1;
                }
            }
            if (Line[i].indexOf(")") !== NOT_FOUND) { A -= Line[i].split(")").length-1; }
            if (Line[i].indexOf("{") !== NOT_FOUND) { B += Line[i].split("{").length-1; Step = (Step===1)?2:Step; }
            if (Line[i].indexOf("}") !== NOT_FOUND) { B -= Line[i].split("}").length-1; }
            if (Step===2 && !B){ TagArray.push("Line:"+FunctionLine+":  "+FunctionName); Step = 0; }
        }
    } else {
        //
        // Not support file type.
        //
        return;
    }
    //
    // If can not fund any tag, do nothing.
    //
    if (TagArray === []) { return; }
    //
    // Fund tag and list it all.
    //
    TagArray.push(" 🐾 End of search 🐾");
    vscode.window.showQuickPick (
        TagArray,
        {canPickMany:false, placeHolder:' 👇 Jump to the tag :'})
    .then( async function (SelectMsg) {
        //
        // User enter esc or enter other not fund word, return.
        //
        if ( TagArray.indexOf(SelectMsg+"") === NOT_FOUND || SelectMsg === " 🐾 End of search 🐾") { return; }
        //
        // Get line and jump to it.
        //
        let LineIndex = parseInt(SelectMsg?.split(":")[1]+"", 10);
        const options = {
            selection: new vscode.Range (
                new vscode.Position (LineIndex, 0),
                new vscode.Position (LineIndex+1, 0)
            ),
            preview: true,
            viewColumn: vscode.ViewColumn.One
        };
        vscode.window.showTextDocument (vscode.Uri.file (FileName), options);
    });
}
