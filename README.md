# HOTS ARAM Lab — 浏览器战斗原型

TypeScript + Three.js 的单线战斗开发原型。它用于验证浏览器输入、战斗模拟、场景表现与人机对局循环；目前使用原创几何占位表现和简化机制，**不代表已还原《风暴英雄》英雄、地图、技能或天赋，也没有多人联机服务**。

设计提案保留自 [PR #1](https://github.com/ZJAllenJiang/HOTS/pull/1) 的 `docs/browser-aram-design` 分支。提案中的阶段目标与待办保持原样；当前实现证据单独记录在 [实施状态](docs/implementation-status.md)，避免把设计目标当成已交付能力。

## 云端运行

1. 在 GitHub Codespaces 中打开本仓库，使用仓库的 devcontainer；容器提供 Node.js 24，并在创建时运行 `npm ci`。
2. 在终端运行 `npm run dev -- --port 5173 --strictPort`。
3. 打开 **Ports** 面板中 5173 的浏览器预览。端口使用 Codespaces 默认的 **Private** 可见性；确认保持 **Private**。需要重置时，可在 Codespace 终端运行 `gh codespace ports visibility 5173:private -c "$CODESPACE_NAME"`。

这是临时开发预览。停止 Codespace 或开发进程后预览不可用；本配置没有创建或发布托管服务。无需在本机安装 Unity、Node.js 或美术工具。

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

视觉与手感样片（M0）需要真实素材管线、动画与性能证据；完整人机首版（M2）需要固定原作 build 的完整技能/天赋与规则验收；联机首版（M3）需要权威服务器与多客户端测试。目前的可运行原型不能替代这些验收。

仓库 MIT LICENSE 适用于项目原创代码/文档；第三方依赖与外部素材分别遵守其许可。当前未引入或分发暴雪原作素材。
