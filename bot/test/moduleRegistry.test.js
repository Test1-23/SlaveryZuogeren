/**
 * ModuleRegistry 单元测试
 */

const assert = require('assert')
const { ModuleRegistry } = require('../moduleRegistry')

describe('ModuleRegistry', () => {
  let reg

  beforeEach(() => { reg = new ModuleRegistry('/test/modules') })

  it('初始状态为空', () => {
    assert.strictEqual(reg.count, 0)
    assert.deepStrictEqual(reg.list(), [])
    assert.deepStrictEqual(reg.loaded, [])
    assert.deepStrictEqual(reg.entries(), [])
  })

  it('register → has/get/loaded/count 正确反映', () => {
    reg.register({ name: 'chat', version: '1.0.0', dependencies: [] })
    assert.strictEqual(reg.count, 1)
    assert.strictEqual(reg.has('chat'), true)
    assert.strictEqual(reg.has('nonexistent'), false)
    assert.deepStrictEqual(reg.list(), ['chat'])
    assert.deepStrictEqual(reg.loaded, [{ name: 'chat', version: '1.0.0' }])
    assert.strictEqual(reg.get('chat').version, '1.0.0')
    assert.strictEqual(reg.get('nonexistent'), null)
  })

  it('重复 register 返回 false，不覆盖', () => {
    reg.register({ name: 'chat', version: '1.0.0', dependencies: [] })
    const ok = reg.register({ name: 'chat', version: '2.0.0', dependencies: ['a'] })
    assert.strictEqual(ok, false)
    assert.strictEqual(reg.count, 1)
    assert.strictEqual(reg.get('chat').version, '1.0.0')
  })

  it('unregister 移除模块', () => {
    reg.register({ name: 'chat', version: '1.0.0', dependencies: [] })
    reg.unregister('chat')
    assert.strictEqual(reg.count, 0)
    assert.strictEqual(reg.has('chat'), false)
  })

  it('unregister 不存在的不抛异常', () => {
    assert.doesNotThrow(() => reg.unregister('ghost'))
    assert.strictEqual(reg.count, 0)
  })

  it('list() 返回副本，外部修改不影响内部', () => {
    reg.register({ name: 'a', version: '1', dependencies: [] })
    const list = reg.list()
    list.push('b')
    assert.strictEqual(reg.count, 1)
    assert.deepStrictEqual(reg.list(), ['a'])
  })

  it('entries() 返回数组副本 (对象引用共享)', () => {
    reg.register({ name: 'a', version: '1', dependencies: [] })
    const entries = reg.entries()
    assert.strictEqual(entries.length, 1)
    assert.strictEqual(entries[0][0], 'a')
    assert.strictEqual(entries[0][1].version, '1')
    // 修改返回数组不影响内部 order
    entries.pop()
    assert.strictEqual(reg.count, 1)
  })

  it('loaded getter 对不一致状态返回占位版本', () => {
    // 模拟内部状态不一致（order 中有 name 但 _loaded 中没有）
    reg._order.push('orphan')
    const loaded = reg.loaded
    assert.strictEqual(loaded.length, 1)
    assert.strictEqual(loaded[0].name, 'orphan')
    assert.strictEqual(loaded[0].version, '?')
  })

  it('多模块 register/unregister 顺序管理', () => {
    reg.register({ name: 'b', version: '2', dependencies: [] })
    reg.register({ name: 'a', version: '1', dependencies: [] })
    reg.register({ name: 'c', version: '3', dependencies: [] })
    assert.deepStrictEqual(reg.list(), ['b', 'a', 'c'])
    reg.unregister('a')
    assert.deepStrictEqual(reg.list(), ['b', 'c'])
    assert.strictEqual(reg.count, 2)
  })
})
