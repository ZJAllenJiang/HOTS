# Browser ARAM Foundation

## Why

用户希望打开浏览器即可体验接近《风暴英雄》的清晰 3D 单线乱斗，并可直接在云端开发和部署。当前仓库只有 LICENSE，需要先确定可实现的玩法、素材管线、技术边界和阶段验收。

## What Changes

- 提议创建共享模拟核心，支撑无服务器人机与服务器权威联机。
- 设计 5v5 单线、团队经验、天赋、少量完整英雄、兵线建筑与结算。
- 将视觉清晰度、动画、资源预算作为交付标准。
- 规划私人房间、AI 补位、掉线重连与一致性校验。
- 采用云开发容器、CI、预览与版本化生产发布。

本变更当前交付物仅为设计；上述能力是拟议目标，不是已完成实现。

## Capabilities

### New Capabilities

- `single-lane-battle`: 从选人到核心胜负的单线对局。
- `hero-combat`: 团队成长、技能、天赋与机器人行为。
- `browser-presentation`: 浏览器操作、清晰渲染与版本化资源加载。
- `online-rooms`: 权威私人联机、身份、同步与重连。
- `cloud-delivery`: 云开发、可复现构建、分阶段托管和回滚。

### Modified Capabilities

无。仓库尚无 baseline specs。

## Impact

后续影响前端、共享战斗模拟、房间服务器、内容数据、资产加工、测试和发布。推荐 TypeScript/Three.js；Unity 作为已评估备选。没有创建外部付费资源或上传原作资产。
