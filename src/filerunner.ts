import path from "path";
import { Config, Env, Terminal } from "./env";
import * as os from "os";

export function runFile(env: Env) {
  if (!env.filePath) {
    Env.notifyErr(`No file path found`);
    return;
  }
  const fileEnv = new EnvFile(env.filePath);
  Env.log(`Running file: ${fileEnv.contactPath()}`);

  const dotExt = fileEnv.fileExtIncludeDot;
  if (!dotExt) {
    Env.notifyErr(`No run code found for file: ${fileEnv.fileFullName()}`);
    return;
  }

  // 根据文件后缀从配置中获取运行代码
  let configCode: string | undefined = Config.getFileRunCodeFromConfig(dotExt);
  Env.log(`Run code: ${fileEnv.fileExtIncludeDot} => ${configCode}`);
  if (!configCode) {
    Env.notifyErr(`No run code found for file: ${fileEnv.fileFullName()}`);
    return;
  }

  // 将配置内容参数替换为实际内容
  const runCode = fileEnv.convertCode(configCode);
  Env.log(`Run code: ===>  ${runCode}`);

  Terminal.execute(runCode);
}

class EnvFile {
  readonly fileDir!: string;
  readonly fileNameWithoutExt!: string;
  readonly fileExtIncludeDot?: string;

  constructor(file: string) {
    this.fileDir = path.dirname(file);
    this.fileExtIncludeDot = path.extname(file);
    this.fileNameWithoutExt = path.basename(file, this.fileExtIncludeDot);
  }

  contactPath() {
    return path.join(
      this.fileDir,
      this.fileNameWithoutExt + this.fileExtIncludeDot
    );
  }

  fileFullName() {
    return this.fileNameWithoutExt + this.fileExtIncludeDot;
  }

  convertCode(code: string) {
    let str = code;
    // 需要与package.json中的配置项保持一致
    str = str
      .replace(/\${dir}/g, this.fileDir)
      .replace(/\${sep}/g, path.sep)
      .replace(/\${filenameWithoutExt}/g, this.fileNameWithoutExt);
    if (this.fileExtIncludeDot) {
      str = str.replace(/\${filename}/g, this.fileFullName());
    }
    if (os.platform() === "win32") {
      str = str.replace(/\${rmDir}/g, "rmdir /s /q");
    } else {
      str = str.replace(/\${rmDir}/g, "rm -rf");
    }
    return str;
  }
}
