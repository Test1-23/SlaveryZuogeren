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
      const entry = await manager.startBot(config)
      res.json(manager.getBots().find(b => b.id === entry.id) || entry)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  r.post('/stop/:id', (req, res) => {
    try { manager.stopBot(req.params.id); res.json({ success: true }) } catch (e) { res.status(404).json({ error: e.message }) }
  })

  r.post('/remove-dead/:id', (req, res) => {
    try { manager.removeDead(req.params.id); res.json({ success: true }) } catch (e) { res.status(400).json({ error: e.message }) }
  })

  // ── Chat ──

  r.get('/:id/chat', (req, res) => {
    const bot = manager.getBot(req.params.id)
    if (!bot) return res.status(404).json({ error: 'Bot 不存在' })
    const msgs = bot.chatMessages || []
    res.json(msgs)
  })

  r.post('/:id/chat', (req, res) => {
    const bot = manager.getBot(req.params.id)
    if (!bot) return res.status(404).json({ error: 'Bot 不存在' })
    const { message } = req.body
    if (!message) return res.status(400).json({ error: '消息不能为空' })
    if (typeof bot.sendChat !== 'function') return res.status(400).json({ error: 'Chat 模块未加载' })
    bot.sendChat(message)
    res.json({ success: true })
  })

  app.use('/api/bots', r)
}

module.exports = { mount }
