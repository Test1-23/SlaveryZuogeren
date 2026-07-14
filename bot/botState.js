/**
 * BotState 适配器 — 深模块：bot 对象 → 状态快照
 *
 * 这是唯一知道 mineflayer bot 对象内部属性结构的模块。
 * 当 mineflayer 版本升级改变属性名时，只需修改此文件。
 * 测试时注入假 bot 对象即可，无需连接真实 Minecraft 服务器。
 *
 * @param {object} bot - mineflayer bot 实例 (或满足接口的假对象)
 * @returns {object} 扁平状态快照
 */

function snapshot (bot) {
  if (!bot) return _empty()

  return {
    username: bot.username ?? '?',
    health: bot.health ?? 0,
    food: bot.food ?? 0,
    foodSaturation: bot.foodSaturation ?? 0,
    gameMode: bot.game?.gameMode ?? 'unknown',
    dimension: bot.game?.dimension ?? 'unknown',
    position: bot.entity?.position
      ? { x: Math.round(bot.entity.position.x), y: Math.round(bot.entity.position.y), z: Math.round(bot.entity.position.z) }
      : null,
    yaw: bot.entity?.yaw ?? null,
    pitch: bot.entity?.pitch ?? null,
    isAlive: bot.isAlive ?? false,
    isSleeping: bot.isSleeping ?? false,
    modules: bot.moduleLoader?.loaded() ?? [],
    players: bot.players ? Object.values(bot.players).map(p => ({ username: p.username, ping: p.ping })) : []
  }
}

function _empty () {
  return {
    username: '?', health: 0, food: 0, foodSaturation: 0,
    gameMode: 'unknown', dimension: 'unknown',
    position: null, yaw: null, pitch: null,
    isAlive: false, isSleeping: false, modules: [], players: []
  }
}

module.exports = { snapshot }
