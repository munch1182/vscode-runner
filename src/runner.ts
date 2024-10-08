import * as vscode from "vscode";
import log from "./log";
import path from "path";
import { notifyErr } from "./notify";
import * as fs from "fs";

const NAME_CONFIG_SECTION = "vscode-runner";
const NAME_CONFIG_FILE_RUN_CODE = "fileRunner";
const NAME_CONFIG_PROJECT_RUN_CODE = "projectRunner";
const NAME_TERMINAL = "runner";
const EXCLUDE_DIR = [
  ".vscode",
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  "debug",
  "target",
];

export class Runner {
  // 文件所在文件夹
  readonly dir: string;
  // 文件扩展名，含.，当传入文件夹时为空
  readonly ext?: string;
  // 文件名，不含拓展，当传入文件夹时为空
  readonly filenameWithoutExt?: string;

  readonly uri: vscode.Uri;

  constructor(uri: vscode.Uri) {
    this.uri = uri;
    const filePath = uri.fsPath;
    this.dir = path.dirname(filePath);
    this.ext = path.extname(filePath);
    if (this.ext) {
      this.filenameWithoutExt = path.basename(filePath, this.ext);
    }
  }

  checkValue(): boolean {
    return !(!this.filenameWithoutExt || !this.ext);
  }

  filePath(): string | undefined {
    if (!this.checkValue()) {
      return undefined;
    }
    return path.join(this.dir, this.filenameWithoutExt! + this.ext!);
  }

  run() {
    log("run in: " + this.filePath());
  }

  /**
   *  将配置命令转为实际执行的命令，即转换变量
   */
  convertCmd(cmd: string): string {
    let str = cmd;
    str = str.replace(/\$dir/g, this.dir).replace(/\$sep/g, path.sep);
    if (this.filenameWithoutExt) {
      str = str.replace(/\$filenameWithoutExt/g, this.filenameWithoutExt);
      if (this.ext) {
        str = str.replace(/\$filename/g, this.filenameWithoutExt + this.ext);
      }
    }
    return str;
  }

  /**
   * 低于7.0版本的powershell不支持&&，需要替换为;
   * 因为无法判断powershell版本，所以全部替换
   */
  convertCmd4Powershell(cmd: string): string {
    return cmd.replace(/ &&/g, `; `).replace(/&&/g, `; `);
  }

  execCmd(cmd: string) {
    const terminal = this.getTerminal();

    // 如果是powershell，需要替换
    const opts = terminal.creationOptions;

    // 创建terminal时，传入了shellPath，所以此处不会为空
    if (
      "shellPath" in opts &&
      opts.shellPath?.toLocaleLowerCase()?.includes("powershell")
    ) {
      cmd = this.convertCmd4Powershell(cmd);
    }

    log("exec: " + cmd);
    terminal.show();
    terminal.sendText(cmd);
  }

  getTerminal(): vscode.Terminal {
    const terminals = vscode.window.terminals;
    let terminal = null;
    if (terminals) {
      terminal = terminals.find((t) => t.name === NAME_TERMINAL);
    }

    if (!terminal) {
      terminal = vscode.window.createTerminal({
        name: NAME_TERMINAL,
        // 设置才能获取，默认可能为空
        shellPath: vscode.env.shell,
      });
    }

    return terminal;
  }
}

/**
 * 运行当前页面命令
 */
export class FileRunner extends Runner {
  run() {
    super.run();
    if (!this.checkValue()) {
      notifyErr("cannot run this file");
      return;
    }
    // 如果是md文件，区别处理
    if (this.ext === ".md") {
      return this.mdHtmlPrew();
    }
    const code = this.getFileRunCodeFormConfig();
    log("runner code: " + code);
    if (!code) {
      notifyErr("cannot find runner for this file");
      return;
    }
    const fileCmd = this.convertCmd(code);
    this.execCmd(fileCmd);
  }

  getFileRunCodeFormConfig(): string | undefined {
    const cofig = vscode.workspace
      .getConfiguration(NAME_CONFIG_SECTION)
      .get<any>(NAME_CONFIG_FILE_RUN_CODE);
    return cofig ? cofig[this.ext!] : undefined;
  }

  /**
   * 将md文件预览为html并在浏览器中打开
   */
  mdHtmlPrew() {
    notifyErr("not implemented");
  }
}

/**
 * 运行当前页面所在的项目的运行命令
 */
export class ProjectRunner extends Runner {
  run() {
    super.run();
    if (!this.checkValue()) {
      notifyErr("cannot run this project");
      return;
    }
    const dir = vscode.workspace.getWorkspaceFolder(this.uri)?.uri.fsPath;
    if (!dir) {
      notifyErr("cannot find project");
      return;
    }
    const project = Project.buildProject(dir);
    if (!project) {
      notifyErr("cannot find project");
      return;
    }
    const cmd = project.getRunCMD();
    this.execCmd(cmd);
  }
}

class Project {
  // 判断项目文件夹
  readonly dir!: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  getRunCMD(): string {
    throw new Error("not implemented");
  }

  static buildProject(dir: string): Project | undefined {
    // 判断是有顺序的，因为tauri包含rust项目和node项目
    // 所以，这3个判断合在一处
    const project = TauriProject.buildNodeRustProject(dir);
    if (project !== undefined) {
      return project;
    }
    // other
    return undefined;
  }

  getProjectRunCodeFormConfig(type: string): string | undefined {
    return vscode.workspace
      .getConfiguration(NAME_CONFIG_SECTION)
      .get<any>(NAME_CONFIG_PROJECT_RUN_CODE)[type];
  }
}

class NodeProject extends Project {
  static isProject(dir: string): boolean {
    const pkgJson = findfile(dir, "package.json");
    log("find: " + pkgJson);
    if (!pkgJson) {
      return false;
    }
    return true;
  }

  getRunCMD(): string {
    const code = this.getProjectRunCodeFormConfig("node");
    return code ? code : "npm run dev";
  }
}

class TauriProject extends Project {
  static buildNodeRustProject(dir: string): Project | undefined {
    const node = NodeProject.isProject(dir);
    const rust = RustProject.isProject(dir);
    log("project: node: " + node + ", rust: " + rust);
    if (node && rust) {
      return new TauriProject(dir);
    }
    if (node) {
      return new NodeProject(dir);
    }
    if (rust) {
      return new RustProject(dir);
    }
    return undefined;
  }

  getRunCMD(): string {
    const code = this.getProjectRunCodeFormConfig("tauri");
    return code ? code : "npm run tauri dev";
  }
}

class RustProject extends Project {
  static isProject(dir: string): boolean {
    const cargoToml = findfile(dir, "Cargo.toml");
    log("find: " + cargoToml);
    if (!cargoToml) {
      return false;
    }
    return true;
  }

  getRunCMD(): string {
    // 如果有src/main.rs，则是bin项目，即使同时存在src/lib.rs也视为bin项目
    const mainsrcExists = fs.existsSync(path.join(this.dir, "src", "main.rs"));

    if (mainsrcExists) {
      return "cargo run";
    }
    // 如果有src/lib.rs，则是lib项目
    const libsrcExists = fs.existsSync(path.join(this.dir, "src", "lib.rs"));
    if (libsrcExists) {
      const template = path.join(this.dir, "examples");
      if (fs.existsSync(template) && fs.lstatSync(template).isDirectory()) {
        const files = fs.readdirSync(template);
        if (files && files.length > 0) {
          // 只运行第一个命令
          const name = files[0].replace(".rs", "");
          return `cargo run --example ${name}`;
        }
      }
    }
    // 默认值也会返回
    const code = this.getProjectRunCodeFormConfig("rust");
    return code ? code : "cargo run";
  }
}

/**
 * 在 filepath 文件/文件夹及其子文件夹中查找名为 file.ext 的文件，成功则返回该文件的路径
 */
function findfile(filepath: string, filename: string): string | undefined {
  if (!fs.existsSync(filepath)) {
    return undefined;
  }

  const findPath = path.join(filepath, filename);
  // 如果文件存在，直接返回路径
  // 否则寻找其它子文件夹中是否存在该文件
  if (fs.existsSync(findPath)) {
    return findPath;
  }

  const basename = path.basename(filepath);
  // 排除掉一般的生成文件夹

  for (const item of fs.readdirSync(filepath)) {
    let itempath = path.join(filepath, item);

    // 不需要比较文件
    if (fs.lstatSync(itempath).isDirectory()) {
      if (!EXCLUDE_DIR.includes(basename)) {
        const result = findfile(itempath, filename);
        if (result) {
          return result;
        }
      }
    }
  }

  return undefined;
}
