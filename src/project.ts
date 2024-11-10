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

  static findProject(dir: string, untill: string): Project | undefined {
    let finders = [
      (f: Finder) => TauriProject.find(f),
      (f: Finder) => NodejsProject.find(f),
      (f: Finder) => RustProject.find(f),
    ];

    const finder = new Finder(dir, untill);
    for (const find of finders) {
      const found = find(finder);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  abstract runCode(): string | undefined;

  runCodeSimple(key: string): string | undefined {
    const runCode = Config.getProjectRunCodeFromConfig(key);
    return runCode ? `cd ${this.dir} && ${runCode}` : undefined;
  }
}

/**
 * 从dir中寻找是否存在file同名文件，从dir向外逐级寻找，直到untill为止
 *
 * 直接从当前运行文件所在文件夹位置寻找该文件是否存在即可
 * 不需要遍历文件夹和文件，因为该特定文件总是在项目最外层
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

export class RustProject extends OneLevelProject {
  static find(finder: Finder): RustProject | undefined {
    const cargoToml = finder.findSimple("Cargo.toml");
    return cargoToml ? new RustProject(cargoToml) : undefined;
  }

  constructor(cargoToml: string) {
    super(cargoToml);
  }

  runCode(): string | undefined {
    return this.runCodeSimple("rust");
  }
}

export class TauriProject extends Project {
  static find(finder: Finder): TauriProject | undefined {
    const node = NodejsProject.find(finder);
    if (node) {
      // rename?
      const tauriConf = path.join(node.dir, "src-tauri", "tauri.conf.json");
      if (fs.existsSync(tauriConf)) {
        return new TauriProject(tauriConf);
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
