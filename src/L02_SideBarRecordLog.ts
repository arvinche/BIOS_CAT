/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode  from 'vscode';
import * as FileSys from 'fs';
import * as Path	from 'path';
//import * as SerialPort  from 'serialport';
import {
    //== Variable ==
      WorkSpace,
      NOT_FOUND,
    //== Function ==
      SendCommand2PY
} from './00_GeneralFunction';

const ModuleInfoPath      = WorkSpace + ".vscode/CatModuleInfo.bcat";
const CatLogFile          = WorkSpace + ".vscode/CatRecort.log";
const PeiDriver           = "Loading PEIM";
const DxeDriver           = "Loading driver";
const GetBaseAddress      = "Loading driver at ";
var   ModuleInfo:string[] = [];

//============= Local Function =============//
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
    let Line       = FileSys.readFileSync (LogFile, 'utf-8').split ("\n");
    var DriverGUID = "";
    for (let i=0, i2=0, Step=0; i<Line.length; i++) {
        //
        // Step 0 : find driver have been load or not.
        // Step 1 : get base address form log file.
        //
        if (Step) {
            if (Line[i].indexOf (GetBaseAddress) !== NOT_FOUND) {
                ModuleInfo[i2] += "/3"+Line[i].replace(GetBaseAddress, "").split(" ")[0];
                Step = 0;
                //console.log(ModuleInfo[i2]);
            }
        } else if (Line[i].indexOf (PeiDriver) !== NOT_FOUND && DriverGUID === "") {
            DriverGUID = ""+Line[i].split(" ").pop()?.replace("\r","");
        } else if (Line[i].indexOf (DxeDriver) !== NOT_FOUND && DriverGUID === "") {
            DriverGUID += ""+Line[i].split(" ").pop()?.replace("\r","");
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
//  Analyze Map file to find the code that where we hang.
//
function AnalyzeMapFile () { }


//============= External Function =============//
//
//  Search all inf file and record GUID and Module name.
//
export function RecordAllModuleGuidAndName (Root:string) {
    let Info:string[] = [];
    //
    // Check if we have already have info then read it, if not create one.
    //
    if (!FileSys.existsSync (ModuleInfoPath)) {
        function DeepFind (Root:string) {
            FileSys.readdirSync(Root).forEach ( function (item) {
                let FilePath = require('path').join (Root,item);
                if ( FileSys.statSync(FilePath).isDirectory() === true) {
                    //
                    //  Recursive to find out.
                    //
                    DeepFind (FilePath);
                } else if (FilePath.endsWith (".inf")) {
                    let TempString = "";
                    let Line       = FileSys.readFileSync (FilePath, 'utf-8').split ("\n");
                    for (let i=0; i<Line.length; i++) {
                        if (Line[i].indexOf ("BASE_NAME") !== NOT_FOUND) {
                            TempString = "!1"+Line[i].split(" ").pop()?.replace("\r","")+"~";
                        } else if (Line[i].indexOf ("FILE_GUID") !== NOT_FOUND) {
                            TempString += "!2"+Line[i].split(" ").pop()?.replace("\r","")+"~";
                        } else if (TempString.indexOf ("~!") !== NOT_FOUND) {
                            TempString = TempString.replace("~!","/").replace("!","").replace("~","");
                            Info.push(TempString);
                            break;
                        }
                    }
                }
            });
        }
        DeepFind (Root);
        ModuleInfo = Info;
        FileSys.writeFile (ModuleInfoPath, ModuleInfo.toString(), (err) => {});
    } else {
        ModuleInfo = FileSys.readFileSync (ModuleInfoPath, 'utf-8').split(",");
    }
    //AnalyzeLogFile();
}

export function StarOrStoptRecordLog () { }