/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode  from 'vscode';

export function CreateFspEditorView () {
  let openWebview = vscode.commands.registerCommand('BIOS-CAT.L03OpenFspEditor', () => {
    const panel = vscode.window.createWebviewPanel (
      'L03OpenFspEditor',              // Identifies the type of the webview. Used internally
      'FSP Editor Sample Page',        // Title of the panel displayed to the user
      vscode.ViewColumn.One,           // Editor column to show the new webview panel in.
      {                                // Enable scripts in the webview
        enableScripts: true            // Set this to true if you want to enable Javascript.
      }
    );
    panel.webview.html = `<html><body>你好，我是FSP Editor</body></html>`;
  });
  return openWebview;
}
