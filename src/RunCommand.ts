/* eslint-disable @typescript-eslint/naming-convention */
import * as FileSys from 'fs';
import * as vscode  from 'vscode';

const RunCommandPython = `

import os
import argparse
import subprocess
import sys

__prog__        = 'RunCommand.py'
__version__     = '%s Version %s' % (__prog__, '0.1')
__copyright__   = 'Copyright (c) 2021, CG. All rights reserved.'
__description__ = 'The script is used run command.'

def GetArg ():
    #
    # Prepare argument parser
    #
    parser = argparse.ArgumentParser()
    parser.add_argument (
             '-V',
             '-v',
             '--Version',
             action = 'version',
             version = __version__
             )

    parser.add_argument (
             '-W',
             '-w'
             '--Workspace',
             dest = 'Workspace',
             help = 'Type your workspace')

    parser.add_argument (
             '-C',
             '-c'
             '--Command',
             required = True,
             dest = 'Command',
             help = 'Type command you want to run')

    parser.add_argument (
             '-O',
             '-o'
             '--OutputPath',
             dest = 'OutputPath',
             help = 'Type output file path',
             )

    parser.add_argument (
             '-S',
             '-s'
             '--Stdout',
             dest = 'IsStdout',
             help = 'Output messages in terminal',
             action="store_true"
             )


    args = parser.parse_args()
    return args

def RunCommand (Command, Workspace = None, OutputPath = None, IsStdout = False):
  if Workspace == None:
    RunInPath = os.path.abspath (__file__)
    print (RunInPath)
    Workspace = RunInPath[:RunInPath.find (".vscode")]
    print (Workspace)
  os.chdir (Workspace)
  LogFile = None
  if OutputPath != None:
    os.makedirs(os.path.dirname(OutputPath), exist_ok=True)
    LogFile = open(OutputPath, 'wb')

  proc = subprocess.Popen(args=Command.split (' '), stdin=sys.stdin, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, shell=True, bufsize=1, universal_newlines=True)
  for Line in proc.stdout:
    Line = bytes(Line, 'utf-8')
    if (IsStdout):
      sys.stdout.buffer.write(Line)
    if (LogFile != None):
      LogFile.write(Line)
    sys.stdout.flush()
  proc.wait()
  if (LogFile != None):
    LogFile.close ()
  return proc.returncode

def main ():
  Args = GetArg ()
  return RunCommand (Args.Command, Args.Workspace, Args.OutputPath, Args.IsStdout)

if __name__ == '__main__':
  exit(main ())
`;

function SetGetRunCommand (WorkSpace:string) {
  if (!FileSys.existsSync (WorkSpace + ".vscode/RunCommand.py")) {
    FileSys.writeFile (WorkSpace + ".vscode/RunCommand.py", RunCommandPython, (err) => {
      if (err) {
          console.log(err);
      } else{
        console.log('Write RunCommand.py complete.');
      }
    });
  }
  return WorkSpace + ".vscode/RunCommand.py";
}

export function SendCommand (
  Terminal:vscode.Terminal, Command:string, WorkSpace:string, IsStdout:boolean = true, OutputPath:string="", StatusFile:string) {
  const GlobalCmd_E   = "& (echo 0 > "+StatusFile+")";
  //  Change encode into 437 :: cmd /C to compatible between MS cmd and MS Powershell
  let GetConfig = vscode.workspace.getConfiguration();
  let BuildPath     = (GetConfig.get("CAT.00_BuildPath")+"").replace(/\\/g, "/").indexOf (":/") === -1?
  WorkSpace + GetConfig.get("CAT.00_BuildPath") : GetConfig.get("CAT.00_BuildPath")+"";
  if (!FileSys.existsSync(BuildPath) && !FileSys.existsSync(WorkSpace+BuildPath)) {
    vscode.window.showInformationMessage (" ❗️❗️ File path  ["+BuildPath+"]  seems not exist.");
    return;
  }
  var   GlobalCmd_S   = "cmd /C chcp 437 & cd " + BuildPath + " & ";

  let PythonCommand = SetGetRunCommand (WorkSpace);
  PythonCommand = '(py -3 \"' + PythonCommand + "\" " + "-C \" python -u " + GlobalCmd_S + Command + "\" ";

  if (IsStdout) {
    PythonCommand += "-S ";
  }
  if (OutputPath !== '') {
    PythonCommand += "-O \"" + OutputPath + "\")";
  } else {
    PythonCommand += ") ";
  }
  console.log("|" + PythonCommand);
  Terminal.sendText (PythonCommand + GlobalCmd_E);
}
