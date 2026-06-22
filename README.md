# Idel-DreamMaker

藏在系统托盘里的宠物陪伴应用。挂机升级，解锁称号与成就，触发故事事件——陪你度过每一刻。

> 原名 IdleWorker，v0.3.0 起改名 Idel-DreamMaker。

## 截图

> TODO: 请补充截图，放到 `docs/screenshots/` 目录下

| 大厅界面 | 副本内挂机 | 宠物窗口 | 事件弹窗 |
|---------|-----------|---------|---------|
| `docs/screenshots/hub.png` | `docs/screenshots/scenario.png` | `docs/screenshots/pet-window.png` | `docs/screenshots/event.png` |

## 快速开始

```bash
# 安装依赖
npm install

# 构建副本数据 + 启动开发模式
npm run electron:dev
```

## 制作自己的副本

1. 在 `scenarios/` 或 `scenarios_user/` 下创建一个 `.md` 文件
2. 按照 `docs/format-rules.md` 的格式填写
3. 重启游戏即可自动加载

详情见 [创建副本指南](docs/creating-scenarios.md)。

## 打包

```bash
npm run electron:build
```

Windows 打包 → `release/Idel-DreamMaker 版本.exe`
Linux 打包 → `npx electron-builder --linux`

## 技术栈

| 类别 | 技术 |
|------|------|
| 桌面框架 | Electron 34.x |
| 后端 | JavaScript (Node.js 22.x) |
| 前端 | HTML + CSS + JS（无框架） |
| 构建 | Vite 6.x + electron-builder 25.x |
| 字体 | [Maple Mono NF CN](https://github.com/subframe7536/maple-font) (OFL-1.1) |

## 文档

- [副本格式规范](docs/format-rules.md)
- [创建副本教程](docs/creating-scenarios.md)
- [AI 辅助创作模板](docs/ai-prompt-template.md)

## 文件结构

```
index.html              主 HTML 入口
src/main.js             前端逻辑
src/style.css           前端样式
src/scenario.js         数据模型模块
src/scenario-parser.cjs 副本 .md 解析器（共享模块）
electron/
  main.cjs              Electron 主进程（窗口、游戏循环、存档）
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
scenarios_user/         玩家自制副本（新建，已 gitignore）
public/
  scenarios_data.json   构建时生成的副本数据（由 build.js 从 scenarios/ 生成）
  fonts/                打包字体
docs/                   文档
build.js                副本构建脚本
```

## 版权声明

- 像素宠物精灵为玩家自行下载的用户数据（`%APPDATA%/Idel-DreamMaker/pets/`）。应用不捆绑、不分发任何精灵文件。精灵版权归各自创作者或 IP 权利人。下载地址：https://petdex.dev/
- 字体 [Maple Mono NF CN](https://github.com/subframe7536/maple-font) 使用 SIL Open Font License 1.1
