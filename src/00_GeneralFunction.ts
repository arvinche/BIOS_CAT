/* eslint-disable @typescript-eslint/naming-convention */
import * as FileSys from 'fs';
import * as vscode  from 'vscode';

//=============== Global variable area ===============
//
export const NOT_FOUND   = -1;
//
// True  : Os environment is Mocrosoft windows.
// False : Os environment is Linux system.
//
export const IsWindows   = true;
export const WorkSpace   = (vscode.workspace.rootPath + "/").replace(/\\/g,"/");
export const BuildFolder = WorkSpace + "Build";
export const EnvCheck    = WorkSpace + ".vscode/CatEnvCheck.bcat";
export const StatusFile  = WorkSpace + ".vscode/CatStatus.bcat";
export const GitFile     = WorkSpace + ".vscode/CatGit.bcat";
//
// 1. Microsoft - visual studio.
// 2. GNU Collection - GCC.
// 3. LLVM(Low Level Virtual Machine) - Clang.
//
export const CompileIS   = (vscode.workspace.getConfiguration().get("CAT.00_Compile")+"")[0];
//
// Reserved this variable to support multiple work space.
//
export let   WsIndex     = 0;

//=============== Delay function area ===============
//
// Delay function used to ensure execute order.
//
export function Delay (Sec :number){
  return new Promise (function (Resolve,Reject){
   setTimeout (Resolve,Sec);
  });
};


//=============== Clear EnvCheck function area ===============
//
//  Clear "EnvCheck" Function. return "" can make this function
//  use "+" to add into string too execute it.
//
export function DelEnvCheck():string {FileSys.unlink (EnvCheck,(_err)=>{}); return "";}


//=============== Init BIOS-CAT area ===============
//
//  This area will clear StatusFile and make sure
//  BIOS-CAT can return to default when user open
//  vscode. (Only execution when user enter vscode)
//
//
//  A.BIOS-CAT status define (but now write directly in the "StatusFile"):
//    0 : Waiting for instructions.
//    1 : Building code.
//    2 : Clean up work space.
//    3 : Building single module.
//
FileSys.writeFile (StatusFile, "0", 'utf-8', (_err) =>{});
//
// B. Clear "EnvCheck" to make sure BIOS-CAT will re
//    check the workspace environment.
//
FileSys.unlink (EnvCheck,(_err)=>{});


//=============== Send command to python area ===============
//
// This area will use python to send command line.
//
const OurPythonPath    = WorkSpace + ".vscode/RunCommand.py";
const RemovePY         = !IsWindows? "del /q/f \""+OurPythonPath+"\"" :
                                     "del /q/f \""+OurPythonPath.replace(/\//g,"\\")+"\"";
const CheckPythonPath  = !IsWindows? "/usr/bin/python":
                                     "C:\\Windows\\py.exe";
const RunCommandPython = `
#######       ###        ########
##           ## ##          ##
##     Cat python for cmd   ##
##         ##     ##        ##
#######   ##       ##       ##

import os, sys, argparse, subprocess

__prog__        = 'RunCommand.py'
__version__     = '%s Version %s' % (__prog__, '0.1')
__copyright__   = 'Copyright (c) 2021, CG. All rights reserved.'
__description__ = 'The script is used run command.'

def GetArg ():
    #
    # Prepare argument parser
    #
    parser = argparse.ArgumentParser()
    parser.add_argument ('-V', '-v', '--Version', action = 'version', version = __version__ )
    parser.add_argument ('-W', '-w' '--Workspace', dest = 'Workspace', help = 'Type your workspace')
    parser.add_argument ('-C', '-c' '--Command', required = True, dest = 'Command', help = 'Type command you want to run')
    parser.add_argument ('-O', '-o' '--OutputPath', dest = 'OutputPath', help = 'Type output file path',)
    parser.add_argument ('-S', '-s' '--Stdout', dest = 'IsStdout', help = 'Output messages in terminal', action="store_true")

    args = parser.parse_args()
    return args

def RunCommand (Command, Workspace = None, OutputPath = None, IsStdout = False):
  if Workspace == None:
    RunInPath = os.path.abspath (__file__)
    Workspace = RunInPath[:RunInPath.find (".vscode")]
  os.chdir (Workspace)
  LogFile = None
  if OutputPath != None:
    os.makedirs(os.path.dirname(OutputPath), exist_ok=True)
    LogFile = open(OutputPath, 'wb')

  P = subprocess.Popen (args=Command.split (' '), stdin=sys.stdin, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True, bufsize=-1, universal_newlines=True)
  for Line in P.stdout:
    Line = bytes(Line, 'utf-8')
    if (IsStdout):
      sys.stdout.buffer.write(Line)
    if (LogFile != None):
      LogFile.write(Line)
    sys.stdout.flush()
  P.wait()
  if (LogFile != None):
    LogFile.close ()
  return P.returncode

def main ():
  Args = GetArg ()
  return RunCommand (Args.Command, Args.Workspace, Args.OutputPath, Args.IsStdout)

if __name__ == '__main__':
  exit(main ())`;

//
//  Check python environment & generate RunCommand.py.
//
function GenRunCommand (WorkSpace:string) {
  //
  // Check python have in our environment or not.
  //
  if (!FileSys.existsSync (CheckPythonPath)) { return ""; }
  //
  // Create Python file for execution.
  //
  if (!FileSys.existsSync (OurPythonPath)) {
    FileSys.writeFile (OurPythonPath, RunCommandPython, (err) => {});
  }
  return WorkSpace + ".vscode/RunCommand.py";
}

//
// The entry of send "Build related" command with python.
//
export async function SendBuildCommand2PY (
  Terminal   :vscode.Terminal,
  Command    :string,  // The command that we need pass through python to execution.
  WorkSpace  :string,  // Current work space path.
  IsStdout   :boolean, // Can out put to vscode internal terminal or not.
  OutputPath :string,  // The path that can be out put.
) {
  let   GetConfig    = vscode.workspace.getConfiguration();
  let   BuildPath    = (GetConfig.get("CAT.00_BuildPath")+"").replace(/\\/g, "/").indexOf (":/") === -1?
                       WorkSpace + GetConfig.get("CAT.00_BuildPath") : GetConfig.get("CAT.00_BuildPath")+"";
  if (!FileSys.existsSync(BuildPath) && !FileSys.existsSync(WorkSpace+BuildPath)) {
    vscode.window.showInformationMessage (" ❗️❗️ File path  ["+BuildPath+"]  seems not exist.");
    return;
  }
  //  Change encode into 437 :: cmd /C to compatible between MS cmd and MS Powershell.
  await Delay(1000);
  Terminal.sendText ("cmd /C chcp 437");
  let   GlobalCmd_S  =  "cd " + BuildPath + " & ";
  const GlobalCmd_E  =  "& ("+RemovePY+" & echo 0 > "+StatusFile+")";
  let   PythonCmd    =  GenRunCommand (WorkSpace);
  if (PythonCmd === "") {
    vscode.window.showInformationMessage (" ❗️❗️ Please install python 3.X in your system.");
    return;
  }

  //
  // Add delay to make sure command can get indeed and marge into "PythonCmd".
  //
  await Delay(1000);
  PythonCmd = "(py -3 \"" + PythonCmd + "\" " + "-C \"" + GlobalCmd_S + Command + "\" ";
  PythonCmd += IsStdout? "-S " : "";
  PythonCmd += (OutputPath !== '') ? "-O \"" + OutputPath + "\")" : ")";
  //
  // Send command into Terminal.
  //
  Terminal.sendText (PythonCmd + GlobalCmd_E);
}

//
// The entry of send command with python.
//
export async function SendCommand2PY (
  Terminal   :vscode.Terminal,
  Command    :string,  // The command that we need pass through python to execution.
  IsStdout   :boolean, // Can out put to vscode internal terminal or not.
  OutputPath :string,  // The path that can be out put.
) {

  //  Change encode into 437 :: cmd /C to compatible between MS cmd and MS Powershell.
  await Delay(1000);
  Terminal.sendText ("cmd /C chcp 437");
  let PythonCmd = GenRunCommand (WorkSpace);
  if (PythonCmd === "") {
    vscode.window.showInformationMessage (" ❗️❗️ Please install python 3.X in your system.");
    return;
  }

  //
  // Add delay to make sure command can get indeed and marge into "PythonCmd".
  //
  await Delay(1000);
  PythonCmd = "(py -3 \"" + PythonCmd + "\" " + "-C \"" + Command + "\" ";
  PythonCmd += IsStdout? "-S " : "";
  PythonCmd += (OutputPath !== '') ? "-O \"" + OutputPath + "\")" : ")";
  //
  // Send command into Terminal.
  //
  Terminal.sendText (PythonCmd);
}