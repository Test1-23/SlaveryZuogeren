# Mineflayer Bot Manager

基于 [Mineflayer](https://github.com/PrismarineJS/mineflayer) 的 Minecraft 机器人管理系统，提供 Web 仪表盘、配置持久化和插拔式模块系统。

## 快速开始

```bash
npm install
npm start
```

打开 `http://localhost:3000`，在配置管理页面新建配置，填写服务器地址和版本，点击**启动**。

> **要求**: Node.js >= 22。Minecraft 服务器建议 1.21.11 离线模式。

## 功能

| 功能 | 说明 |
|---|---|
| **Web 仪表盘** | 实时显示所有机器人的生命值、饥饿值、坐标、维度、游戏模式，SSE 推送自动刷新 |
| **配置管理** | 新建/编辑/删除机器人配置，持久化到 SQLite。配置项：服务器地址、端口、MC 版本、认证方式、用户名、启用模块 |
| **一键启动/停止** | 从配置页面直接启动机器人，仪表盘实时监控 |
| **多机器人管理** | 同时运行多个机器人，统一管理 |
| **插拔式模块系统** | 运行时加载/卸载功能模块（寻路、攻击、自动进食等），支持依赖解析 |

## 项目结构

```
├── bot/
│   ├── cli.js              # CLI 入口 (npm start)
│   ├── index.js            # 装配点：组装依赖并导出
│   ├── botFactory.js       # 纯工厂函数：配置 → mineflayer bot
│   ├── botState.js         # 适配器：bot 对象 → 状态快照
│   ├── manager.js          # 机器人管理器：生命周期、状态追踪
│   ├── database.js         # SQLite 持久化层
│   ├── config.js           # 默认配置
│   ├── moduleLoader.js     # 模块加载器
│   ├── moduleRegistry.js   # 模块注册表类
│   ├── modules/            # 功能模块目录
│   │   └── chat/           # 聊天消息捕获与发送
│   ├── web/
│   │   ├── server.js       # Express 服务器（装配路由）
│   │   ├── routes/         # API 路由模块
│   │   │   ├── bots.js     # /api/bots
│   │   │   ├── configs.js  # /api/configs
│   │   │   ├── modules.js  # /api/modules
│   │   │   └── sse.js      # /api/events (SSE)
│   │   └── public/         # 前端静态文件
│   └── test/               # 测试套件（65 tests）
├── mineflayer/             # mineflayer 库 (PrismarineJS, pc26_2 分支)
└── info/                   # 项目文档
```

## API 端点 (13 个)

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/bots` | 所有运行中机器人的实时状态 |
| POST | `/api/bots/start` | 按配置 ID 启动机器人 `{ configId }` |
| POST | `/api/bots/stop/:id` | 停止指定机器人 |
| POST | `/api/bots/remove-dead/:id` | 清理已断连的僵尸条目 |
| GET | `/api/bots/:id/chat` | 获取指定机器人的聊天消息历史 |
| POST | `/api/bots/:id/chat` | 以机器人身份发送聊天 `{ message }` |
| GET | `/api/configs` | 所有配置列表 |
| GET | `/api/configs/:id` | 单个配置详情 |
| POST | `/api/configs` | 新建配置 |
| PUT | `/api/configs/:id` | 更新配置 |
| DELETE | `/api/configs/:id` | 删除配置 |
| GET | `/api/modules` | 可用模块列表 |
| GET | `/api/events` | SSE 实时推送 (bot 状态变化) |

## 机器人状态字段

仪表盘展示每个机器人的以下信息：

| 字段 | 说明 |
|---|---|
| `name` / `username` | 配置名称和游戏内用户名 |
| `host:port` | 连接的服务器地址 |
| `status` | online / connecting / stopped / kicked / error |
| `health` | 生命值 (0–20) |
| `food` | 饥饿值 (0–20) |
| `position` | 当前坐标 (x, y, z) |
| `dimension` | 所在维度 (overworld / the_nether / the_end) |
| `gameMode` | 游戏模式 (survival / creative / adventure / spectator) |
| `modules` | 已加载的模块列表 |

## 模块系统

每个模块是 `bot/modules/` 下的一个文件夹，包含 `index.js`：

```js
module.exports = {
  name: 'chat',              // 唯一标识
  version: '1.0.0',
  dependencies: [],           // 依赖的其他模块名
  inject(bot, options) {},    // 初始化：注册事件、挂载方法
  unload(bot) {}              // 清理：移除事件、释放资源 (可选)
}
```

参考 `bot/modules/chat/` 了解完整示例。运行时动态管理：

```js
bot.moduleLoader.load('chat')   // 加载模块
bot.moduleLoader.unload('chat') // 卸载模块
bot.moduleLoader.list()         // 列出可用模块
bot.moduleLoader.loaded()       // 已加载的模块
```

## 编程接口

```js
const { createBot, manager, database, startServer } = require('./bot')

// 启动 Web 控制面板
await startServer()

// 创建并连接机器人
const bot = createBot({
  host: 'localhost',
  port: 25565,
  version: '1.21.11',
  auth: 'offline',
  username: 'MyBot',
  modules: ['chat']
})

// 用管理器启动（自动注册到仪表盘）
const config = database.createConfig({ name: 'Bot1', host: 'localhost', version: '1.21.11' })
await manager.startBot(config)
```

## 测试

```bash
npm test                 # 全部 66 个测试 (单元 + 集成)
npm run test:unit        # 仅单元测试 (30): botState+moduleRegistry+database
npm run test:integration # 仅集成测试 (36): moduleLoader+manager+web
npm run test:e2e         # 端到端测试 (需 Minecraft 服务器运行)
```

## 技术栈

| 层 | 技术 |
|---|---|
| 机器人引擎 | Mineflayer (PrismarineJS) |
| Web 框架 | Express |
| 数据库 | SQLite (better-sqlite3) |
| 实时推送 | Server-Sent Events |
| 前端 | 原生 HTML/CSS/JS，暗色主题 |
| 测试 | Mocha + Supertest + Node assert |

## 架构原则

- **依赖注入**: Manager、Web Server、BotFactory 均接受依赖参数，可独立测试
- **纯工厂**: `botFactory.js` 是唯一的 bot 创建入口，接受扁平配置
- **适配器隔离**: `botState.js` 是唯一接触 mineflayer 内部属性的模块
- **惰性初始化**: 数据库在首次查询时才打开连接，避免 require 时副作用
- **路由拆分**: 每个 API 组是独立的路由模块，遵循 `mount(app, deps)` 模式
