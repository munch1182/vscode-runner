# Change Log

All notable changes to the "munch1182-vscode-runner" extension will be documented in this file.

## [0.3.1]

增加设置中`curr`项的设置，该设置优先级最高。
增加项目运行命令时对根目录下`cmd.run`配置文件，该文件优先于类型配置。

## [0.2.3]

修复第一次使用`terminal`时的内容可能出现在路径前的问题。

## [0.2.2]

当运行`rust`的`examples`文件夹中文件时, 会运行`--example`命令。

## [0.2.1]

- 修复 tauri 项目无法运行的问题
- 为设置增加`${rmDir}`关键字，来根据系统自动替换命令。

## [0.2.0]

- 重构代码
- 使用项目运行时，顺序由内向外，运行由运行文件组成的第一个项目。这一点只对同一类型的多项目有效，对多类型的无效。
- 使用文件运行时，如果会生成编译后文件的运行命令，则默认配置会将其移至.tmp 文件夹。
