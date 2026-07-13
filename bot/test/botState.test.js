/**
 * botState.snapshot() 单元测试
 */

const assert = require('assert')
const { snapshot } = require('../botState')
const { fakeBot } = require('./common')

describe('botState.snapshot()', () => {
  it('null bot → 返回空对象', () => {
    const s = snapshot(null)
    assert.strictEqual(s.health, 0)
    assert.strictEqual(s.food, 0)
    assert.strictEqual(s.username, '?')
    assert.strictEqual(s.gameMode, 'unknown')
    assert.strictEqual(s.position, null)
    assert.strictEqual(s.isAlive, false)
    assert.strictEqual(s.modules.length, 0)
  })

  it('undefined bot → 返回空对象', () => {
    const s = snapshot(undefined)
    assert.strictEqual(s.health, 0)
    assert.strictEqual(s.username, '?')
  })

  it('完整 bot → 正确提取所有属性', () => {
    const bot = fakeBot()
    const s = snapshot(bot)
    assert.strictEqual(s.username, 'TestBot')
    assert.strictEqual(s.health, 20)
    assert.strictEqual(s.food, 20)
    assert.strictEqual(s.foodSaturation, 5)
    assert.strictEqual(s.gameMode, 'survival')
    assert.strictEqual(s.dimension, 'overworld')
    assert.deepStrictEqual(s.position, { x: 100, y: 64, z: -51 })
    assert.strictEqual(s.yaw, 1.57)
    assert.strictEqual(s.pitch, 0)
    assert.strictEqual(s.isAlive, true)
    assert.strictEqual(s.isSleeping, false)
    assert.deepStrictEqual(s.modules, [{ name: 'chat', version: '1.0.0' }])
  })

  it('bot 缺少 game → 使用默认值', () => {
    const bot = fakeBot({ game: null })
    const s = snapshot(bot)
    assert.strictEqual(s.gameMode, 'unknown')
    assert.strictEqual(s.dimension, 'unknown')
  })

  it('bot 缺少 entity → position/yaw/pitch 为空', () => {
    const bot = fakeBot({ entity: null })
    const s = snapshot(bot)
    assert.strictEqual(s.position, null)
    assert.strictEqual(s.yaw, null)
    assert.strictEqual(s.pitch, null)
  })

  it('bot 缺少 moduleLoader → modules 为空数组', () => {
    const bot = fakeBot({ moduleLoader: null })
    const s = snapshot(bot)
    assert.deepStrictEqual(s.modules, [])
  })

  it('坐标四舍五入', () => {
    const bot = fakeBot({ entity: { position: { x: 100.6, y: 64.4, z: -50.5 } } })
    const s = snapshot(bot)
    assert.strictEqual(s.position.x, 101)
    assert.strictEqual(s.position.y, 64)
    assert.strictEqual(s.position.z, -50)
  })

  it('isAlive=false 正确返回', () => {
    const bot = fakeBot({ isAlive: false, health: 0 })
    const s = snapshot(bot)
    assert.strictEqual(s.isAlive, false)
    assert.strictEqual(s.health, 0)
  })

  it('moduleLoader.loaded 抛出异常 → 传播错误', () => {
    const bot = fakeBot({ moduleLoader: { loaded: () => { throw new Error('boom') } } })
    assert.throws(() => snapshot(bot), /boom/)
  })
})
