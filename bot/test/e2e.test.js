/**
 * 端到端测试 — 连接真实 Minecraft 26.2 服务器
 *
 * 前提: localhost:25565 离线模式 Minecraft 26.2 服务器正在运行
 * 设置: MC_HOST 和 MC_PORT 环境变量可覆盖默认地址
 *
 * 运行: npm run test:e2e
 */

const assert = require('assert')
const { createBot } = require('../botFactory')

const HOST = process.env.MC_HOST || 'localhost'
const PORT = parseInt(process.env.MC_PORT || '25565')
const VERSION = process.env.MC_VERSION || '26.2'

describe('E2E: Real Minecraft 26.2 Server', function () {
  this.timeout(60000)

  let bot

  afterEach(() => {
    if (bot) {
      try { bot.end('test cleanup') } catch (_) { /* ignore */ }
      bot = null
    }
  })

  it('bot 连接并生成 (spawn)', (done) => {
    bot = createBot({
      host: HOST,
      port: PORT,
      version: VERSION,
      auth: 'offline',
      username: 'TestBot_' + Date.now().toString(36)
    })

    bot.once('spawn', () => {
      assert.ok(bot.entity)
      assert.strictEqual(typeof bot.health, 'number')
      assert.strictEqual(typeof bot.food, 'number')
      assert.ok(bot.game?.gameMode)
      done()
    })

    bot.on('error', (err) => {
      done(new Error(`连接失败 (服务器是否在 localhost:${PORT} 运行?): ${err.message}`))
    })
  })

  it('chat 模块捕获消息并允许发送', function (done) {
    const username = 'ChatTest_' + Date.now().toString(36)
    bot = createBot({
      host: HOST,
      port: PORT,
      version: VERSION,
      auth: 'offline',
      username,
      modules: ['chat']
    })

    bot.once('ready', () => {
      assert.ok(Array.isArray(bot.chatMessages), 'chatMessages 数组应存在')
      assert.strictEqual(typeof bot.sendChat, 'function', 'sendChat 方法应存在')
      const loaded = bot.moduleLoader.loaded()
      assert.ok(loaded.find(m => m.name === 'chat'), 'chat 模块应已加载')

      // 发送消息验证 sendChat 可用
      bot.sendChat('e2e test message')
      done()
    })

    bot.on('error', (err) => done(new Error(err.message)))
  })

  it('botState.snapshot 采集真实数据', function (done) {
    const { snapshot } = require('../botState')
    bot = createBot({
      host: HOST,
      port: PORT,
      version: VERSION,
      auth: 'offline',
      username: 'StateTest_' + Date.now().toString(36)
    })

    bot.once('spawn', () => {
      const s = snapshot(bot)
      assert.strictEqual(s.username, bot.username)
      assert.ok(s.health === 20, '健康值应为 20')
      assert.ok(s.food === 20, '饥饿值应为 20')
      assert.ok(s.gameMode === 'survival' || s.gameMode === 'creative')
      assert.ok(s.dimension === 'overworld' || s.dimension === 'the_nether' || s.dimension === 'the_end')
      assert.ok(s.position, '应有坐标')
      assert.strictEqual(typeof s.position.x, 'number')
      assert.strictEqual(typeof s.position.y, 'number')
      assert.strictEqual(typeof s.position.z, 'number')
      done()
    })

    bot.on('error', (err) => done(new Error(err.message)))
  })

  it('botFactory 默认配置可用', function (done) {
    bot = createBot({
      host: HOST,
      port: PORT,
      version: VERSION,
      auth: 'offline',
      username: 'DefaultTest_' + Date.now().toString(36)
    })

    bot.once('spawn', () => {
      assert.strictEqual(bot.username, 'DefaultTest_' + Date.now().toString(36))
      done()
    })

    bot.on('error', (err) => done(new Error(err.message)))
  })

  it('bot 断连清理模块', function (done) {
    bot = createBot({
      host: HOST,
      port: PORT,
      version: VERSION,
      auth: 'offline',
      username: 'DisconnectTest_' + Date.now().toString(36),
      modules: ['chat']
    })

    bot.once('ready', () => {
      const before = bot.moduleLoader.loaded().length
      assert.ok(before >= 1, '至少应有 chat 模块加载')

      bot.end('test disconnect')
      // end 事件 handler 会异步 unload 模块
      setTimeout(() => {
        const after = bot.moduleLoader.loaded().length
        assert.strictEqual(after, 0, '断开后所有模块应已卸载')
        done()
      }, 500)
    })

    bot.on('error', (err) => done(new Error(err.message)))
  })
})
