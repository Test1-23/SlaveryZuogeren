/**
 * ModuleLoader 集成测试
 * 使用真实的 echo 模块文件，但用 fake bot (EventEmitter)
 */

const assert = require('assert')
const path = require('path')
const { fakeBot } = require('./common')

// 清除缓存确保每次测试独立
function clearModuleCache () {
  delete require.cache[require.resolve('../moduleLoader')]
  delete require.cache[require.resolve('../modules/echo/index.js')]
}

describe('moduleLoader', () => {
  let moduleLoader

  beforeEach(() => {
    clearModuleCache()
    moduleLoader = require('../moduleLoader')
  })

  afterEach(() => {
    clearModuleCache()
  })

  it('listModules → 返回可用模块 (echo)', () => {
    const mods = moduleLoader.listModules()
    assert.ok(mods.includes('echo'))
    assert.ok(mods.length >= 1)
  })

  it('loadModule + unloadModule → 完整生命周期', async () => {
    const bot = fakeBot()
    const meta = await moduleLoader.loadModule(bot, 'echo')
    assert.strictEqual(meta.name, 'echo')
    assert.strictEqual(meta.version, '1.0.0')

    // 验证已注册
    const loaded = moduleLoader.getLoadedModules(bot)
    assert.strictEqual(loaded.length, 1)
    assert.strictEqual(loaded[0].name, 'echo')

    // 验证 listener 注入
    assert.strictEqual(typeof bot._echoListener, 'function')

    await moduleLoader.unloadModule(bot, 'echo')
    assert.strictEqual(moduleLoader.getLoadedModules(bot).length, 0)
    assert.strictEqual(bot._echoListener, undefined)
  })

  it('loadModule 已加载 → 返回已有 meta，不重复注册', async () => {
    const bot = fakeBot()
    await moduleLoader.loadModule(bot, 'echo')
    const meta2 = await moduleLoader.loadModule(bot, 'echo') // 二次加载
    assert.strictEqual(meta2.name, 'echo')
    assert.strictEqual(moduleLoader.getLoadedModules(bot).length, 1) // 仍为1
  })

  it('loadModule 不存在模块 → 抛异常', async () => {
    const bot = fakeBot()
    await assert.rejects(() => moduleLoader.loadModule(bot, 'nonexistent_mod_xyz'), /不存在/)
  })

  it('loadModules 批量加载 → 全部成功', async () => {
    const bot = fakeBot()
    await moduleLoader.loadModules(bot, ['echo'])
    assert.strictEqual(moduleLoader.getLoadedModules(bot).length, 1)
  })

  it('loadModules 部分失败不中断其余', async () => {
    const bot = fakeBot()
    await moduleLoader.loadModules(bot, ['echo', 'nonexistent', 'echo']) // 第二个失败
    assert.strictEqual(moduleLoader.getLoadedModules(bot).length, 1)
  })

  it('unloadModule 未加载 → 不抛异常', async () => {
    const bot = fakeBot()
    await assert.doesNotReject(() => moduleLoader.unloadModule(bot, 'ghost'))
  })

  it('echo 模块功能: chat 消息匹配', async () => {
    const bot = fakeBot()
    await moduleLoader.loadModule(bot, 'echo')

    // 模拟收到聊天
    let chatMsg = null
    bot.chat = (msg) => { chatMsg = msg }
    bot.emit('chat', 'OtherPlayer', 'echo hello world', null, {}, null)

    assert.strictEqual(chatMsg, '[Echo] OtherPlayer: hello world')

    await moduleLoader.unloadModule(bot, 'echo')
  })

  it('echo 模块: 忽略自身消息', async () => {
    const bot = fakeBot()
    await moduleLoader.loadModule(bot, 'echo')

    let chatMsg = null
    bot.chat = (msg) => { chatMsg = msg }
    bot.emit('chat', 'TestBot', 'echo self test', null, {}, null) // username === bot.username

    assert.strictEqual(chatMsg, null) // 不应该回显

    await moduleLoader.unloadModule(bot, 'echo')
  })

  it('echo 模块: 忽略非 echo 消息', async () => {
    const bot = fakeBot()
    await moduleLoader.loadModule(bot, 'echo')

    let chatMsg = null
    bot.chat = (msg) => { chatMsg = msg }
    bot.emit('chat', 'Player', 'hello there', null, {}, null)

    assert.strictEqual(chatMsg, null)

    await moduleLoader.unloadModule(bot, 'echo')
  })

  it('echo 模块: unload 后不再响应', async () => {
    const bot = fakeBot()
    await moduleLoader.loadModule(bot, 'echo')
    await moduleLoader.unloadModule(bot, 'echo')

    let chatMsg = null
    bot.chat = (msg) => { chatMsg = msg }
    bot.emit('chat', 'Player', 'echo test', null, {}, null)

    assert.strictEqual(chatMsg, null)
  })
})
