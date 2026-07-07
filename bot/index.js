/**
 * Bot 入口脚本 — 创建并配置 Minecraft 机器人
 *
 * 用法:
 *   const { createBot, startBot } = require('./bot')
 *
 *   // 方式1: 快速启动
 *   const bot = await startBot()
 *
 *   // 方式2: 分步创建，自定义配置
 *   const bot = createBot({ server: { host: 'example.com' } })
 *
 * 模块系统:
 *   在 config.js 的 modules 数组中加入模块名即可自动加载。
 *   运行时可通过 moduleLoader.loadModule / moduleLoader.unloadModule 动态插拔。
 */

const mineflayer = require('mineflayer')
const defaultConfig = require('./config')
const moduleLoader = require('./moduleLoader')

/**
 * 深度合并两个对象 (仅合并顶层和一层嵌套)
 */
function mergeConfig (defaults, overrides) {
  const result = { ...defaults }
  for (const key of Object.keys(overrides)) {
    if (overrides[key] && typeof overrides[key] === 'object' && !Array.isArray(overrides[key])) {
      result[key] = { ...defaults[key], ...overrides[key] }
    } else {
      result[key] = overrides[key]
    }
  }
  return result
}

/**
 * 创建并初始化一个 Minecraft Bot
 * @param {object} [customConfig] - 自定义配置，会与默认配置合并
 * @returns {object} bot 实例
 */
function createBot (customConfig = {}) {
  const config = mergeConfig(defaultConfig, customConfig)

  const bot = mineflayer.createBot({
    host: config.server.host,
    port: config.server.port,
    username: config.bot.username,
    auth: config.server.auth,
    version: config.server.version,
    brand: config.bot.brand,
    ...config.options
  })

  // 将模块加载器挂载到 bot 上，方便运行时动态管理模块
  bot.moduleLoader = {
    load: async (name, opts) => moduleLoader.loadModule(bot, name, opts),
    unload: async (name) => moduleLoader.unloadModule(bot, name),
    list: () => moduleLoader.listModules(),
    loaded: () => moduleLoader.getLoadedModules(bot)
  }

  // 注入全局错误处理
  bot.on('error', (err) => {
    console.error('[Bot] 错误:', err.message)
  })

  bot.on('kicked', (reason, loggedIn) => {
    console.log(`[Bot] 被踢出服务器: ${reason} (loggedIn: ${loggedIn})`)
  })

  bot.on('end', (reason) => {
    console.log(`[Bot] 连接断开: ${reason}`)
  })

  // 连接成功后初始化模块
  bot.once('spawn', async () => {
    console.log(`[Bot] ${bot.username} 已生成，游戏模式: ${bot.game.gameMode}, 维度: ${bot.game.dimension}`)
    await moduleLoader.initModules(bot, config)
    bot.emit('ready')
  })

  return bot
}

/**
 * 快速启动一个 Bot (返回 Promise，resolve 在 bot 就绪时触发)
 * @param {object} [customConfig] - 自定义配置
 * @returns {Promise<object>} bot 实例
 */
function startBot (customConfig = {}) {
  return new Promise((resolve, reject) => {
    const bot = createBot(customConfig)

    bot.once('ready', () => {
      console.log('[Bot] 就绪，所有模块已加载')
      resolve(bot)
    })

    bot.once('error', (err) => {
      // 只在 bot 尚未就绪时 reject
      reject(err)
    })

    // 安全超时 (30 秒)
    setTimeout(() => {
      reject(new Error('[Bot] 连接超时 (30s)'))
    }, 30000)
  })
}

// 导出
module.exports = { createBot, startBot, moduleLoader, defaultConfig }

// 如果直接运行此文件 (node bot/index.js)，则启动一个 bot
if (require.main === module) {
  console.log('[Bot] 正在启动...')

  // 支持命令行参数覆盖
  const host = process.argv[2] || defaultConfig.server.host
  const username = process.argv[3] || defaultConfig.bot.username

  startBot({
    server: { host },
    bot: { username }
  })
    .then((bot) => {
      console.log(`[Bot] 已连接到 ${host}，用户名: ${username}`)
      console.log('[Bot] 可用方法: bot.moduleLoader.load("模块名"), bot.moduleLoader.unload("模块名"), bot.moduleLoader.list(), bot.moduleLoader.loaded()')
    })
    .catch((err) => {
      console.error('[Bot] 启动失败:', err.message)
      process.exit(1)
    })
}
