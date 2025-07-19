import path from "path";
import fs from "fs";
import { Config, Env } from "./env";

/**
 * 一个项目结构必然包含执行命令的项目路径和一个特定命名或者样式的文件
 */
export abstract class Project {
  readonly dir!: string;
  readonly file!: string;

  constructor(dir: string, file: string) {
    this.dir = dir;
    this.file = file;
  }

  /**
   * 解析结构，转换成项目对象
   */
  static findProject(env: Env): Project | undefined {
    if (!env.filePath || !env.workspaceDir) {
      return undefined;
    }

    let finders = [
      // 寻找cmd.run文件, 该设置优先级第二
      (f: Finder) => CmdProject.find(f, env),
      // Tauri会包含Node的判断
      (f: Finder) => TauriSimpleProject.findPlusNodejs(f),
      // (f: Finder) => NodejsProject.find(f),
      (f: Finder) => RustProject.find(f, env),
    ];

    const dir = path.dirname(env.filePath);
    const untill = env.workspaceDir;
    const finder = new Finder(dir, untill);
    for (const find of finders) {
      const found = find(finder);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  /**
   * 返回真实运行命令
   */
  abstract runCode(): string | undefined;

  /**
   * 根据配置名返回默认命令
   */
  runCodeSimple(key: string): string | undefined {
    const runCode = Config.getProjectRunCodeFromConfig(key);
    return runCode ? `cd ${this.dir} && ${runCode}` : undefined;
  }
}

/**
 * 从dir中寻找是否存在file同名文件，从dir向外逐级寻找，直到untill为止
 *
 * 直接从当前运行文件所在文件夹位置寻找该文件是否存在即可
 * 不需要遍历文件夹和文件，因为一般项目该特定文件总是在项目最外层
 */
class Finder {
  private readonly untill!: string;
  private readonly startDir!: string;

  constructor(dir: string, untill: string) {
    this.startDir = dir;
    this.untill = untill;
  }

  /**
   * 从dir中寻找是否存在file同名文件，从dir向外逐级文件夹寻找，直到untill为止
   *
   * 适用于单纯两级文件夹结构的项目
   */
  findSimple(filename: string): string | undefined {
    return this._findFromCurr2Out(filename, this.startDir);
  }

  findCmdFile(workdir: string | undefined): string | undefined {
    if (!workdir) {
      return undefined;
    }
    const cmder = path.join(workdir, "cmd.run");
    if (fs.existsSync(cmder)) {
      Env.log(`Find: ${cmder} exist`);
      return cmder;
    }
    return undefined;
  }

  _findFromCurr2Out(filename: string, dir: string): string | undefined {
    const found = path.join(dir, filename);
    Env.log(`Find: ${found}`);
    if (fs.existsSync(found)) {
      Env.log(`Find: ${found} exist`);
      return found;
    }
    if (this.untill === dir) {
      return undefined;
    }
    return this._findFromCurr2Out(filename, path.dirname(dir));
  }
}

/**
 * 不考虑更改了配置路径的情形
 */
export abstract class OneLevelProject extends Project {
  constructor(file: string) {
    super(path.dirname(file), file);
  }
}

/**
 * 如果包含package.json文件，则包含package.json文件的文件夹认为是一个Node项目
 *
 * 执行默认命令'npm run dev'
 */
export class NodejsProject extends OneLevelProject {
  static find(finder: Finder): NodejsProject | undefined {
    const pkgJson = finder.findSimple("package.json");
    return pkgJson ? new NodejsProject(pkgJson) : undefined;
  }

  constructor(packagejson: string) {
    super(packagejson);
  }

  runCode(): string | undefined {
    return this.runCodeSimple("node");
  }
}

/**
 * 如果包含Cargo.toml文件，则包含Cargo.toml文件的文件夹认为是一个Rust项目
 *
 * 如果Rust项目中包含src/main.rs文件，则执行默认命令`cargo run`
 * 如果不包含main.rs，但包含examples文件夹，则以--example执行当前打开的/第一个examples文件夹中的文件
 *
 * 否则执行默认命令`cargo run`
 */
export class RustProject extends OneLevelProject {
  static find(finder: Finder, env: Env): RustProject | undefined {
    const cargoToml = finder.findSimple("Cargo.toml");
    return cargoToml ? new RustProject(cargoToml, env.filePath) : undefined;
  }

  private readonly activeFile!: string | undefined;

  constructor(cargoToml: string, activeFile: string | undefined) {
    super(cargoToml);
    this.activeFile = activeFile;
  }

  runCode(): string | undefined {
    const defaultCode = this.runCodeSimple("rust");
    // 以下都是附加命令
    if (!defaultCode) {
      return undefined;
    }
    let mainRs = path.join(this.dir, "src", "main.rs");
    Env.log(`Find: ${mainRs}`);
    // 如果有main.rs，则直接运行默认命令
    if (fs.existsSync(mainRs)) {
      Env.log(`Find: ${mainRs} exist`);
      return `${defaultCode}`;
    }
    // 如果没有main.rs，则尝试判断examples
    let examples = path.join(this.dir, "examples");
    Env.log(`Find: ${examples}`);
    if (fs.existsSync(examples)) {
      Env.log(`Find: ${examples} exist`);

      // 判断是否是examples中文件
      const sureActiveFile =
        this.activeFile && this.activeFile.includes(examples);

      const file = sureActiveFile
        ? this.activeFile
        : fs.readdirSync(examples)[0];
      if (file) {
        const filename = path.basename(file);
        Env.log(`examples filename: ${filename}`);
        if (filename.endsWith(".rs")) {
          const codeName = filename.replace(".rs", "");
          // 暂无法为examples手动设置命令
          return `${defaultCode} --example ${codeName}`;
        }
      }
    }
    return defaultCode;
  }
}

/**
 * 默认结构：如果这是一个node项目，且包含src-tauri/tauri.conf.json文件，则认为是一个tauri项目
 *
 * 执行默认命令'npm run tauri dev'
 */
export class TauriSimpleProject extends Project {
  static findPlusNodejs(finder: Finder): TauriSimpleProject | undefined {
    const node = NodejsProject.find(finder);
    if (node) {
      // rename?
      const tauriConf = path.join(node.dir, "src-tauri", "tauri.conf.json");
      if (fs.existsSync(tauriConf)) {
        return new TauriSimpleProject(tauriConf);
      }
      return node;
    }
    return undefined;
  }
  constructor(tauriConf: string) {
    // tauri的conf文件在src-tauri目录下，所以需要向上两级目录
    const dir = path.dirname(path.dirname(tauriConf));
    super(dir, tauriConf);
  }

  runCode(): string | undefined {
    return this.runCodeSimple("tauri");
  }
}

/**
 * 如果打开的目录下配置了cmd.runner，则认为是直接运行给文件的命令
 * 且运行路径在打开的目录
 */
export class CmdProject extends Project {
  static find(finder: Finder, env: Env): CmdProject | undefined {
    const cmdFile = finder.findCmdFile(env.workspaceDir);
    return cmdFile ? new CmdProject(cmdFile) : undefined;
  }

  constructor(cmdFile: string) {
    super(path.dirname(cmdFile), cmdFile);
  }

  runCode(): string | undefined {
    let cmd = fs.readFileSync(this.file);
    return `cd ${this.dir} && ${cmd.toString()}`;
  }
}