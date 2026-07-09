/**
 * Database CRUD 单元测试
 * 使用临时 SQLite 文件，测试完清理
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { tempDbPath } = require('./common')

let database
let dbPath

describe('Database CRUD', () => {
  beforeEach(() => {
    // 每次使用独立的临时数据库文件
    dbPath = tempDbPath()
    process.env.DB_PATH = dbPath
    // 清除缓存使 DB_PATH 生效
    delete require.cache[require.resolve('../database')]
    database = require('../database')
  })

  afterEach(() => {
    // 关闭并清理临时文件
    try { database.getDB().close() } catch (_) { /* ignore */ }
    try { fs.unlinkSync(dbPath) } catch (_) { /* ignore */ }
    try { fs.unlinkSync(dbPath + '-shm') } catch (_) { /* ignore */ }
    try { fs.unlinkSync(dbPath + '-wal') } catch (_) { /* ignore */ }
    delete process.env.DB_PATH
  })

  it('空数据库返回空数组', () => {
    assert.deepStrictEqual(database.getAllConfigs(), [])
  })

  it('createConfig → getConfig → 数据往返一致', () => {
    const c = database.createConfig({ name: 'Test', host: 'example.com', port: 25566, auth: 'microsoft', username: 'Player1', modules: ['echo'], options: { chat: 'commandsOnly' } })
    assert.strictEqual(typeof c.id, 'number')
    assert.strictEqual(c.name, 'Test')
    assert.strictEqual(c.host, 'example.com')
    assert.strictEqual(c.port, 25566)
    assert.strictEqual(c.auth, 'microsoft')
    assert.strictEqual(c.username, 'Player1')
    assert.deepStrictEqual(c.modules, ['echo'])
    assert.deepStrictEqual(c.options, { chat: 'commandsOnly' })

    const fetched = database.getConfig(c.id)
    assert.deepStrictEqual(fetched, c)
  })

  it('createConfig 默认值', () => {
    const c = database.createConfig({ name: 'DefaultBot' })
    assert.strictEqual(c.host, 'localhost')
    assert.strictEqual(c.port, 25565)
    assert.strictEqual(c.auth, 'offline')
    assert.strictEqual(c.username, 'Bot')
    assert.deepStrictEqual(c.modules, [])
    assert.deepStrictEqual(c.options, {})
  })

  it('createConfig 重复名称 → 抛异常', () => {
    database.createConfig({ name: 'Dup' })
    assert.throws(() => database.createConfig({ name: 'Dup' }), /UNIQUE/)
  })

  it('getAllConfigs 返回所有记录', () => {
    database.createConfig({ name: 'A' })
    database.createConfig({ name: 'B' })
    const all = database.getAllConfigs()
    assert.strictEqual(all.length, 2)
    // 两条记录都存在（不依赖插入时序）
    assert.ok(all.some(c => c.name === 'A'))
    assert.ok(all.some(c => c.name === 'B'))
  })

  it('getConfig 不存在 → null', () => {
    assert.strictEqual(database.getConfig(999), null)
  })

  it('updateConfig → 部分更新', () => {
    const c = database.createConfig({ name: 'Orig', host: 'old.com' })
    const u = database.updateConfig(c.id, { host: 'new.com', modules: ['guard'] })
    assert.strictEqual(u.host, 'new.com')
    assert.deepStrictEqual(u.modules, ['guard'])
    assert.strictEqual(u.name, 'Orig') // 未改动
  })

  it('updateConfig 不存在 → null', () => {
    assert.strictEqual(database.updateConfig(999, { host: 'x' }), null)
  })

  it('deleteConfig → 移除记录', () => {
    const c = database.createConfig({ name: 'DelMe' })
    assert.strictEqual(database.deleteConfig(c.id), true)
    assert.strictEqual(database.getConfig(c.id), null)
    assert.strictEqual(database.getAllConfigs().length, 0)
  })

  it('deleteConfig 不存在 → false', () => {
    assert.strictEqual(database.deleteConfig(999), false)
  })

  it('损坏的 JSON → 不崩溃，返回空默认值', () => {
    const c = database.createConfig({ name: 'CorruptTest' })
    database.getDB().prepare('UPDATE bot_configs SET modules=?, options=? WHERE id=?').run('{broken', '{also bad', c.id)
    const fetched = database.getConfig(c.id)
    assert.deepStrictEqual(fetched.modules, [])
    assert.deepStrictEqual(fetched.options, {})
  })

  it('空 JSON 字符串 → 正确解析', () => {
    const c = database.createConfig({ name: 'EmptyJSON' })
    database.getDB().prepare('UPDATE bot_configs SET modules=?, options=? WHERE id=?').run('[]', '{}', c.id)
    const fetched = database.getConfig(c.id)
    assert.deepStrictEqual(fetched.modules, [])
    assert.deepStrictEqual(fetched.options, {})
  })
})
