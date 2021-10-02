/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode  from 'vscode';
import * as FileSys from 'fs';
import * as Path    from 'path';
//import * as SerialPort  from 'serialport';
import {
    //== Variable ==
      WorkSpace,
      BuildFolder,
      NOT_FOUND,
      CompileIS,
    //== Function ==
      Delay
} from './00_GeneralFunction';

const ModuleInfoPath      = WorkSpace + ".vscode/CatModuleInfo.bcat";
const GuidInfoPath        = WorkSpace + ".vscode/CatGuidInfo.bcat";
const CatLogFile          = WorkSpace + ".vscode/CatRecord.log";
const PeiDriver           = "Loading PEIM ";
const DxeDriver           = "Loading driver ";
const GetPEIAddress       = "Loading PEIM at ";
const GetDxeAddress       = "Loading driver at ";
const GetProtocolAddr     = "InstallProtocolInterface: ";
const ModuleSizeSumTag    = " Start ";
const FunctionAddrTag     = " f ";
const GuidDataBase        = "Guid.xref";
const Decoder             = 'base64';
var   SearchString        = "";
var   Filter_X            = true;
var   TreeL02:any         = null;
var   ModuleInfo:string[] = [];
var   GuidInfo:string[]   = [];

//============= Local Function =============//
//
//  Get your PC's serialport.
//
function GetEnableSerialport () {

    let ProductId = [];

    // SerialPort.list().then( function(Ports) {
    //     //
    //     // Scan all port that may be available.
    //     //
    //     for (let i=0; i<Ports.length; i++) {
    //         //
    //         // Check OS is Windows or Linux.
    //         //
    //         if (Ports[i].productId) {
    //             ProductId = Ports[i].productId;
    //         } else if (Ports[i].pnpId) {
    //             try {
    //                 let PortInfo = (/PID_\d*/.exec(Ports[i].pnpId+""));
    //                 if (PortInfo !== null) {
    //                     ProductId.push ('0x'+PortInfo[0].substr(4));
    //                 }
    //             } catch (err) { }
    //         } else {
    //             vscode.window.showInformationMessage (" ❗️❗️ There have not available serial port .... ");
    //         }
    //     }
    // });
}

//
//  Analyze log file and find all module base address.
//
function AnalyzeLogFile ():number {
    let LogFile    = vscode.workspace.getConfiguration().get("CAT.02_LogFilePath") !== "" ?
                     vscode.workspace.getConfiguration().get("CAT.02_LogFilePath")+"" :
                     CatLogFile;
    //
    //  Check log file exists or not.
    //
    if (!FileSys.existsSync (LogFile)) {
        if (CatLogFile === LogFile) {
            vscode.window.showInformationMessage (
                " ❗️❗️ Cannot open log with default path. Do you want to gave your one path?",
                'Yes I do !!',
                'No Thanks ~')
            .then (function (Select) { if (Select === 'Yes I do !!') {
                vscode.window.showInputBox({
                    ignoreFocusOut:true,
                    placeHolder:' 👀 Please input your log file path for BIOS-CAT to analyze.'})
                .then (function (Message) {
                    if (Message) {
                        vscode.workspace.getConfiguration().update('CAT.02_LogFilePath', Message, true);
                        AnalyzeAndGenTreeMap();
                    }
                });
            }});
        } else {
            vscode.window.showInformationMessage (" ❗️❗️ Cannot open log file with path ["+LogFile+"] please modify in extension setting.");
        } return 1;
    }
    let Line       = FileSys.readFileSync (LogFile, 'utf-8').split ("\n");
    var DriverGUID = "";
    for (let i=0, i2=0, Step=0, TmpStr=""; i<Line.length; i++) {
        //
        // Step 0 : find driver have been load or not.
        // Step 1 : get base address from log file.
        //
        if (Step) {
            if (Line[i].indexOf (GetPEIAddress) !== NOT_FOUND || Line[i].indexOf (GetDxeAddress) !== NOT_FOUND) {
                TmpStr = "/30x" + parseInt( Line[i].replace(GetPEIAddress, "").replace(GetDxeAddress, "").split(" ")[0].replace("0x",""),16).toString(16);
                if (ModuleInfo[i2].indexOf(TmpStr) === NOT_FOUND) {
                    ModuleInfo[i2] += TmpStr;
                } Step = 0;
            }
        } else if (Line[i].indexOf (PeiDriver) !== NOT_FOUND && DriverGUID === "") {
            DriverGUID = ""+Line[i].split(" ").pop()?.replace("\r","").replace("\n","").toUpperCase();
        } else if (Line[i].indexOf (DxeDriver) !== NOT_FOUND && DriverGUID === "") {
            DriverGUID += ""+Line[i].split(" ").pop()?.replace("\r","").replace("\n","").toUpperCase();
        }
        //
        // If driver have install protocol, get protocol Address.
        //
        if (i2 && Line[i].indexOf (GetProtocolAddr) !== NOT_FOUND) {
            let TempArray = Line[i].replace(GetProtocolAddr, "").replace("\r","").replace("\n","").split(" ");
            let GuidName = "Can get Guid Database [Guid.xref]";
            let X = 0;
            if (GuidInfo.length) {
                for (X=0; X<GuidInfo.length; X++) {
                    if (GuidInfo[X].indexOf(TempArray[0]) !== NOT_FOUND) { break; }
                }
                GuidName = X>=GuidInfo.length? "⚠ Not Find": GuidInfo[X].split(" ")[1].replace("\r","").replace("\n","");
            }
            TmpStr = "/P"+GuidName+"|"+TempArray[0]+"|"+TempArray[1];
            ModuleInfo[i2] += TmpStr;
        }
        if (!Step && DriverGUID !== "") {
            for (i2=0; i2<ModuleInfo.length; i2++) {
                if (ModuleInfo[i2].indexOf(DriverGUID) !== NOT_FOUND) {
                    Step = 1;
                    break;
                }
            } i2 = i2>=ModuleInfo.length?0:i2; DriverGUID = "";
        }
    } return 0;
}

//vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
//
//  Below 3 function is function to analyze Map file for each compile 
//  in build folder and try to get actual memory location.
//

//  [Microsoft - visual studio.]
//  Step 0 : Check this module have map file or not.
//  Step 1 : Get module full size.
//  Step 2 : Get All function relative address in this module.
//
async function AnalyzeMapFile_VS () {
    //
    // Recursive to find out.
    //
    function DeepFind (Root:string) {
        FileSys.readdirSync(Root).forEach ( function (item) {
            let FilePath = require('path').join (Root,item);
            let i2 = 0;
            if ( FileSys.statSync(FilePath).isDirectory() === true) {
                //
                //  Find deep and deeper!!
                //
                DeepFind (FilePath);
            } else if (FilePath.endsWith (".map")) {
                let TempArray  = [];
                let TempString = "";
                let Line       = FileSys.readFileSync (FilePath, 'utf-8').split ("\n");
                for (let i=0,  Step=0; i<Line.length; i++) {
                    if (!i) {
                        //
                        // Step 0. Check this module can search in build folder or not.
                        //         If not, it may be a binary.
                        //
                        Line[0] = Line[0].replace(" ","").replace("\n","").replace("\r","");
                        for (i2=0; i2<ModuleInfo.length; i2++) {
                            if (ModuleInfo[i2].indexOf(Line[0]) !== NOT_FOUND) {
                                break;
                            }
                        } if (i2 >= ModuleInfo.length) { return; }
                    } else if (Step === 1 || Line[i].indexOf(ModuleSizeSumTag) !== NOT_FOUND) {
                        //
                        // Step 1. Add all tag size to sum module size.
                        //
                        if (Step === 0) {
                            TempString = "0";
                            Step = 1;
                        } else if (Line[i][0] === "\n" || Line[i][0] === "\r") {
                            //
                            // Get module size done, Go to step 2.
                            //
                            Step = 2;
                            TempString = "/40x"+parseInt(TempString).toString(16).toUpperCase();
                            if (ModuleInfo[i2].indexOf(TempString) === NOT_FOUND) {
                                ModuleInfo[i2] += TempString;
                            }
                        } else {
                            //
                            // Add all tag size.
                            //
                            TempArray  = Line[i].split(":")[1].split(" ");
                            TempString = (parseInt(TempArray[1].replace("H",""),16)
                                         -parseInt(TempArray[0],16)
                                         +parseInt(TempString) ).toString();
                        }
                    } else if (Step === 2 && Line[i].indexOf(FunctionAddrTag) !== NOT_FOUND) {
                        //
                        // Step 2. Get all function relative address & reference.
                        //
                        TempArray       = Line[i].replace(/\s+/g, ' ').split(" ");
                        TempString      = "/5"+TempArray[2]+"|0x"
                                              +parseInt(TempArray[3],16).toString(16)+"|"
                                              +TempArray[5].replace(".obj","");
                        if (ModuleInfo[i2].indexOf(TempString) === NOT_FOUND) {
                            ModuleInfo[i2] += TempString;
                        }
                    }
                }
            }
        });
    }
    //
    // Real entry of this function to call recursive.
    //
    await Delay(100);
    DeepFind (BuildFolder);
}

//  [GNU Collection - GCC.]
async function AnalyzeMapFile_GCC () {}

//  [LLVM(Low Level Virtual Machine) - Clang]
async function AnalyzeMapFile_CLANG () {}

//
//  Try to analyze the log and map file then jump to error.
//
async function AnalyzeAndGenTreeMap () {
    //
    // Check all need file exists or not.
    //
    if (!FileSys.existsSync (ModuleInfoPath)) {
        vscode.window.showInformationMessage (' ❗️❗️ You don\' have Module info please build once time to gen mep file.');
        return;
    }
    await Delay(1000);
    //
    //  Analyze Log file to get module base address.
    //
    if (AnalyzeLogFile()){ return; }
    //
    //  Analyze Map file and try to find code position.
    //
    vscode.window.showInformationMessage (" 🔍 Scan work space to gen Memory map Info.");
    switch (CompileIS) {
        case "1":
            await AnalyzeMapFile_VS (); break;
        case "2":
            await AnalyzeMapFile_GCC (); break;
        case "3":
            await AnalyzeMapFile_CLANG (); break;
        default:
            vscode.window.showInformationMessage (" 👎 Some strange parameters has ran in.");
            return;
    }
    FileSys.writeFile (ModuleInfoPath, Buffer.from(ModuleInfo.toString()).toString(Decoder), (err) => {});
    vscode.window.showInformationMessage (" 👍 Gen MAP Done.");
    await Delay(100);
}


//============= External Function =============//
//
// Class for memory map user interface.
//
export class MemoryDependenciesProvider implements vscode.TreeDataProvider<MemoryDependency> {

    constructor (private WorkspaceRoot: string) {}
    //
    //  Refresh area.
    //
    private _onDidChangeTreeData: vscode.EventEmitter<MemoryDependency | undefined | null | void> = new vscode.EventEmitter<MemoryDependency | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MemoryDependency | undefined | null | void> = this._onDidChangeTreeData.event;
    Refresh(): void { this._onDidChangeTreeData.fire(); }
    //
    // Check Path function.
    //
    private PathExists (Path: string): boolean {
        try { FileSys.accessSync (Path);
        } catch (_err) { return false;
        } return true;
    }

    getTreeItem (Element: MemoryDependency): vscode.TreeItem { return Element; }

    getChildren (Element: MemoryDependency): Thenable<MemoryDependency[]> {
        if (!this.WorkspaceRoot) {
            vscode.window.showInformationMessage(' ❗️❗️ Please assign a workspace first.');
            return Promise.resolve([]);
        }
        //
        // Check book mark file.
        //
        if (this.PathExists (ModuleInfoPath)) {
            return Promise.resolve (this.getMemoryInfoTree (Element));
        } else {
            vscode.window.showInformationMessage (' ❗️❗️ You don\' have Module info please build once time to gen mep file.');
            return Promise.resolve ([]);
        }
    }

    private getMemoryInfoTree (Element: MemoryDependency): MemoryDependency[] {
        let Content = [];
        let GetModuleInfo = Buffer.from(FileSys.readFileSync (ModuleInfoPath, 'utf-8'),Decoder).toString().split(",");
        for (let i=0; i<GetModuleInfo.length; i++) {
            //
            // If it's a Lib, skip it, won't show in tree.
            //
            if (GetModuleInfo[i].indexOf("/L") !== NOT_FOUND) { continue; }
            //
            // It's a driver, generate into tree.
            //
            let ModuleElement = GetModuleInfo[i].split("/");
            if (SearchString !== "") {
                //
                // If user have input search string, filtrate it !
                //
                let CmpString = GetModuleInfo[i].toUpperCase();
                if (CmpString.indexOf(SearchString.toUpperCase()) === NOT_FOUND ) {
                    let X = parseInt(SearchString.toUpperCase(), 16);
                    //
                    // If user input an address, check it's in any driver range or not.
                    //
                    if (!isNaN(X)) {
                        let MB=0, MS=0;
                        for (let i2=0; i2<ModuleElement.length; i2++) {
                            if (ModuleElement[i2][0] === "3") {
                                MB = parseInt(ModuleElement[i2].replace("3","").toUpperCase(),16);
                            } else if (ModuleElement[i2][0] === "4") {
                                MS = parseInt(ModuleElement[i2].replace("4","").toUpperCase(),16);
                            }
                        } if (X<MB || X>(MB+MS)) { continue; }
                    } else { continue; }
                }
            }
            if (Element) {
                if (i === Element.driverIndex && GetModuleInfo[i].indexOf("/3") !== NOT_FOUND) {
                    let Mname = "", FName = "", FOffset = "", FReference = "";
                    for (let i2=0; i2<ModuleElement.length; i2++) {
                        if (ModuleElement[i2][0] === "1") {
                            Mname = ModuleElement[i2].replace("1","");
                        } else if (ModuleElement[i2][0] === "P") {
                            let TmpStr = ModuleElement[i2].replace("P","").split("|");
                            FName      = "🧬 "+TmpStr[0];
                            FReference = TmpStr[1];
                            FOffset    = "0x"+TmpStr[2];
                            Content.push(new MemoryDependency (
                                i, FName, FReference, FOffset, "",
                                vscode.TreeItemCollapsibleState.None
                            ));
                        } else if (ModuleElement[i2][0] === "5") {
                            let TmpStr = ModuleElement[i2].replace("5","").split("|");
                            FName      = TmpStr[0];
                            FName      = FName[0]+FName[1] === "__" ? FName.replace("__","🌀🌀"):
                                         FName[0] === "_" ? FName.replace("_","🌀"):
                                         FName;
                            FOffset    = TmpStr[1];
                            FReference = TmpStr[2].indexOf(Mname) === NOT_FOUND? TmpStr[2] : "";
                            Content.push(new MemoryDependency (
                                i, FName, FReference, FOffset, "",
                                vscode.TreeItemCollapsibleState.None
                            ));
                        }
                    }
                }
            } else {
                let MName = "", MGuid = "", MSize = "", MBaseAddr = [];
                for (let i2=0, i3=0; i2<ModuleElement.length; i2++) {
                    if (ModuleElement[i2][0] === "1") {
                        MName = ModuleElement[i2].replace("1","");
                    } else if (ModuleElement[i2][0] === "2") {
                        MGuid = ModuleElement[i2].replace("2","");
                    } else if (ModuleElement[i2][0] === "3") {
                        MBaseAddr.push(++i3+" ▻ "+ModuleElement[i2].replace("3","").toUpperCase());
                    } else if (ModuleElement[i2][0] === "4") {
                        MSize = ModuleElement[i2].replace("4","");
                    } 
                }
                if ( MBaseAddr.length !== 0 || !Filter_X) {
                    Content.push(new MemoryDependency (
                        i, MName, MGuid,
                        (MBaseAddr.length!==0)?"    "+MBaseAddr.toString().replace(/,/g,"\n    "):"",
                        MSize,
                        vscode.TreeItemCollapsibleState.Collapsed
                    ));
                }
            }
        }
        return Content;
    }
}

export class MemoryDependency extends vscode.TreeItem {
    constructor (
        public driverIndex: Number,
        public readonly tagName: string,
        public driverGuid: string,
        public baseAddr: string,
        public driverSize: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super (tagName, collapsibleState);
        this.tooltip = collapsibleState ? 
                       "Guid : 🔰"+`${this.driverGuid}`+"\n💠BaseAddress :\n"+this.baseAddr :
                       driverGuid !== ""?
                       "♻ Reference : "+driverGuid.replace(":"," : "):
                       "📍 It's a local function" ;
        this.description = collapsibleState ?
                           (this.baseAddr !== "" ?    // No Address mean not been build.
                             (this.driverSize !== ""? // No Size mean it may be a binary file.
                               "✅ Driver Size: "+ this.driverSize:
                               "🔒 This may be a binary ~"):
                             "❌Can't Get Addr from log."):
                           (this.tagName.indexOf("🧬") !== NOT_FOUND?
                            "Install at : "+this.baseAddr:
                            "Offset : "+this.baseAddr);
        this.iconPath = (this.tagName.indexOf("🧬") !== NOT_FOUND) || (this.tagName.indexOf("🌀") !== NOT_FOUND) ?
        "" : collapsibleState ? {
            light: Path.join (__filename, '../..', './Images/L02_GroupRoot.png'),
            dark: Path.join (__filename, '../..', './Images/L02_GroupRoot.png')
        }:{
            light: Path.join (__filename, '../..', './Images/00_CatIcon.png'),
            dark: Path.join (__filename, '../..', './Images/00_CatIcon.png')
        };
    }
    contextValue = (this.collapsibleState || this.tagName.indexOf("🧬") !== NOT_FOUND)?
                   (this.tagName.indexOf("⚠") === NOT_FOUND?
                   'Mepn_AGN':"Mepn_AG"):
                   'Mepn_N';
}

//
//  Search all inf file and record GUID and Module name.
//
//  Flag 0 : If ModuleInfoPath exist, use it otherwise scan work space then generate it.
//       1 : Even ModuleInfoPath exist, still scan work space and generate it.
//
export async function RecordAllModuleGuidAndName (Flag:number) {
    //
    // If user turn off the feature, return at entry.
    //
    if (!vscode.workspace.getConfiguration().get("CAT.02_AnalyzeMemoryFunction")){ return; }
    TreeL02 = (TreeL02 === null)?new MemoryDependenciesProvider(WorkSpace) : TreeL02;
    //
    // Check if we have already have info then read it, if not create one.
    //
    if (!FileSys.existsSync (ModuleInfoPath) || !FileSys.existsSync (GuidInfoPath) || Flag) {
        //
        // Recursive to find out.
        //
        function DeepFind (Root:string) {
            FileSys.readdirSync(Root).forEach ( function (item) {
                let FilePath = require('path').join (Root,item);
                if ( FileSys.statSync(FilePath).isDirectory() === true) {
                    //
                    // Find deep and deeper!!
                    //
                    DeepFind (FilePath);
                } else if (FilePath.endsWith (".inf")) {
                    let TempString = FileSys.readFileSync (FilePath, 'utf-8');
                    let Line       = TempString.split ("\n");
                    TempString     = TempString.indexOf("LIBRARY_CLASS") === NOT_FOUND? "" : "/L";
                    for (let i=0; i<Line.length; i++) {
                        if (Line[i].indexOf ("BASE_NAME") !== NOT_FOUND) {
                            TempString += "!1"+Line[i].split(" ").pop()?.replace("\r","").replace("\n","")+"~";
                        } else if (Line[i].indexOf ("FILE_GUID") !== NOT_FOUND) {
                            TempString += "!2"+Line[i].split(" ").pop()?.replace("\r","").replace("\n","").toUpperCase()+"~";
                        } else if (TempString.indexOf ("~!") !== NOT_FOUND) {
                            TempString = TempString.replace("~!","/").replace("!","").replace("~","");
                            if (ModuleInfo.indexOf(TempString) === NOT_FOUND) {
                                ModuleInfo.push(TempString);
                            } break;
                        }
                    }
                } else if (FilePath.endsWith (GuidDataBase)) {
                    if (!GuidInfo.length) {
                        GuidInfo = FileSys.readFileSync (FilePath, 'utf-8').split ("\n");
                    } else {
                        let Line = FileSys.readFileSync (FilePath, 'utf-8').split ("\n");
                        for (let i=0; i<Line.length; i++) {
                            if (GuidInfo.indexOf(Line[i]) !== NOT_FOUND) {
                                GuidInfo.push(Line[i]);
                            }
                        }
                    }
                }
            });
        }
        //
        // Real entry of this function to call recursive.
        //
        if ( !FileSys.existsSync (BuildFolder) ) {
            vscode.window.showInformationMessage (" 💦 Can't find Build folder to gen memory map tree.");
            return;
        }
        ModuleInfo = [];
        GuidInfo   = [];
        vscode.window.showInformationMessage (" 🔍 Scan work space to gen Module Info.");
        FileSys.unlink (ModuleInfoPath,(_err)=>{});
        FileSys.unlink (GuidInfoPath,(_err)=>{});
        await Delay(1000);
        DeepFind (WorkSpace);
        FileSys.writeFile (ModuleInfoPath, Buffer.from(ModuleInfo.toString()).toString(Decoder), (err) => {});
        FileSys.writeFile (GuidInfoPath, Buffer.from(GuidInfo.toString().replace(/\r/g,"")).toString(Decoder), (err) => {});
        vscode.window.showInformationMessage (" 👍 Gen Information Done.");
    } else {
        ModuleInfo = Buffer.from(FileSys.readFileSync (ModuleInfoPath, 'utf-8'),Decoder).toString().split(",");
        GuidInfo   = Buffer.from(FileSys.readFileSync (GuidInfoPath, 'utf-8'),Decoder).toString().split(",");
        vscode.window.showInformationMessage (" 👍 Get Module info from [Previous Existing] database success.");
    }
    //
    // Create data tree and wait for update.
    //
    SearchString = "";
    vscode.window.registerTreeDataProvider ('L02-2', TreeL02);
    await AnalyzeAndGenTreeMap();
    TreeL02.Refresh();
}

//
// Show input box to let user can search module or address.
//
export function SearchModuleOrAddr () {
    //
    // If user turn off the feature, do nothing.
    //
    if (!vscode.workspace.getConfiguration().get("CAT.02_AnalyzeMemoryFunction")){ return; }
    //
    // Show in put box and let user enter.
    //
    vscode.window.showInputBox({
        ignoreFocusOut:true,
        placeHolder:' 🔍 Please input string to search Driver / Function / Memory address 🔍'})
    .then (function (Message) {
        if (Message) { Filter_X = true; SearchString = Message; TreeL02.Refresh(); }
    });
}

//
// Available filter or not.
//
export function AvailableFilter () { Filter_X = !Filter_X; TreeL02.Refresh(); }

//
// Refresh L02-2 block area.
//
export function RefreshL02_2 () { SearchString = ""; TreeL02.Refresh(); }

//
// Let user can copy message that they need.
//  1 => Get name of select item.
//  2 => Get guid of select item.
//  3 => Get Address of select item.
//
export function GetAndCopyModuleInfo (Item: MemoryDependency, Type:number) {
    var Info = "";
    if (Type === 1) {
        require("child_process").exec('clip').stdin.end (Item.tagName.valueOf().replace("🧬 ",""));
        Info = "Name";
    } else if  (Type === 2) {
        require("child_process").exec('clip').stdin.end (Item.driverGuid.valueOf());
        Info = "Guid";
    } else {
        require("child_process").exec('clip').stdin.end (Item.baseAddr.valueOf().replace(/ ▻ /g,":"));
        Info = "Address";
    }
    vscode.window.showInformationMessage (" ✔ Copy [ "+Info+" ] Success~ Use Ctrl+P to use it.");
}

//
// To-do 
//
export function StarOrStoptRecordLog () { }