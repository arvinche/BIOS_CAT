/* eslint-disable @typescript-eslint/naming-convention */
import * as FileSys from 'fs';
import * as vscode  from 'vscode';

//=============== Global variable area ===============
//
export const WorkSpace  = (vscode.workspace.rootPath + "/").replace(/\\/g,"/");
export const EnvCheck   = WorkSpace + ".vscode/CatEnvCheck.cat";
export const StatusFile = WorkSpace + ".vscode/CatStatus.cat";

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
//  This area will clear Statusfile and make sure 
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
const RunCommandPython = `

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
  if (!FileSys.existsSync (WorkSpace + ".vscode/RunCommand.py")) {
    //
    // To-Do:  need to check py env in here.
    //
    FileSys.writeFile (WorkSpace + ".vscode/RunCommand.py", RunCommandPython, (err) => {});
  }
  return WorkSpace + ".vscode/RunCommand.py";
}

//
// The entry of send command with python.
//
export async function SendCommand2PY (
  Terminal   :vscode.Terminal,
  Command    :string,  // The command that we need pass throuhg python to execution.
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
  var   GlobalCmd_S  =  "cd " + BuildPath + " & ";
  const GlobalCmd_E  =  "& (echo 0 > "+StatusFile+")";
  let   PythonCmd    =  GenRunCommand (WorkSpace);
  //
  // Add delay to make sure command can get indeed and marge into "PythonCmd".
  //
  await Delay(1000);
  PythonCmd = "(py -3 -W ignore \"" + PythonCmd + "\" " + "-C \"" + GlobalCmd_S + Command + "\" ";
  PythonCmd += IsStdout? "-S " : "";
  PythonCmd += (OutputPath !== '') ? "-O \"" + OutputPath + "\")" : ")";
  //
  // Send command into Terminal.
  //
  console.log(PythonCmd);
  Terminal.sendText (PythonCmd + GlobalCmd_E);
}
