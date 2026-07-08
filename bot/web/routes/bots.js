/**
 * Bot 管理路由
 */

const { Router } = require('express')

function mount (app, { manager, database }) {
  const r = Router()

  r.get('/', (_req, res) => res.json(manager.getBots()))

  r.post('/start', async (req, res) => {
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

  r.post('/stop/:id', (req, res) => {
    try { manager.stopBot(req.params.id); res.json({ success: true }) } catch (e) { res.status(404).json({ error: e.message }) }
  })

  app.use('/api/bots', r)
}

module.exports = { mount }
