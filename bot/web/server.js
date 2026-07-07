/**
 * Web 服务器 — 提供仪表盘和控制面板
 *
 * REST API:
 *   GET  /api/bots         - 所有运行中的 bot 状态
 *   POST /api/bots/start   - 启动 bot (body: { configId })
 *   POST /api/bots/stop/:id - 停止 bot
 *
 *   GET  /api/configs       - 所有配置
 *   POST /api/configs       - 创建配置
 *   PUT  /api/configs/:id   - 更新配置
 *   DELETE /api/configs/:id  - 删除配置
 *
 *   GET  /api/modules       - 可用模块列表
 */

const express = require('express')
const path = require('path')
const database = require('../database')
const manager = require('../manager')
const moduleLoader = require('../moduleLoader')

const app = express()
const PORT = process.env.WEB_PORT || 3000

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

// ========== Bot 状态 API ==========

app.get('/api/bots', (_req, res) => {
  res.json(manager.getBots())
})

app.post('/api/bots/start', async (req, res) => {
  try {
    const { configId } = req.body
    if (!configId) return res.status(400).json({ error: '缺少 configId' })

    const config = database.getConfig(Number(configId))
    if (!config) return res.status(404).json({ error: `配置 ${configId} 不存在` })

    // 检查是否已运行
    const existing = manager.getBots().find(b => b.configId === Number(configId) && (b.status === 'online' || b.status === 'connecting'))
    if (existing) return res.status(409).json({ error: `配置 "${config.name}" 已在运行中 (${existing.id})` })

    const entry = await manager.startBot(config)
    res.json(entry)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/bots/stop/:id', (req, res) => {
  try {
    manager.stopBot(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

// ========== 配置 CRUD API ==========

app.get('/api/configs', (_req, res) => {
  res.json(database.getAllConfigs())
})

app.post('/api/configs', (req, res) => {
  try {
    const cfg = database.createConfig(req.body)
    res.status(201).json(cfg)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/configs/:id', (req, res) => {
  const cfg = database.updateConfig(Number(req.params.id), req.body)
  if (!cfg) return res.status(404).json({ error: '配置不存在' })
  res.json(cfg)
})

app.delete('/api/configs/:id', (req, res) => {
  const ok = database.deleteConfig(Number(req.params.id))
  if (!ok) return res.status(404).json({ error: '配置不存在' })
  res.json({ success: true })
})

// ========== 模块列表 ==========

app.get('/api/modules', (_req, res) => {
  res.json(moduleLoader.listModules())
})

// ========== SSE 推送 (实时更新) ==========

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  const onUpdate = () => send({ type: 'update', bots: manager.getBots() })
  manager.on('update', onUpdate)

  // 初始推送
  onUpdate()

  req.on('close', () => {
    manager.off('update', onUpdate)
  })
})

// ========== 启动 ==========

function start () {
  return new Promise((resolve) => {
    app.listen(PORT, () => {
      console.log(`[Web] 控制面板已启动: http://localhost:${PORT}`)
      resolve()
    })
  })
}

module.exports = { app, start, PORT }
