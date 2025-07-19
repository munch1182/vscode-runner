import * as vscode from "vscode";

export class Env {
  static ENABLE_LOG = false;

  static collect(uri: vscode.Uri): Env | undefined {
    const env = new Env(uri);
    return env.isValid() ? env : undefined;
  }

  static notifyErr(err: string) {
    vscode.window.showInformationMessage(err);
  }

  static log(...args: any[]) {
    if (Env.ENABLE_LOG) {
      console.log("runner: ", ...args);
    }
  }

  private constructor(uri?: vscode.Uri) {
    if (uri) {
      this.workspaceDir = vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath;
      this.filePath = uri.fsPath;
    }
  }

  // vscode打开的文件夹路径, 空打开则为空
  readonly workspaceDir?: string;
  // 运行命令时选中的文件全路径, 打开新文件时有值但是被认为为空此处也被设置为空
  readonly filePath?: string;

  private isValid(): boolean {
    return this.filePath !== undefined;
  }
}

export class Config {
  // 与package.json中的配置保持一致
  private static readonly NAME_CONFIG_SECTION = "vscode-runner";
  private static readonly NAME_CONFIG_FILE_RUNNER = "fileRunner";
  private static readonly NAME_CONFIG_PROJECT_RUNNER = "projectRunner";

  /**
   * 从配置中获取文件运行命令
   */
  static getFileRunCodeFromConfig<T>(key: string): T | undefined {
    return vscode.workspace
      .getConfiguration(this.NAME_CONFIG_SECTION)
      .get<any>(this.NAME_CONFIG_FILE_RUNNER)[key];
  }

  /**
   * 直接获取当前文件的运行命令, 而不是根据类型
   */
  static getFileRunCodeFromConfigCurr(): string | undefined {
    const code = this.getFileRunCodeFromConfig<string>("curr")
    return (code === undefined || code === "undefined") ? undefined : code;
  }

  /**
   * 从配置中获取项目运行命令
   */
  static getProjectRunCodeFromConfig<T>(key: string): T | undefined {
    return vscode.workspace
      .getConfiguration(this.NAME_CONFIG_SECTION)
      .get<any>(this.NAME_CONFIG_PROJECT_RUNNER)[key];
  }

  /**
   * 直接获取当前文件的运行命令, 而不是根据类型
   */
  static getProjectRunCodeFromConfigCurr(): string | undefined {
    const code = this.getProjectRunCodeFromConfig<string>("curr")
    Env.log("code: ", code, typeof code);
    return (code === undefined || code == "undefined") ? undefined : code;
  }
}

export class Terminal {
  private static readonly NAME_TERMINAL = "runner";

  static execute(cmd: string) {
    const tm = this.getTerminalManager();
    const terminal = tm.terminal;

    const endcmd = Terminal.convertCmd4Powershell(cmd, terminal);

    terminal.show();
    if (tm.isCreatedNow) {
      // 避免创建时内容出现在路径前
      setTimeout(() => terminal.sendText(endcmd), 300);
    } else {
      terminal.sendText(endcmd);
    }
  }

  /**
   * 对于powershell要单独处理
   *
   * 低版本的powershell不支持&&，需要替换为;
   * 因为无法判断powershell版本，所以全部替换
   */
  private static convertCmd4Powershell(
    cmd: string,
    terminal: vscode.Terminal
  ): string {
    const opts = terminal.creationOptions;
    // 创建terminal时，传入了shellPath，所以此处不会为空
    if (
      "shellPath" in opts &&
      opts.shellPath?.toLocaleLowerCase()?.includes("powershell")
    ) {
      cmd = cmd.replace(/ &&/g, `; `).replace(/&&/g, `; `);
    }

    return cmd;
  }

  private static getTerminalManager(): TerminalManager {
    const terminal = vscode.window.terminals.find(
      (t) => t.name === Terminal.NAME_TERMINAL
    );
    if (terminal) {
      return new TerminalManager(terminal, false);
    }

    const newTerminal = vscode.window.createTerminal({
      name: Terminal.NAME_TERMINAL,
      // 设置才能获取，默认可能为空
      shellPath: vscode.env.shell,
    });
    return new TerminalManager(newTerminal, true);
  }
}

class TerminalManager {
  readonly terminal!: vscode.Terminal;
  readonly isCreatedNow!: boolean;

  constructor(terminal: vscode.Terminal, isCreatedNow: boolean) {
    this.terminal = terminal;
    this.isCreatedNow = isCreatedNow;
  }
}
