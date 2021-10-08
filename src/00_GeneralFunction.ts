/* eslint-disable @typescript-eslint/naming-convention */
import * as FileSys from 'fs';
import * as vscode  from 'vscode';
import { dirname } from "path";
import { GitExtension} from './GitApi/git';
import { ChildProcess, execFile, ExecOptions } from "child_process";

//=============== Global variable area ===============
//
export const NOT_FOUND   = -1;
//
// True  : Os environment is Microsoft windows.
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


//=============== Batch file area ===============
//
// This area will define bat file to get patch form git.
//
export const GetGitPatchBAT = IsWindows?`

::######        ###        ######
::##           ## ##         ##
::#      Get patch bat file  ##
::##         ##     ##       ##
::######    ##       ##      ##

@echo off
::
:: Define area
::
setlocal enabledelayedexpansion
SET CAT_SID=%1
SET CAT_WS=%CD%
IF NOT "%2"=="" SET CAT_WS=%2
SET CAT_PATCH=z_CatPatch
IF NOT "%3"=="" SET CAT_PATCH=%3
SET CAT_FULL_PATH=%CAT_WS%%CAT_PATCH%/
::
:: Remove origin patch, if we have it.
::
rd /S/Q "%CAT_FULL_PATH%"
::
:: Start get patch, and generate it into ORG / MOD formate.
::
for /f "delims=" %%X in ('git diff-tree -r --no-commit-id --name-only --diff-filter=ACMRTD %CAT_SID%') do (\
  md "%CAT_FULL_PATH%MOD/%%X"\
  &rd "%CAT_FULL_PATH%MOD/%%X"\
  &md "%CAT_FULL_PATH%ORG/%%X"\
  &rd "%CAT_FULL_PATH%ORG/%%X"\
  &git show %CAT_SID%:%%X>%CAT_FULL_PATH%MOD/%%X\
  &git show %CAT_SID%^^:%%X>%CAT_FULL_PATH%ORG/%%X\
)
git log %CAT_SID% -1 > %CAT_FULL_PATH%PatchInfo.txt
endlocal`:`

######        ###        ######
##           ## ##         ##
#     Get patch bash file  ##
##         ##     ##       ##
######    ##       ##      ##

function git-export-diff() {
  if [ $# -ne 1 ] ; then
      echo "git-export-diff <version number>"
      return
  fi
  files=\`git diff-tree -r --no-commit-id --name-only --diff-filter=ACMRTD $1 | xargs -0\`
  for i in $files
  do
      mkdir -p \`dirname "Diff-$1/ORG/$i"\`
      mkdir -p \`dirname "Diff-$1/MOD/$i"\`
      echo "Diff-$1/ORG/$i"
      echo "Diff-$1/MOD/$i"
      git show $1:$i > Diff-$1/MOD/$i
      git show $1^:$i > Diff-$1/ORG/$i
  done
  git log $1 -1 > Diff-$1/PatchInfo.txt
}`;

//
// This area will define bat file to build sct tool.
//
export const BuildSctBAT = IsWindows?`

::######        ###        ######
::##           ## ##         ##
::#      Build SCT bat file  ##
::##         ##     ##       ##
::######    ##       ##      ##
echo off
chcp 437
set CatInput=0
set CatSpace=%1
set CatCompile=%2
set SCT_WORKSPACE=%CatSpace%\\EDK2
set CatSctX64=%SCT_WORKSPACE%\\Build\\UefiSct\\DEBUG_%CatCompile%\\SctPackageX64
if not defined PYTHON_HOME ( set PYTHON_HOME=C:\\Python27 )

:CatSelect
cd %CatSpace%
set /p CatInput=Please choose your cmd: 1 build, 2 clean, 3 clean build, 0 exit :
if not exist Edk2 (
  echo.
  echo "Please make sure you have EDK2 folder"
  echo.
  goto EndOfSCT
)
if not exist SctRoot (
  echo.
  echo "Please make sure you have SctRoot folder"
  echo.
  goto EndOfSCT
)
if %CatInput% GEQ 4 goto CatSelect
if %CatInput% GEQ 2 (
  echo.
  echo "------> Clean SCT build pkg .... <------"
  rd /s /q "%SCT_WORKSPACE%\\Build" "%SCT_WORKSPACE%\\SctPkg" "%CatSpace%\\_CatSct"
  echo "------>       Clean done.        <------"
  echo.
  if %CatInput% EQU 3 ( set CatInput=1 )
)
if %CatInput% == 1 (
  if not exist %SCT_WORKSPACE%\\SctPkg (
    xcopy "%CatSpace%\\SctRoot\\uefi-sct\\SctPkg" "%SCT_WORKSPACE%\\SctPkg" /Q/E/S/I/Y > NUL
  )
  if not defined CAT_FLAG (
    set CAT_FLAG
    echo Call edksetup first!!!
    call %SCT_WORKSPACE%\\edksetup.bat %CatCompile%
    call nmake -f "%SCT_WORKSPACE%\\BaseTools\\Makefile"
    copy "%SCT_WORKSPACE%\\SctPkg\\Tools\\Bin\\GenBin.exe" "%SCT_WORKSPACE%\\BaseTools\\Bin\\Win32\\"
  )
  if exist %SCT_WORKSPACE%\\BaseTools\\Bin\\Win32\\GenBin.exe (
    echo.
    echo "||------ GenBin.exe is exist! ------||"
    echo.
  ) else (
    echo.
    echo "||------ Build GenBin.exe.. ------||"
    echo.
    xcopy "%SCT_WORKSPACE%\\SctPkg\\Tools\\Source\\GenBin" "%SCT_WORKSPACE%\\BaseTools\\Source\\C\\GenBin" /Q/E/S/I/Y
    call "%SCT_WORKSPACE%\\BaseTools\\toolsetup.bat"
    cd "%SCT_WORKSPACE%\\BaseTools\\Source\\C\\Common" && nmake
    cd "%SCT_WORKSPACE%\\BaseTools\\Source\\C\\GenBin" && nmake
  )
  call build -p %SCT_WORKSPACE%\\SctPkg\\UEFI\\UEFI_SCT.dsc -a X64 -t %CatCompile% 1>NUL
  echo ERRORLEVEL=%ERRORLEVEL%
  if %ERRORLEVEL% EQU 0 (
    cd %SCT_WORKSPACE%\\Build\\UefiSct\\DEBUG_%CatCompile%
    echo.
    echo Ready to gen SCT InstallX64.efi
    echo.
    call %SCT_WORKSPACE%\\SctPkg\\CommonGenFramework.bat uefi_sct X64 InstallX64.efi
    if exist %CatSctX64%\\InstallX64.efi (
      echo.
      echo Gen Finish & copy to _CatSct.
      echo.
      xcopy "%CatSctX64%" "%CatSpace%\\_CatSct" /Q/E/S/I/Y
    ) else (
      echo Can not find InstallX64.efi, please check with [%CatSctX64%].
    )
  ) else (
    echo.
    echo Some build error is occur.
    echo.
  )
)
if %CatInput% NEQ 0 goto CatSelect
echo.
echo "||------ Exit build SCT.. ------||"
echo.
:EndOfSCT
pause
`:`
######        ###        ######
##           ## ##         ##
#     Build SCT bash file  ##
##         ##     ##       ##
######    ##       ##      ##
`;


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
  return OurPythonPath;
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
  if (IsWindows) {
    //
    //  Delay 1s to make sure the cmd command can go well.
    //  Change encode into 437 :: cmd /C to compatible between MS cmd and MS Powershell.
    //  And send "setlocal enabledelayedexpansion" to make sure variable is correct.(if need)
    //
    await Delay(1000);
    Terminal.sendText ("cmd /C chcp 437");
    //await Delay(1000);
    //Terminal.sendText ("setlocal enabledelayedexpansion");
  }
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
  if (IsWindows) {
    //
    //  Delay 1s to make sure the cmd command can go well.
    //  Change encode into 437 :: cmd /C to compatible between MS cmd and MS Powershell.
    //  And send "setlocal enabledelayedexpansion" to make sure variable is correct.(if need)
    //
    await Delay(1000);
    Terminal.sendText ("cmd /C chcp 437");
    //await Delay(1000);
    //Terminal.sendText ("setlocal enabledelayedexpansion");
  }
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


//=============== Git command area ===============
//
// Execute command to run git.
//
const Execute = async (
  Args: string[],
  Options: ExecOptions = {},
): Promise<string> => {
  var Command = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports.getAPI(1).git.path + "";
  //console.log ("command", `${Command} ${Args.join(" ")}`);
  let Execution: ChildProcess = execFile(Command, Args, { ...Options, encoding: "utf8" });
  let Data = "";
  for await (const chunk of Execution?.stdout ?? []) {
      Data += chunk;
  }
  return Data.trim();
};

//
// Export function for use.
//
export const RunGit = (
  cwd: string,
  ...args: string[]
): Promise<string> => Execute(args, { cwd: dirname(cwd) });
