import * as vscode from "vscode";
import { FileRunner, ProjectRunner } from "./runner";

export function activate(context: vscode.ExtensionContext) {
  const runFile = vscode.commands.registerCommand(
    "munch1182-vscode-runner.runFile",
    (uri: vscode.Uri) => new FileRunner(uri).run()
  );
  const runProject = vscode.commands.registerCommand(
    "munch1182-vscode-runner.runProject",
    (uri: vscode.Uri) => new ProjectRunner(uri).run()
  );

  context.subscriptions.push(runFile);
  context.subscriptions.push(runProject);
}

export function deactivate() {}
