# vscode extensions

[官方指导](https://code.visualstudio.com/api/get-started/your-first-extension)

## 创建并测试

1. 安装`npm i -g yo generator-code`
2. 运行`yo code`并选择对应选项
3. 打开项目并点击（`run/start debugging`，默认按键`F5`）测试

## 实现

1. `runFile`: 读取当前文件后缀，并匹配配置文件的命令，将命令转为实际路径并执行。
2. `runProject`：读取 vscode 打开的文件夹，并顺序判断是否是对应类型，再执行对应命令。优先执行读取配置中的命令。
   1. `tauri`：判断是否是`rust`项目，并判断`build.rs`文件是否存在对应`tauri`内容，并执行`package.json`的`scripts`字段中的第一个命令。
   2. `node`：判断`package.json`文件存在，执行其中`scripts`字段的第一个命令。
   3. `rust`：判断`Cargo.toml`文件存在，并执行`cargo run`。

## 语法

### 命令

1. 注册命令

```js
export function activate(context: vscode.ExtensionContext) {
  const commandID = "extensionId.commandId";
  const commandHander = () => {};

  context.subscriptions.push(
    vscode.commands.registerCommand(commandID, commandHander)
  );
}
```

2. 公开命令

```json
// package.json
{
  "contributes": {
    "commands": [
      {
        "command": "extensionId.commandId",
        "title": "command title"
      }
    ]
  }
}
```

3. 在右键中显示命令

```json
// package.json
{
  "contributes": {
    "menus": {
      "editor/context": [
        {
          "command": "extensionId.commandId",
          "group": "navigation",
          "when": "true" // 默认true
        }
      ]
    }
  }
}
```

### 配置

1. 注册配置

```json
// package.json
"configuration": {
  "title": "vscode-runner",
  "properties": {
    "vscode-runner.ccc1": {
      "type": "object",
      "default": {
        "config1": "111",
        "config2": "222"
      }
    },
    "vscode-runner.ccc2": {
      "default": "ccc222",
      "enum": [
        "ccc111",
        "ccc222"
      ]
    }
  }
}
```

2. 获取配置

```js
const config = vscode.workspace.getConfiguration("vscode-runner");
const ccc1 = config.get("ccc1")["config1"];
const ccc2 = config.get("ccc2");
```

## 打包

1. 安装`vsce`

```bash
npm i -g @vscode/vsce
```

2. 确保`package.json`中`publisher`和`name`字段存在，确保修改了`README.md`文件

3. 打包

```bash
vsce package
```

## Github Actions 集成

用于自动打包并发布道`vscode`的插件市场

1. 创建自己的`token`：参考[官方文档](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token)
2. 在`github`上添加`secrets`：在项目的`github`界面，选择`Settings/Security/Secrets and variables/Actions`，并选择`New repository secret`添加。
3. 在`workflows`文件中使用该值
