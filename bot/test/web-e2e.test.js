/**
 * Web + Bot 联合端到端测试
 *
 * 启动 Web 服务器 → 通过 API 创建配置 → 启动 bot → 验证仪表盘
 * 前提: localhost:25565 离线模式 Minecraft 26.2 服务器正在运行
 */

const assert = require('assert')
const { createBot } = require('../botFactory')
const { BotManager } = require('../manager')
const database = require('../database')
const moduleLoader = require('../moduleLoader')
const { createServer } = require('../web/server')

const HOST = process.env.MC_HOST || 'localhost'
const PORT = parseInt(process.env.MC_PORT || '25565')
const VERSION = process.env.MC_VERSION || '26.2'

let request
try { request = require('supertest') } catch (_) { /* 依赖未安装 */ }

describe('Web + Bot E2E', function () {
  this.timeout(60000)

  let server
  let manager

  before(() => {
    if (!request) this.skip()
  })

  beforeEach(() => {
    manager = new BotManager({ createBot })
    const result = createServer({ manager, database, moduleLoader, port: 0 })
    server = result.app
  })

  afterEach(() => {
    // 停止所有 bot
    for (const bot of manager.getBots()) {
      try { manager.stopBot(bot.id) } catch (_) { /* ignore */ }
    }
  })

  it('配置 CRUD 完整流程', async () => {
    // 创建
    const createRes = await request(server)
      .post('/api/configs')
      .send({ name: 'E2E_Test', host: HOST, port: PORT, version: VERSION, auth: 'offline', username: 'E2E_Web_' + Date.now().toString(36), modules: ['echo'] })
      .expect(201)
    const configId = createRes.body.id
    assert.ok(configId > 0)

    // 读取
    const getRes = await request(server).get('/api/configs').expect(200)
    assert.ok(getRes.body.find(c => c.id === configId))

    // 更新
    const updateRes = await request(server)
      .put(`/api/configs/${configId}`)
      .send({ host: '127.0.0.1' })
      .expect(200)
    assert.strictEqual(updateRes.body.host, '127.0.0.1')

    // 删除
    await request(server).delete(`/api/configs/${configId}`).expect(200)
  })

  it('通过 API 启动 bot 并查看仪表盘', async function () {
    // 创建配置
    const cfg = await request(server)
      .post('/api/configs')
      .send({ name: 'DashBot', host: HOST, port: PORT, version: VERSION, auth: 'offline', username: 'Dash_' + Date.now().toString(36) })
      .expect(201)

    // 启动 bot
    const startRes = await request(server)
      .post('/api/bots/start')
      .send({ configId: cfg.body.id })
      .expect(200)

    assert.ok(startRes.body.id)

    // 等待 bot 上线
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('bot 上线超时')), 30000)
      const check = setInterval(() => {
        const bots = manager.getBots()
        if (bots.length > 0 && bots[0].status === 'online') {
          clearInterval(check)
          clearTimeout(timeout)
          resolve()
        }
      }, 500)
    })

    // 验证仪表盘 API
    const botsRes = await request(server).get('/api/bots').expect(200)
    assert.strictEqual(botsRes.body.length, 1)
    assert.strictEqual(botsRes.body[0].status, 'online')
    assert.ok(botsRes.body[0].health > 0, '健康值应大于 0')
    assert.ok(botsRes.body[0].position, '应有坐标')
    assert.strictEqual(botsRes.body[0].gameMode, 'survival')

    // 停止 bot
    await request(server).post(`/api/bots/stop/${startRes.body.id}`).expect(200)
  })
})
