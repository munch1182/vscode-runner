import * as vscode from "vscode";

export function notifyErr(err: string) {
  vscode.window.showInformationMessage(err);
}
