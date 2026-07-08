/**
 * Bot 工厂 — 纯函数：扁平配置 → mineflayer bot 实例
 *
 * 这是唯一创建 bot 的地方。不接受嵌套 config 对象，
 * 只接受与数据库行一致的扁平结构。
 *
 * @param {object} cfg
 * @param {string} cfg.host
 * @param {number} cfg.port
 * @param {string} cfg.username
 * @param {string} cfg.auth
 * @param {string} cfg.version
 * @param {string[]} cfg.modules
 * @param {object} cfg.options
 * @returns {object} mineflayer bot 实例
 */

const mineflayer = require('mineflayer')
const moduleLoader = require('./moduleLoader')
const defaults = require('./config')

function createBot (cfg = {}) {
  const host = cfg.host || defaults.host
  const port = cfg.port || defaults.port
  const username = cfg.username || defaults.username
  const auth = cfg.auth || defaults.auth
  const version = cfg.version || defaults.version
  const modules = cfg.modules || defaults.modules
  const options = { ...defaults.options, ...(cfg.options || {}) }

  const bot = mineflayer.createBot({
    host,
    port,
    username,
    auth,
    version: version || false,
    brand: defaults.brand,
    ...options
  })

  // 挂载模块加载器
  bot.moduleLoader = {
    load: async (name, opts) => moduleLoader.loadModule(bot, name, opts),
    unload: async (name) => moduleLoader.unloadModule(bot, name),
    list: () => moduleLoader.listModules(),
    loaded: () => moduleLoader.getLoadedModules(bot)
  }

  // 基础事件日志
  bot.on('error', (err) => { console.error('[Bot] 错误:', err.message) })
  bot.on('kicked', (reason, loggedIn) => { console.log(`[Bot] 被踢出服务器: ${reason}`) })
  bot.on('end', (reason) => { console.log(`[Bot] 连接断开: ${reason}`) })

  // spawn 后加载模块
  bot.once('spawn', async () => {
    console.log(`[Bot] ${bot.username} 已生成，游戏模式: ${bot.game?.gameMode}`)
    for (const name of modules) {
      try { await moduleLoader.loadModule(bot, name) } catch (e) { console.error(`[Bot] 模块 ${name} 加载失败:`, e.message) }
    }
    bot.emit('ready')
  })

  return bot
}

module.exports = { createBot }
