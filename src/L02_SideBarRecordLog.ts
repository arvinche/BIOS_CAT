/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode  from 'vscode';
import * as FileSys from 'fs';
import * as Path	from 'path';
//import * as SerialPort  from 'serialport';
import {
    //== Variable ==
      WorkSpace,
      BuildFolder,
      NOT_FOUND,
    //== Function ==
      Delay
} from './00_GeneralFunction';

const ModuleInfoPath      = WorkSpace + ".vscode/CatModuleInfo.bcat";
const CatLogFile          = WorkSpace + ".vscode/CatRecort.log";
const PeiDriver           = "Loading PEIM ";
const DxeDriver           = "Loading driver ";
const GetPEIAddress       = "Loading PEIM at ";
const GetDxeAddress       = "Loading driver at ";
const ModuleSizeSumTag    = " Start ";
const FunctionAddrTag     = " f ";
var   ModuleInfo:string[] = [];

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
function AnalyzeLogFile () {
    let LogFile    = vscode.workspace.getConfiguration().get("CAT.05_LogFilePath") !== "" ?
                     vscode.workspace.getConfiguration().get("CAT.05_LogFilePath")+"" :
                     CatLogFile;
    //
    //  Check log file exists or not.
    //
    if (!FileSys.existsSync (LogFile)) {
        if (CatLogFile === LogFile) {
            vscode.window.showInformationMessage (" ❗️❗️ Cannot open log with default path, please set your log path in setting.");
        } else {
            vscode.window.showInformationMessage (" ❗️❗️ Cannot open log file ["+LogFile+"].");
        }
        return;
    }
    let Line       = FileSys.readFileSync (LogFile, 'utf-8').split ("\n");
    var DriverGUID = "";
    for (let i=0, i2=0, Step=0; i<Line.length; i++) {
        //
        // Step 0 : find driver have been load or not.
        // Step 1 : get base address form log file.
        //
        if (Step) {
            if (Line[i].indexOf (GetPEIAddress) !== NOT_FOUND || Line[i].indexOf (GetDxeAddress) !== NOT_FOUND) {
                let TmpStr = "/30x" + parseInt( Line[i].replace(GetPEIAddress, "").replace(GetDxeAddress, "").split(" ")[0].replace("0x",""),16).toString(16);
                if (ModuleInfo[i2].indexOf(TmpStr) === NOT_FOUND) {
                    ModuleInfo[i2] += TmpStr;
                } Step = 0;
            }
        } else if (Line[i].indexOf (PeiDriver) !== NOT_FOUND && DriverGUID === "") {
            DriverGUID = ""+Line[i].split(" ").pop()?.replace("\r","").replace("\n","").toUpperCase();
        } else if (Line[i].indexOf (DxeDriver) !== NOT_FOUND && DriverGUID === "") {
            DriverGUID += ""+Line[i].split(" ").pop()?.replace("\r","").replace("\n","").toUpperCase();
        }
        if (!Step && DriverGUID !== "") {
            for (i2=0; i2<ModuleInfo.length; i2++) {
                if (ModuleInfo[i2].indexOf(DriverGUID) !== NOT_FOUND) {
                    Step = 1;
                    break;
                }
            } DriverGUID = "";
        }
    }
}

//
//  Analyze Map file in build folder and try to get actual memory location.
//
//  Step 0 : Check this module have map file or not.
//  Step 1 : Get module full size.
//  Step 2 : Get All function relative address in this module.
//
async function AnalyzeMapFile () { 
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
                        // Step 2. Get all function relative address.
                        //
                        TempArray       = Line[i].replace(/\s+/g, ' ').split(" ");
                        TempString      = "/5"+TempArray[2]+"|0x"+parseInt(TempArray[3],16).toString(16);
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
    vscode.window.showInformationMessage (" 🔍 Scan work space to gen Memroy map Info.");
    await Delay(100);
    DeepFind (BuildFolder);
    FileSys.writeFile (ModuleInfoPath+"_", ModuleInfo.toString(), (err) => {});
    vscode.window.showInformationMessage (" 👍 Gen MAP Done.");
}


//============= External Function =============//
//
//  Search all inf file and record GUID and Module name.
//
//  Flag 0 : If ModuleInfoPath exsts, use it otherwise scan work space then gen it.
//       1 : Even ModuleInfoPath exsts, still scan work space and gen it.
//
export async function RecordAllModuleGuidAndName (Flag:number) {
    //
    // Check if we have already have info then read it, if not create one.
    //
    if (!FileSys.existsSync (ModuleInfoPath) || Flag) {
        let Info:string[] = [];
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
                    let TempString = "";
                    let Line       = FileSys.readFileSync (FilePath, 'utf-8').split ("\n");
                    for (let i=0; i<Line.length; i++) {
                        if (Line[i].indexOf ("BASE_NAME") !== NOT_FOUND) {
                            TempString = "!1"+Line[i].split(" ").pop()?.replace("\r","").replace("\n","")+"~";
                        } else if (Line[i].indexOf ("FILE_GUID") !== NOT_FOUND) {
                            TempString += "!2"+Line[i].split(" ").pop()?.replace("\r","").replace("\n","").toUpperCase()+"~";
                        } else if (TempString.indexOf ("~!") !== NOT_FOUND) {
                            TempString = TempString.replace("~!","/").replace("!","").replace("~","");
                            if (Info.indexOf(TempString) === NOT_FOUND) {
                                Info.push(TempString);
                            } break;
                        }
                    }
                }
            });
        }
        //
        // Real entry of this function to call recursive.
        //
        vscode.window.showInformationMessage (" 🔍 Scan work space to gen Module Info.");
        FileSys.unlink (ModuleInfoPath,(_err)=>{});
        await Delay(1000);
        DeepFind (WorkSpace);
        ModuleInfo = Info;
        FileSys.writeFile (ModuleInfoPath, ModuleInfo.toString(), (err) => {});
        vscode.window.showInformationMessage (" 👍 Gen Infomation Done.");
    } else {
        ModuleInfo = FileSys.readFileSync (ModuleInfoPath, 'utf-8').split(",");
        vscode.window.showInformationMessage (" 👍 Get Module info success.");
    }
}

//
//  Try to analyze the log and map file then jump to error.
//
export function AnalyzeAndJumptoError () {
    //
    //  Analyze Log file to get module base address.
    //
    AnalyzeLogFile ();
    //
    //  Analyze Map file and try to find code position.
    //
    AnalyzeMapFile ();
}

//
// To-do 
//
export function StarOrStoptRecordLog () { }