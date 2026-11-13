# 实施状态：本地模拟原型

本文记录实现范围，不修改 [PR #1 设计提案](https://github.com/ZJAllenJiang/HOTS/pull/1) 的历史验收清单。`docs/superpowers/` 与 `openspec/` 从原 `docs/browser-aram-design` 分支保留，正文中“仅设计”的状态描述对应提案形成时点。

## 当前范围

| 项目 | 范围与限制 |
|---|---|
| 技术栈 | Node.js 24、Vite、严格 TypeScript、Three.js；npm lockfile 固定依赖 |
| 客户端 | 浏览器本地运行的战斗原型；渲染与战斗状态通过 TypeScript 契约连接 |
| 内容 | 三种实验英雄原型：ranger、frost、guardian；机制与参数为开发验证用途 |
| 美术 | 原创几何占位表现；没有原作模型、贴图、动画、图标或地图资产 |
| 模拟 | 本地战斗与训练模式的工程切片；具体已验证场景以测试代码与执行结果为准 |
| 云端开发 | devcontainer 提供 Node.js 24、依赖安装和 5173 转发；预览端口保持 Private |
| CI | 安装、类型检查、测试、构建与按 SHA 归档 `dist/` 的工作流配置 |
| 联机与部署 | 私人静态试玩已部署；尚无权威服务器、房间、同步、重连或 WSS |

## 对照原设计的验收缺口

- **M0 未完成**：占位几何不能证明原作视觉目标达标。仍需明确素材来源、可复现转换管线、骨骼/动画检查、正常镜头截图与动作视频，以及固定设备上的帧时间和体积记录。
- **M1 是原型目标，不能仅凭能运行宣告完成**：仍需以自动测试和浏览器操作证据确认 1 人 + 9 AI、兵线/建筑、经验/天赋、核心胜负及重开循环。必须另验导航阻挡、同 tick 致死、输入边界与同运行时可重复性。
- **M2 未完成**：没有固定原作 build 的全量能力与天赋、六英雄正式池、三选一及完整地图规则验收。
- **M3 未完成**：没有常驻权威模拟、私人房间、版本拒绝、队伍视野过滤、断线接管或双浏览器/远端延迟测试。
- **正式云端交付未完成**：私人静态原型已发布；完整联机交付所需的内容/协议版本、资产清单、运行时健康检查、排空、回滚与容量测量尚待实施。

## 验证边界

`npm run check`、`npm test`、`npm run build` 是本原型的自动检查入口。测试通过只说明所覆盖的代码场景通过，不代表原作规则准确、视觉验收、跨浏览器确定性或联机能力已验证。

devcontainer 与 Actions 文件在仓库中提供可审阅配置；只有实际创建 Codespace、执行远端 CI 后，才能声称对应平台运行已验证。工作流不请求发布权限，不执行部署。浏览器验收与最终检查结果应随本次交付报告，不能由配置文件的存在推断。

## 2026-11-08 发布记录

详见 [release-validation.md](release-validation.md)。已部署的可玩技术原型不代表 M0 原作视觉或 M1 完整规则验收完成。

## 3D-only correction (version 2)

3D-only recovery, slower pacing, desktop controls and GLB ingestion are implemented and deployed; 21 tests and current-runtime CI passed. See [release validation](release-validation.md). Real HOTS models and Mac/Windows GPU acceptance remain incomplete; M0 is still open.

## 2026-11-09 animation follow-up

PR #3 is merged. Accepted combat actions now trigger single-play model animations; casting has its own clip, pause freezes animation, and a new match clears previous actor state. Typecheck, 26 tests and production build passed. See `docs/assets/jaina-integration.md` for validation boundaries; M0/M2/M3 remain open.

## 2026-11-09 ranged Q projectile slice

Ranger/frost Q now use fixed-step windup, travel, first-hit swept collision and actual-contact damage, with 3D charge/bolt/impact presentation. This changes experimental Q behavior from line-wide piercing to first enemy hit; UI descriptions match. Typecheck and 49 tests passed. See `docs/changes/2026-11-09-projectile-combat.md` and `openspec/changes/projectile-combat/tasks.md` for evidence and remaining acceptance. Original M0/M1 milestones remain incomplete.

## 2026-11-13 Blender asset and offline export

An original Blender tower replaces the primitive tower after its GLB loads. The renderer shares geometry across teams and applies separate rune and crystal colors. The 55,424-byte GLB has 980 triangles across six primitives and needs no external textures.

The optional offline build contains the arena and Jaina assets in one 5,241,215-byte HTML file. Local compression estimates are 2,130,285 bytes with gzip and 1,986,709 bytes with Brotli. TypeScript, both builds and 54 tests passed. The shared cloud browser reported unavailable WebGL 2. Mac and Windows hardware performance remains open.
