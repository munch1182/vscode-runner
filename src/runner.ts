import * as vscode from "vscode";
import log from "./log";
import path from "path";
import { notifyErr } from "./notify";

const NAME_CONFIG_SECTION = "vscode-runner";
const NAME_CONFIG_FILE_RUNNER = "fileRunner";
const NAME_TERMINAL = "runner";

export class Runner {
  // 文件所在文件夹
  readonly dir: string;
  // 文件扩展名，含.，当传入文件夹时为空
  readonly ext?: string;
  // 文件名，不含拓展，当传入文件夹时为空
  readonly name?: string;

  constructor(uri: vscode.Uri) {
    const filePath = uri.fsPath;
    this.dir = path.dirname(filePath);
    this.ext = path.extname(filePath);
    if (this.ext) {
      this.name = path.basename(filePath, this.ext);
    }
  }

  checkValue(): boolean {
    return !(!this.name || !this.ext);
  }

  filePath(): string | undefined {
    if (!this.checkValue()) {
      return undefined;
    }
    return path.join(this.dir, this.name! + this.ext!);
  }

  run() {
    log("run: " + this.filePath());
  }

  /**
   *  将配置命令转为实际执行的命令，即转换变量
   */
  convertCmd(cmd: string): string {
    let str = cmd;
    str = str.replace(/\$dir/g, this.dir).replace(/\$sep/g, path.sep);
    if (this.name) {
      str = str.replace(/\$filenameWithoutExt/g, this.name);
      if (this.ext) {
        str = str.replace(/\$filename/g, this.name + this.ext);
      }
    }
    return str;
  }

  /**
   * 低于7.0版本的powershell不支持&&，需要替换为;
   */
  convertCmd4Powershell(cmd: string): string {
    return cmd.replace(/ &&/g, `; `).replace(/&&/g, `; `);
  }

  execCmd(cmd: string) {
    const terminal = this.getTerminal();

    // 如果是powershell，需要替换
    const opts = terminal.creationOptions;

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

  getTerminal() {
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
    const code = this.getFileRunnerCodeFormConfig();
    if (!code) {
      notifyErr("cannot find runner for this file");
      return;
    }
    const fileCmd = this.convertCmd(code);
    this.execCmd(fileCmd);
  }

  getFileRunnerCodeFormConfig(): string | undefined {
    const cofig: any = vscode.workspace
      .getConfiguration(NAME_CONFIG_SECTION)
      .get(NAME_CONFIG_FILE_RUNNER);
    if (cofig === undefined || cofig[this.ext!] === undefined) {
      return undefined;
    }
    return cofig[this.ext!];
  }

  /**
   * 将md文件预览为html并在浏览器中打开
   */
  mdHtmlPrew() {}
}

/**
 * 运行当前页面所在的项目的运行命令
 */
export class ProjectRunner extends Runner {}

class NodeRunner extends ProjectRunner {}

class RustRunner extends ProjectRunner {}

class TauriRunner extends NodeRunner {}
