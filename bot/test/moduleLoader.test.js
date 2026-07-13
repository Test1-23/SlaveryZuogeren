/**
 * ModuleLoader 集成测试
 * 使用真实的 chat 模块文件，fake bot (EventEmitter)
 */

const assert = require('assert')
const { fakeBot } = require('./common')

function clearModuleCache () {
  delete require.cache[require.resolve('../moduleLoader')]
  delete require.cache[require.resolve('../modules/chat/index.js')]
}

describe('moduleLoader', () => {
  let moduleLoader

  beforeEach(() => { clearModuleCache(); moduleLoader = require('../moduleLoader') })
  afterEach(() => { clearModuleCache() })

  it('listModules → 返回可用模块 (chat)', () => {
    const mods = moduleLoader.listModules()
    assert.ok(mods.includes('chat'))
    assert.ok(mods.length >= 1)
  })

  it('loadModule + unloadModule → 完整生命周期', async () => {
    const bot = fakeBot()
    const meta = await moduleLoader.loadModule(bot, 'chat')
    assert.strictEqual(meta.name, 'chat')
    assert.strictEqual(meta.version, '1.0.0')
    assert.strictEqual(moduleLoader.getLoadedModules(bot).length, 1)
    assert.ok(Array.isArray(bot.chatMessages))
    assert.strictEqual(typeof bot.sendChat, 'function')

    await moduleLoader.unloadModule(bot, 'chat')
    assert.strictEqual(moduleLoader.getLoadedModules(bot).length, 0)
    assert.strictEqual(bot.chatMessages, undefined)
    assert.strictEqual(bot.sendChat, undefined)
  })

  it('loadModule 已加载 → 不重复注册', async () => {
    const bot = fakeBot()
    await moduleLoader.loadModule(bot, 'chat')
    await moduleLoader.loadModule(bot, 'chat')
    assert.strictEqual(moduleLoader.getLoadedModules(bot).length, 1)
  })

  it('loadModule 不存在 → 抛异常', async () => {
    await assert.rejects(() => moduleLoader.loadModule(fakeBot(), 'nonexistent_mod_xyz'), /不存在/)
  })

  it('loadModules 批量加载', async () => {
    const bot = fakeBot()
    await moduleLoader.loadModules(bot, ['chat'])
    assert.strictEqual(moduleLoader.getLoadedModules(bot).length, 1)
  })

  it('loadModules 部分失败不中断其余', async () => {
    const bot = fakeBot()
    await moduleLoader.loadModules(bot, ['chat', 'nonexistent'])
    assert.strictEqual(moduleLoader.getLoadedModules(bot).length, 1)
  })

  it('unloadModule 未加载 → 不抛异常', async () => {
    await assert.doesNotReject(() => moduleLoader.unloadModule(fakeBot(), 'ghost'))
  })

  it('chat 模块: 捕获 player 消息', async () => {
    const bot = fakeBot()
    await moduleLoader.loadModule(bot, 'chat')
    bot.emit('chat', 'Steve', 'hello', null, {}, null)
    assert.strictEqual(bot.chatMessages.length, 1)
    assert.strictEqual(bot.chatMessages[0].username, 'Steve')
    assert.strictEqual(bot.chatMessages[0].message, 'hello')
    assert.strictEqual(bot.chatMessages[0].type, 'player')
    await moduleLoader.unloadModule(bot, 'chat')
  })

  it('chat 模块: 捕获 whisper 消息', async () => {
    const bot = fakeBot()
    await moduleLoader.loadModule(bot, 'chat')
    bot.emit('whisper', 'Admin', 'secret', null, {}, null)
    assert.strictEqual(bot.chatMessages[0].type, 'whisper')
    await moduleLoader.unloadModule(bot, 'chat')
  })

  it('chat 模块: 限制最大消息数', async () => {
    const bot = fakeBot()
    await moduleLoader.loadModule(bot, 'chat')
    for (let i = 0; i < 600; i++) bot.emit('chat', 'Spammer', `msg${i}`, null, {}, null)
    assert.ok(bot.chatMessages.length <= 500)
    assert.strictEqual(bot.chatMessages[bot.chatMessages.length - 1].message, 'msg599')
    await moduleLoader.unloadModule(bot, 'chat')
  })

  it('chat 模块: sendChat 调用 bot.chat', async () => {
    const bot = fakeBot()
    let chatCalled = ''
    bot.chat = (m) => { chatCalled = m }
    await moduleLoader.loadModule(bot, 'chat')
    bot.sendChat('test message')
    assert.strictEqual(chatCalled, 'test message')
    await moduleLoader.unloadModule(bot, 'chat')
  })

  it('chat 模块: unload 后不再捕获', async () => {
    const bot = fakeBot()
    await moduleLoader.loadModule(bot, 'chat')
    await moduleLoader.unloadModule(bot, 'chat')
    bot.emit('chat', 'Steve', 'hello', null, {}, null)
    assert.strictEqual(bot.chatMessages, undefined)
  })
})
