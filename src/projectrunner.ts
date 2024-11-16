import { Env, Terminal } from "./env";
import fs from "fs";
import { Project } from "./project";

export function runProject(env: Env) {
  if (!env.workspaceDir) {
    Env.log("No workspace directory found");
    return;
  }
  // 从运行的文件从内往外寻找第一个项目，到工作区目录为止
  if (!env.filePath) {
    Env.notifyErr(`No file path found`);
    return;
  }
  if (!fs.existsSync(env.filePath) || !fs.existsSync(env.workspaceDir)) {
    Env.notifyErr(`No file found`);
    return;
  }

  const project = Project.findProject(env);
  if (!project) {
    Env.notifyErr(`Unkown project`);
    return;
  }

  const runCode = project.runCode();
  Env.log(`Run code: ===>  ${runCode}`);
  if (!runCode) {
    Env.notifyErr(`No run code found`);
    return;
  }
  Terminal.execute(runCode);
}
