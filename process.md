# vscode extensions

[官方指导](https://code.visualstudio.com/api/get-started/your-first-extension)

## 创建并测试

1. 安装`npm i -g yo generator-code`
2. 运行`yo code`并选择对应选项
3. 打开项目并点击（`run/start debugging`，默认按键`F5`）测试

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
