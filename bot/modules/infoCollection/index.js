/**
 * InfoCollection 模块 — 被动采集 bot 可获取的所有服务器信息
 *
 * 不控制 bot，只监听事件并更新 bot._infoCollection 快照。
 * 采集内容:
 *   time, weather, experience, server, worldBounds, entityStats,
 *   heldItem, oxygen, scoreboardSidebar, players, spawnPoint
 */

const log = require('../../logger').createLogger('InfoCollection')

module.exports = {
  name: 'infoCollection',
  version: '1.0.0',
  dependencies: [],

  inject (bot, options) {
    const info = {}
    bot._infoCollection = info

    // ── 时间 ──
    bot._info_onTime = () => {
      info.time = {
        timeOfDay: bot.time?.timeOfDay ?? 0,
        day: bot.time?.day ?? 0,
        isDay: bot.time?.isDay ?? true,
        moonPhase: bot.time?.moonPhase ?? 0,
        age: bot.time?.age ?? 0
      }
      bot.emit('infoUpdated')
    }
    bot.on('time', bot._info_onTime)

    // ── 天气 ──
    bot._info_onRain = () => {
      info.weather = {
        isRaining: bot.isRaining ?? false,
        rainState: bot.rainState ?? 0,
        thunderState: bot.thunderState ?? 0
      }
      bot.emit('infoUpdated')
    }
    bot.on('rain', bot._info_onRain)

    // ── 经验 ──
    bot._info_onExp = () => {
      info.experience = {
        level: bot.experience?.level ?? 0,
        points: bot.experience?.points ?? 0,
        progress: Math.round((bot.experience?.progress ?? 0) * 100)
      }
      bot.emit('infoUpdated')
    }
    bot.on('experience', bot._info_onExp)

    // ── 服务器 / 世界 ──
    bot._info_onGame = () => {
      info.server = {
        difficulty: bot.game?.difficulty ?? '?',
        hardcore: bot.game?.hardcore ?? false,
        serverBrand: bot.game?.serverBrand ?? '?',
        maxPlayers: bot.game?.maxPlayers ?? 0
      }
      info.worldBounds = {
        minY: bot.game?.minY ?? 0,
        height: bot.game?.height ?? 256,
        viewDistance: bot.game?.serverViewDistance ?? 0
      }
      info.spawnPoint = bot.spawnPoint
        ? { x: Math.round(bot.spawnPoint.x), y: Math.round(bot.spawnPoint.y), z: Math.round(bot.spawnPoint.z) }
        : null
      bot.emit('infoUpdated')
    }
    bot.on('game', bot._info_onGame)
    bot.on('login', bot._info_onGame) // 首次加载

    // ── 实体统计 ──
    bot._info_onEntities = () => {
      const entities = Object.values(bot.entities || {})
      const players = entities.filter(e => e.type === 'player').length
      const mobs = entities.filter(e => e.type === 'mob').length
      const items = entities.filter(e => e.type === 'object' && e.name === 'item').length
      info.entityStats = { total: entities.length, players, mobs, items }
      bot.emit('infoUpdated')
    }
    bot.on('entitySpawn', bot._info_onEntities)
    bot.on('entityGone', bot._info_onEntities)

    // ── 手持物品 ──
    bot._info_onHeld = () => {
      const item = bot.heldItem
      info.heldItem = item ? { name: item.name, displayName: item.displayName, count: item.count } : null
      bot.emit('infoUpdated')
    }
    bot.on('heldItemChanged', bot._info_onHeld)

    // ── 氧气 ──
    bot._info_onBreath = () => {
      info.oxygen = bot.oxygenLevel ?? 20
      bot.emit('infoUpdated')
    }
    bot.on('breath', bot._info_onBreath)

    // ── 记分板 (仅 sidebar) ──
    bot._info_onScore = () => {
      const sidebar = bot.scoreboard?.sidebar
      if (sidebar) {
        info.scoreboard = { title: sidebar.title, entries: sidebar.items.slice(0, 15).map(i => ({ name: i.name, value: i.value })) }
      }
      bot.emit('infoUpdated')
    }
    bot.on('scoreUpdated', bot._info_onScore)
    bot.on('scoreRemoved', bot._info_onScore)
    bot.on('scoreboardCreated', bot._info_onScore)
    bot.on('scoreboardTitleChanged', bot._info_onScore)
    bot.on('scoreboardPosition', bot._info_onScore)

    // ── 玩家详情 ──
    bot._info_onPlayers = () => {
      info.players = bot.players
        ? Object.values(bot.players).map(p => ({
          username: p.username,
          uuid: p.uuid,
          ping: p.ping,
          gamemode: p.gamemode,
          displayName: p.displayName?.toString?.() || p.username
        }))
        : []
      bot.emit('infoUpdated')
    }
    bot.on('playerJoined', bot._info_onPlayers)
    bot.on('playerUpdated', bot._info_onPlayers)
    bot.on('playerLeft', bot._info_onPlayers)

    // ── 初次采集 ──
    bot.once('spawn', () => {
      bot._info_onTime()
      bot._info_onRain()
      bot._info_onExp()
      bot._info_onGame()
      bot._info_onEntities()
      bot._info_onHeld()
      bot._info_onBreath()
      bot._info_onScore()
      bot._info_onPlayers()
      log.info('模块已注入')
    })
  },

  unload (bot) {
    bot.removeListener('time', bot._info_onTime)
    bot.removeListener('rain', bot._info_onRain)
    bot.removeListener('experience', bot._info_onExp)
    bot.removeListener('game', bot._info_onGame)
    bot.removeListener('login', bot._info_onGame)
    bot.removeListener('entitySpawn', bot._info_onEntities)
    bot.removeListener('entityGone', bot._info_onEntities)
    bot.removeListener('heldItemChanged', bot._info_onHeld)
    bot.removeListener('breath', bot._info_onBreath)
    bot.removeListener('scoreUpdated', bot._info_onScore)
    bot.removeListener('scoreRemoved', bot._info_onScore)
    bot.removeListener('scoreboardCreated', bot._info_onScore)
    bot.removeListener('scoreboardTitleChanged', bot._info_onScore)
    bot.removeListener('scoreboardPosition', bot._info_onScore)
    bot.removeListener('playerJoined', bot._info_onPlayers)
    bot.removeListener('playerUpdated', bot._info_onPlayers)
    bot.removeListener('playerLeft', bot._info_onPlayers)
    delete bot._infoCollection
    log.info('模块已卸载')
  }
}
