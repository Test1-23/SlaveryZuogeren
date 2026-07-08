/**
 * Bot 应用入口 — 装配所有模块并导出
 *
 * 用法:
 *   const { manager, database, moduleLoader, startServer, createBot } = require('./bot')
 *
 *   // 启动 Web 控制面板
 *   startServer()
 *
 *   // 创建 bot
 *   const bot = createBot({ host: 'localhost', username: 'MyBot' })
 */

const { createBot } = require('./botFactory')
const { BotManager } = require('./manager')
const moduleLoader = require('./moduleLoader')
const database = require('./database')
const { createServer } = require('./web/server')

// 装配
const manager = new BotManager({ createBot })

async function startServer () {
  const { start } = createServer({
    manager,
    database,
    moduleLoader,
    port: parseInt(process.env.WEB_PORT) || 3000
  })
  await start()
}

module.exports = { createBot, manager, database, moduleLoader, startServer }
