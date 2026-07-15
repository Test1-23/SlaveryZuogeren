/**
 * Bot 管理器 — 管理所有运行中的机器人实例
 *
 * 依赖注入: new BotManager({ createBot })
 *   测试时可以传入 mock createBot。
 */

const EventEmitter = require('events')
const { snapshot } = require('./botState')
const log = require('./logger').createLogger('Manager')

class BotManager extends EventEmitter {
  /**
   * @param {object} deps
   * @param {function} deps.createBot - 工厂函数 (config) => bot
   */
  constructor ({ createBot }) {
    super()
    this._createBot = createBot
    this._bots = new Map()
    this._nextId = 1
  }

  get count () { return this._bots.size }

  /** 获取 bot 实例 (供内部模块访问 chatMessages 等) */
  getBot (id) {
    const entry = this._bots.get(id)
    return entry?.bot ?? null
  }

  getBots () {
    return Array.from(this._bots.values()).map(e => this._snapshot(e))
  }

  async startBot (config) {
    const id = String(this._nextId++)
    const entry = { id, configId: config.id, config: { ...config }, bot: null, status: 'connecting', startedAt: new Date().toISOString() }
    this._bots.set(id, entry)
    log.info(`启动 bot #${id}: ${config.name} → ${config.host}:${config.port}`)
    this.emit('update')

    try {
      const bot = this._createBot(config)
      entry.bot = bot

      bot.on('health', () => this.emit('update'))
      bot.on('move', () => this.emit('update'))
      bot.on('death', () => this.emit('update'))
      bot.on('spawn', () => { entry.status = 'online'; this.emit('update') })
      bot.on('kicked', (r) => { entry.status = 'kicked'; entry.kickReason = r; this.emit('update') })
      bot.on('end', (r) => { entry.status = 'stopped'; entry.endReason = r; this.emit('update') })
      bot.on('error', (e) => { entry.status = 'error'; entry.error = e.message; this.emit('update') })

      await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('连接超时 (30s)')), 30000)
        bot.once('ready', () => { clearTimeout(t); resolve() })
        bot.once('error', (e) => { clearTimeout(t); reject(e) })
      })

      entry.status = 'online'
      this.emit('update')
      return entry
    } catch (err) {
      entry.status = 'error'; entry.error = err.message
      log.error(`启动失败 #${id}: ${err.message}`)
      try { entry.bot?.end('startup failed') } catch (_) { /* ignore */ }
      this.emit('update')
      throw err
    }
  }

  stopBot (id) {
    const entry = this._bots.get(id)
    if (!entry) throw new Error(`Bot ${id} 不存在`)
    log.info(`停止 bot #${id}: ${entry.config?.name || '?'}`)
    try { entry.bot?.end('manager stop') } catch (_) { /* ignore */ }
    this._bots.delete(id)
    this.emit('update')
  }

  /** 清理已停止/kicked/error 的僵尸条目 */
  removeDead (id) {
    const entry = this._bots.get(id)
    if (!entry) throw new Error(`Bot ${id} 不存在`)
    if (entry.status === 'online' || entry.status === 'connecting') {
      throw new Error(`Bot ${id} 仍在运行，请先停止`)
    }
    this._bots.delete(id)
    this.emit('update')
  }

  _snapshot (entry) {
    return {
      id: entry.id, configId: entry.configId, name: entry.config.name,
      host: entry.config.host, port: entry.config.port, version: entry.config.version,
      status: entry.status, error: entry.error || null,
      kickReason: entry.kickReason || null, startedAt: entry.startedAt,
      ...snapshot(entry.bot)
    }
  }
}

module.exports = { BotManager }
