/**
 * Web API 集成测试 (supertest + mock 依赖)
 */

const assert = require('assert')
const { createServer } = require('../web/server')
const { fakeManager, fakeDatabase, fakeModuleLoader } = require('./common')

// supertest 需要 app 对象
let request
try { request = require('supertest') } catch (_) { /* 依赖未安装时跳过 */ }

describe('Web API', function () {
  let server
  let manager, database, moduleLoader

  beforeEach(() => {
    if (!request) this.skip()

    manager = fakeManager({
      getBots: () => [{ id: '1', name: 'TestBot', host: 'mc.example.com', port: 25565, status: 'online', health: 20, food: 18 }],
      startBot: async (cfg) => ({ id: '2', configId: cfg.id, name: cfg.name, status: 'connecting' }),
      stopBot: () => {},
      removeDead: () => {}
    })

    database = fakeDatabase({
      getAllConfigs: () => [{ id: 1, name: 'MyBot', host: 'localhost', port: 25565, auth: 'offline', username: 'Bot', modules: ['echo'], options: {} }],
      getConfig: (id) => id === 1 ? { id: 1, name: 'MyBot', host: 'localhost', port: 25565, version: '26.2', auth: 'offline', username: 'Bot', modules: ['echo'], options: {} } : null,
      createConfig: (cfg) => ({ id: 2, ...cfg, modules: cfg.modules || [], options: cfg.options || {} }),
      updateConfig: (id, cfg) => ({ id, name: cfg.name || 'Updated', host: cfg.host || 'localhost', port: cfg.port || 25565, auth: 'offline', username: 'Bot', modules: [], options: {} }),
      deleteConfig: () => true
    })

    moduleLoader = fakeModuleLoader({ listModules: () => ['echo', 'guard'] })

    const { app } = createServer({ manager, database, moduleLoader, port: 0 })
    server = app
  })

  // ─── Bot API ───

  it('GET /api/bots → 返回 bot 列表', async () => {
    const res = await request(server).get('/api/bots').expect(200)
    assert.strictEqual(res.body.length, 1)
    assert.strictEqual(res.body[0].name, 'TestBot')
  })

  it('POST /api/bots/start → 启动 bot', async () => {
    const res = await request(server)
      .post('/api/bots/start')
      .send({ configId: 1 })
      .expect(200)
    assert.strictEqual(res.body.configId, 1)
  })

  it('POST /api/bots/start 缺少 configId → 400', async () => {
    await request(server).post('/api/bots/start').send({}).expect(400)
  })

  it('POST /api/bots/start 不存在配置 → 404', async () => {
    await request(server).post('/api/bots/start').send({ configId: 999 }).expect(404)
  })

  it('POST /api/bots/stop/:id → 停止 bot', async () => {
    await request(server).post('/api/bots/stop/1').expect(200)
  })

  it('POST /api/bots/remove-dead/:id → 清理僵尸', async () => {
    await request(server).post('/api/bots/remove-dead/1').expect(200)
  })

  // ─── Config API ───

  it('GET /api/configs → 返回配置列表', async () => {
    const res = await request(server).get('/api/configs').expect(200)
    assert.strictEqual(res.body.length, 1)
    assert.strictEqual(res.body[0].name, 'MyBot')
  })

  it('POST /api/configs → 创建配置', async () => {
    const res = await request(server)
      .post('/api/configs')
      .send({ name: 'NewBot', host: '127.0.0.1', modules: ['guard'] })
      .expect(201)
    assert.strictEqual(res.body.name, 'NewBot')
  })

  it('PUT /api/configs/:id → 更新配置', async () => {
    const res = await request(server)
      .put('/api/configs/1')
      .send({ host: '10.0.0.1' })
      .expect(200)
    assert.strictEqual(res.body.host, '10.0.0.1')
  })

  it('DELETE /api/configs/:id → 删除配置', async () => {
    await request(server).delete('/api/configs/1').expect(200)
  })

  // ─── Module API ───

  it('GET /api/modules → 返回模块列表', async () => {
    const res = await request(server).get('/api/modules').expect(200)
    assert.deepStrictEqual(res.body, ['echo', 'guard'])
  })

  // ─── SSE ───

  it('GET /api/events → SSE 流 (初始推送)', (done) => {
    request(server)
      .get('/api/events')
      .buffer(false)
      .parse((res, cb) => {
        res.on('data', (chunk) => {
          const text = chunk.toString()
          if (text.startsWith('data: ')) {
            const data = JSON.parse(text.slice(6))
            assert.strictEqual(data.type, 'update')
            assert.ok(Array.isArray(data.bots))
            res.destroy()
            done()
          }
        })
      })
      .end(() => {})
  })

  // ─── Static files ───

  it('GET / → 返回仪表盘 HTML', async () => {
    const res = await request(server).get('/').expect(200)
    assert.ok(res.text.includes('<!DOCTYPE html>') || res.text.includes('<html'))
  })
})
