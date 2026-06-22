# Contributing to Idel-DreamMaker

感谢你对 Idel-DreamMaker 的关注！

## 项目简介

Idel-DreamMaker 是一个藏在系统托盘里的宠物陪伴挂机游戏。大厅 + 副本双层架构：在大厅管理副本，进入副本后零交互挂机升级、随机弹出故事事件。

## 技术栈

- **桌面框架**: Electron 34.x
- **后端**: JavaScript (Node.js 22.x)
- **前端**: HTML + CSS + JS（无框架）
- **构建工具**: Vite 6.x
- **打包**: electron-builder 25.x
- **字体**: Maple Mono NF CN (OFL-1.1)

## 快速开始

```bash
npm install
npm run electron:dev
```

## 目录结构

```
index.html              主 HTML 入口
src/
  main.js               前端逻辑
  style.css             前端样式
  scenario.js           数据模型模块
  scenario-parser.cjs   副本 .md 解析器（共享模块）
electron/
  main.cjs              Electron 主进程（窗口、游戏循环、存档、IPC）
  preload.cjs           IPC 桥接
  tray.cjs              系统托盘
  windows.cjs           窗口管理
  pet.cjs               宠物窗口
  holiday.cjs           节假日模块
  *.cjs                 其他子窗口管理
pet/                    宠物窗口前端
pet-bubble/             事件气泡窗口
pet-context-menu/       右键菜单窗口
pet-selector/           宠物选择器窗口
scenarios/              内置副本 .md 源文件
scenarios_user/         玩家自制副本（已 gitignore，不会提交）
public/
  scenarios_data.json   构建时生成的副本数据
  fonts/                打包字体
docs/                   文档
build.js                副本构建脚本
```

## 副本添加指南

### 内置副本（需提交到仓库）

1. 创建 `.md` 文件放到 `scenarios/` 目录
2. 运行 `node build.js` 生成 `public/scenarios_data.json`
3. 按照 `docs/format-rules.md` 的格式编写

### 玩家自制副本（本地测试）

直接丢 `.md` 文件到 `scenarios_user/` 目录，重启游戏即可加载，无需运行 build.js。

## 开发规范

- 事件文本不硬编码在代码中，由 .md 副本文件提供，构建时解析
- IPC 通信通过 preload.cjs 白名单通道进行
- 所有数据存为本地文件，不做云端数据库
- 游戏是零交互的——进入副本后没有按钮/点击，纯挂机

## 构建与打包

```bash
npm run electron:dev      # 开发模式
npm run electron:build    # 生产打包（Windows 便携版）
npx electron-builder --linux  # Linux 打包
```

## 提交 PR

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的改动 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

## 版权声明

- 像素宠物精灵为玩家自行下载的用户数据。应用不捆绑、不分发任何精灵文件。精灵版权归各自创作者或 IP 权利人。
- 字体 Maple Mono NF CN 使用 SIL Open Font License 1.1。
- 本仓库代码使用 MIT 许可证。
