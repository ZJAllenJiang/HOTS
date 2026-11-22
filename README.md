# HOTS ARAM Lab — 浏览器战斗原型

TypeScript + Three.js 的单线战斗开发原型。这是使用原创英雄和场景素材的 3D 单线人机战斗原型。

设计提案保留自 [PR #1](https://github.com/ZJAllenJiang/HOTS/pull/1) 的 `docs/browser-aram-design` 分支。提案中的阶段目标与待办保持原样；当前实现证据单独记录在 [实施状态](docs/implementation-status.md)，避免把设计目标当成已交付能力。

## 在线试玩

已部署：[HOTS ARAM Lab](https://hots-aram-lab.zjallenjiang.chatgpt.site/)。站点访问范围沿用现有配置。战场需要 WebGL 2。大厅默认展示原创英雄霜棱术士。战斗中会在命中目标上方显示玩家造成和受到的实际伤害。

右键或 Mac Control + 单击移动/攻击，左键攻击。触控板模式支持左键移动。右下角可选画质与操作方式。把鼠标移到战场，按 Q/W/E/R 朝鼠标位置施法。也可以点技能栏预览射程、弹道或范围，再左键确认。S 停止，Esc 取消瞄准或暂停。训练场开放全部技能。对局中 R 在团队等级 3 解锁，天赋在等级 2 选择。

[发布验证记录](docs/release-validation.md)区分已验证玩法与尚未验证的 3D 视觉。

## 云端运行

1. 在 GitHub Codespaces 中打开本仓库，使用仓库的 devcontainer；容器提供 Node.js 24，并在创建时运行 `npm ci`。
2. 在终端运行 `npm run dev -- --port 5173 --strictPort`。
3. 打开 **Ports** 面板中 5173 的浏览器预览。端口使用 Codespaces 默认的 **Private** 可见性；确认保持 **Private**。需要重置时，可在 Codespace 终端运行 `gh codespace ports visibility 5173:private -c "$CODESPACE_NAME"`。

这是临时开发预览。停止 Codespace 或开发进程后预览不可用；Codespaces 配置本身不负责发布；上方私人试玩独立托管。无需在本机安装 Unity、Node.js 或美术工具。

已有 Node.js 24 环境也可运行：

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

## 检查与构建

```sh
npm run check
npm test
npm run build
```

构建输出为 `dist/`。GitHub Actions 在 push、PR 或手动触发时依次执行上述检查，并归档以源码 SHA 命名的构建产物，保留 14 天；该流程不执行部署。静态产物只能运行本地模拟，不能提供权威服务器或私人联机房间。

## 设计与范围

- [原设计正文](docs/superpowers/specs/2026-11-06-browser-aram-design.md)
- [OpenSpec 提案](openspec/changes/browser-aram-foundation/proposal.md)
- [阶段与验收清单](openspec/changes/browser-aram-foundation/tasks.md)
- [当前实现状态与缺口](docs/implementation-status.md)

3D 视觉与手感验收需要素材、动画和实机性能证据。人机首版需要完整的技能与天赋验证。联机首版需要权威服务器与多客户端测试。

仓库 MIT LICENSE 适用于项目原创代码/文档；第三方依赖与外部素材分别遵守其许可。当前试玩使用原创模型和特效。

## 3D 修正进度

[实施状态](docs/implementation-status.md) 记录当前 3D 素材、特效、伤害飘字与实机验收进度。

### Offline build and Blender assets

Run `npm run build:offline` to export `dist-offline/hots-aram-offline.html`. Open it in a desktop browser with WebGL 2. The file embeds the runtime, styles, procedural character art, and arena tower. The build reports raw bytes and estimated gzip/Brotli delivery sizes. The normal `npm run build` still produces the web deployment in `dist/`.

The arena tower was authored in Blender 4.3.2. To regenerate the GLB, run:

```sh
blender -b --factory-startup --python-exit-code 1 --python tools/blender/arcane_tower.py -- public/models/arena/arcane-tower.glb
```

Pass an additional `.blend` path to save an editable Blender scene. Both teams reuse the same 980-triangle mesh and select their own rune and crystal colors in Three.js. The GLB is 55,424 bytes.
