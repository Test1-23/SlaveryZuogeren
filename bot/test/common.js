/**
 * 测试工具集 — mock 工厂和辅助函数
 */

const { EventEmitter } = require('events')
const path = require('path')

/**
 * 创建一个假的 mineflayer bot (EventEmitter)
 * 可选择性附加 botState 需要的属性
 */
function fakeBot (overrides = {}) {
  const bot = new EventEmitter()
  Object.assign(bot, {
    username: 'TestBot',
    health: 20,
    food: 20,
    foodSaturation: 5,
    game: { gameMode: 'survival', dimension: 'overworld', hardcore: false, difficulty: 'peaceful' },
    entity: {
      position: { x: 100.3, y: 64.0, z: -50.7 },
      yaw: 1.57,
      pitch: 0
    },
    isAlive: true,
    isSleeping: false,
    moduleLoader: {
      loaded: () => [{ name: 'echo', version: '1.0.0' }]
    },
    _moduleRegistry: null, // placeholder for moduleLoader
    chat: () => {}, // no-op
    end: () => {} // no-op
  }, overrides)
  return bot
}

/**
 * 创建一个假数据库对象
 */
function fakeDatabase (overrides = {}) {
  return {
    getAllConfigs: () => [],
    getConfig: () => null,
    createConfig: () => { throw new Error('not implemented') },
    updateConfig: () => null,
    deleteConfig: () => false,
    ...overrides
  }
}

/**
 * 创建一个假 manager (EventEmitter)
 */
function fakeManager (overrides = {}) {
  const mgr = new EventEmitter()
  Object.assign(mgr, {
    getBots: () => [],
    startBot: () => { throw new Error('not implemented') },
    stopBot: () => { throw new Error('not implemented') },
    removeDead: () => { throw new Error('not implemented') },
    count: 0,
    ...overrides
  })
  return mgr
}

/**
 * 创建一个假 moduleLoader
 */
function fakeModuleLoader (overrides = {}) {
  return {
    listModules: () => ['echo'],
    getLoadedModules: () => [],
    loadModule: () => { throw new Error('not implemented') },
    unloadModule: () => { throw new Error('not implemented') },
    loadModules: () => { throw new Error('not implemented') },
    ...overrides
  }
}

/**
 * 临时数据库路径 (用于测试)
 */
function tempDbPath () {
  return path.join(__dirname, '..', '..', 'data', `test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)
}

module.exports = { fakeBot, fakeDatabase, fakeManager, fakeModuleLoader, tempDbPath }
