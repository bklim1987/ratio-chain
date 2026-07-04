# 比例消消 Ratio Chain

面向国中七年级的教室大屏数学游戏：在 8×7 棋盘上拖拽相邻数字，组成等值比例链（如 `6:9 = 8:12`）消除得分，支持通配格「?」解未知数、提示系统，以及双人对战（三局两胜）与单人练习模式。

## 快速开始

```bash
# 安装依赖（需 pnpm）
pnpm install

# 启动游戏开发服务器（默认 http://localhost:5173）
pnpm dev

# 或指定包
pnpm --filter @workspace/ratio-chain run dev
```

游戏为纯前端应用，无需数据库或后端。

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动 ratio-chain 开发服务器 |
| `pnpm build` | 全工作区类型检查 + 构建 |
| `pnpm --filter @workspace/ratio-chain run typecheck` | 仅检查游戏代码 |
| `pnpm --filter @workspace/ratio-chain run build` | 构建游戏静态资源 |

## 技术栈

- pnpm workspaces、Node.js 24、TypeScript 5.9
- React 19 + Vite 7 + Tailwind CSS 4
- Web Audio API 合成音效（无音频文件）

## 项目结构

```
artifacts/ratio-chain/     主游戏（React + Vite）
artifacts/mockup-sandbox/  UI 原型沙盒
artifacts/api-server/      Express API（游戏不依赖）
lib/                       共享 API / DB 库
```

## 核心代码

| 路径 | 职责 |
|------|------|
| `src/game/logic.ts` | 棋盘生成、比例判定、计分、DFS 可解性、重力补格 |
| `src/game/engine.ts` | 拖拽输入、消除流程、弹框、动画状态 |
| `src/game/sound.ts` | Web Audio 合成音效 |
| `src/App.tsx` | 顶层状态机（menu → countdown → playing → 结算） |
| `src/components/` | PlayerBoard、SolveModal、StartMenu 等 UI |

## 架构要点

- 游戏状态在 `Engine` 类实例中（非 React state），便于每帧拖拽控制；React 通过 `forceTick` 回调重渲染
- 命中检测用 `document.elementFromPoint` + `data-r`/`data-c`，布局/镜像变化仍准确
- 双人模式各面板独立追踪 `pointerId`，互不干扰
- 棋盘生成/补格后用 DFS 保证至少存在一条有效 4 链

## 环境变量（可选）

本地开发有默认值，一般无需设置：

| 变量 | 默认 | 说明 |
|------|------|------|
| `PORT` | `5173` | Vite 开发/预览端口 |
| `BASE_PATH` | `/` | 应用 base URL |

## 开发注意

- 修改 `src/game/*` 后运行 `pnpm --filter @workspace/ratio-chain run typecheck`
- 算法改动建议用独立 `tsx` 脚本直接 import `logic.ts` 验证，UI 拖拽测试不足以覆盖算法正确性
