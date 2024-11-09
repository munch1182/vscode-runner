import * as vscode from "vscode";
import { Env } from "./env";
import { runFile as rf } from "./filerunner";
import { runProject as rp } from "./projectrunner";

export function activate(context: vscode.ExtensionContext) {
  Env.ENABLE_LOG = false;
  Env.log("activate");
  const fileRunner = vscode.commands.registerCommand(
    "munch1182-vscode-runner.runFile",
    runFile
  );
  const projectRunner = vscode.commands.registerCommand(
    "munch1182-vscode-runner.runProject",
    runProject
  );

  context.subscriptions.push(fileRunner);
  context.subscriptions.push(projectRunner);
}

export function deactivate() {}

function runFile(uri: vscode.Uri) {
  collectEnv(uri, rf);
}

function runProject(uri: vscode.Uri) {
  collectEnv(uri, rp);
}

function collectEnv(uri: vscode.Uri, callback: (env: Env) => void) {
  Env.log("=============");
  Env.log("collect env: " + uri);
  const env = Env.collect(uri);
  if (!env) {
    Env.notifyErr("cannot know file");
    return;
  }

  Env.log(`collect env:  ===> ${env.filePath}, ${env.workspaceDir}`);
  callback(env);
}
