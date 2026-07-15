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
const { loadModule, unloadModule, listModules, getLoadedModules, loadModules } = require('./moduleLoader')
const defaults = require('./config')
const log = require('./logger').createLogger('BotFactory')

function createBot (cfg = {}, { moduleLoader } = {}) {
  const ml = moduleLoader || { loadModule, unloadModule, listModules, getLoadedModules, loadModules }
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
    load: (name, opts) => ml.loadModule(bot, name, opts),
    unload: (name) => ml.unloadModule(bot, name),
    list: () => ml.listModules(),
    loaded: () => ml.getLoadedModules(bot)
  }

  // 基础事件日志
  bot.on('error', (err) => { log.error(err.message) })
  bot.on('kicked', (reason) => { log.warn(`被踢出: ${reason}`) })

  bot.on('end', (reason) => {
    log.info(`连接断开: ${reason}`)
    const names = ml.getLoadedModules(bot).map(m => m.name).reverse()
    for (const name of names) ml.unloadModule(bot, name).catch(() => {})
  })

  bot.once('spawn', async () => {
    log.info(`${bot.username} 已生成, ${bot.game?.gameMode}`)
    await ml.loadModules(bot, modules)
    bot.emit('ready')
  })

  return bot
}

module.exports = { createBot }
