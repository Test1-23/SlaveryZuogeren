/**
 * Web 服务器 — 提供仪表盘和控制面板
 *
 * 依赖注入: createServer({ manager, database, moduleLoader, port? })
 *
 * REST API:
 *   GET/POST /api/bots, /api/configs (CRUD), /api/modules, /api/events (SSE)
 */

const express = require('express')
const path = require('path')

function createServer ({ manager, database, moduleLoader, port = 3000 }) {
  const app = express()
  app.use(express.json())
  app.use(express.static(path.join(__dirname, 'public')))

  // ── Bot 状态 ──

  app.get('/api/bots', (_req, res) => res.json(manager.getBots()))

  app.post('/api/bots/start', async (req, res) => {
    try {
      const { configId } = req.body
      if (!configId) return res.status(400).json({ error: '缺少 configId' })
      const config = database.getConfig(Number(configId))
      if (!config) return res.status(404).json({ error: `配置 ${configId} 不存在` })
      const dup = manager.getBots().find(b => b.configId === Number(configId) && (b.status === 'online' || b.status === 'connecting'))
      if (dup) return res.status(409).json({ error: `已在运行中 (${dup.id})` })
      res.json(await manager.startBot(config))
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/bots/stop/:id', (req, res) => {
    try { manager.stopBot(req.params.id); res.json({ success: true }) } catch (e) { res.status(404).json({ error: e.message }) }
  })

  // ── 配置 CRUD ──

  app.get('/api/configs', (_req, res) => res.json(database.getAllConfigs()))
  app.post('/api/configs', (req, res) => {
    try { res.status(201).json(database.createConfig(req.body)) } catch (e) { res.status(400).json({ error: e.message }) }
  })
  app.put('/api/configs/:id', (req, res) => {
    const r = database.updateConfig(Number(req.params.id), req.body)
    if (!r) return res.status(404).json({ error: '配置不存在' })
    res.json(r)
  })
  app.delete('/api/configs/:id', (req, res) => {
    const ok = database.deleteConfig(Number(req.params.id))
    if (!ok) return res.status(404).json({ error: '配置不存在' })
    res.json({ success: true })
  })

  // ── 模块列表 ──

  app.get('/api/modules', (_req, res) => res.json(moduleLoader.listModules()))

  // ── SSE ──

  app.get('/api/events', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)
    const onUpdate = () => send({ type: 'update', bots: manager.getBots() })
    manager.on('update', onUpdate)
    onUpdate()
    req.on('close', () => manager.off('update', onUpdate))
  })

  // ── 启动 ──

  function start () {
    return new Promise(resolve => app.listen(port, () => { console.log(`[Web] http://localhost:${port}`); resolve() }))
  }

  return { app, start }
}

module.exports = { createServer }
