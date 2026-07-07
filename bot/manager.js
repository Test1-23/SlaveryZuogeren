/**
 * Bot 管理器 — 管理所有运行中的机器人实例
 *
 * 职责:
 *   - 注册/注销运行中的 bot
 *   - 查询 bot 实时状态 (生命、饥饿、坐标 等)
 *   - 启动/停止 bot
 */

const EventEmitter = require('events')
const { createBot: createMineflayerBot } = require('./index')

class BotManager extends EventEmitter {
  constructor () {
    super()
    this.bots = new Map() // botId -> { id, configId, bot, config, startedAt }
    this.nextId = 1
  }

  /**
   * 启动一个机器人
   * @param {object} config - 数据库中的配置对象
   * @returns {Promise<object>} 运行信息
   */
  async startBot (config) {
    const botId = String(this.nextId++)

    const entry = {
      id: botId,
      configId: config.id,
      config: { ...config },
      bot: null,
      startedAt: new Date().toISOString(),
      status: 'connecting'
    }

    this.bots.set(botId, entry)
    this.emit('update')

    try {
      const bot = createMineflayerBot({
        server: {
          host: config.host,
          port: config.port,
          version: config.version || false,
          auth: config.auth
        },
        bot: {
          username: config.username
        },
        options: config.options || {},
        modules: config.modules || []
      })

      entry.bot = bot

      // 监听状态变化
      bot.on('health', () => this.emit('update'))
      bot.on('move', () => this.emit('update'))
      bot.on('death', () => this.emit('update'))
      bot.on('spawn', () => {
        entry.status = 'online'
        this.emit('update')
      })
      bot.on('kicked', (reason) => {
        entry.status = 'kicked'
        entry.kickReason = reason
        this.emit('update')
      })
      bot.on('end', (reason) => {
        entry.status = 'stopped'
        entry.endReason = reason
        this.emit('update')
      })
      bot.on('error', (err) => {
        entry.status = 'error'
        entry.error = err.message
        this.emit('update')
      })

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('连接超时 (30s)'))
        }, 30000)
        bot.once('ready', () => {
          clearTimeout(timeout)
          resolve()
        })
        bot.once('error', (err) => {
          clearTimeout(timeout)
          reject(err)
        })
      })

      entry.status = 'online'
      this.emit('update')
      return entry
    } catch (err) {
      entry.status = 'error'
      entry.error = err.message
      this.emit('update')
      throw err
    }
  }

  /**
   * 停止一个机器人
   * @param {string} botId
   */
  stopBot (botId) {
    const entry = this.bots.get(botId)
    if (!entry) throw new Error(`Bot ${botId} 不存在`)
    if (entry.bot) {
      try { entry.bot.end('manager stop') } catch (_) { /* ignore */ }
    }
    this.bots.delete(botId)
    this.emit('update')
  }

  /**
   * 获取所有运行中 bot 的状态快照
   * @returns {Array}
   */
  getBots () {
    return Array.from(this.bots.values()).map(entry => this.getBotState(entry))
  }

  /**
   * 获取单个 bot 的状态快照
   * @param {object} entry
   * @returns {object}
   */
  getBotState (entry) {
    const { bot, config } = entry
    const state = {
      id: entry.id,
      configId: entry.configId,
      name: config.name,
      host: config.host,
      port: config.port,
      version: config.version,
      status: entry.status,
      error: entry.error || null,
      kickReason: entry.kickReason || null,
      startedAt: entry.startedAt
    }

    if (bot) {
      state.username = bot.username
      state.health = bot.health ?? 0
      state.food = bot.food ?? 0
      state.foodSaturation = bot.foodSaturation ?? 0
      state.gameMode = bot.game?.gameMode ?? 'unknown'
      state.dimension = bot.game?.dimension ?? 'unknown'
      state.position = bot.entity?.position
        ? { x: Math.round(bot.entity.position.x), y: Math.round(bot.entity.position.y), z: Math.round(bot.entity.position.z) }
        : null
      state.yaw = bot.entity?.yaw ?? null
      state.pitch = bot.entity?.pitch ?? null
      state.isAlive = bot.isAlive ?? false
      state.isSleeping = bot.isSleeping ?? false
      state.modules = bot.moduleLoader?.loaded() ?? []
    }

    return state
  }

  /**
   * 获取 bot 数量
   */
  get count () {
    return this.bots.size
  }
}

// 单例
module.exports = new BotManager()
