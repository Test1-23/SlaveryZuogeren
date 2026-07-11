/**
 * 配置 CRUD 路由
 */

const { Router } = require('express')

function mount (app, { database }) {
  const r = Router()

  r.get('/', (_req, res) => res.json(database.getAllConfigs()))

  r.get('/:id', (req, res) => {
    const cfg = database.getConfig(Number(req.params.id))
    if (!cfg) return res.status(404).json({ error: '配置不存在' })
    res.json(cfg)
  })

  r.post('/', (req, res) => {
    try { res.status(201).json(database.createConfig(req.body)) } catch (e) { res.status(400).json({ error: e.message }) }
  })

  r.put('/:id', (req, res) => {
    const cfg = database.updateConfig(Number(req.params.id), req.body)
    if (!cfg) return res.status(404).json({ error: '配置不存在' })
    res.json(cfg)
  })

  r.delete('/:id', (req, res) => {
    const ok = database.deleteConfig(Number(req.params.id))
    if (!ok) return res.status(404).json({ error: '配置不存在' })
    res.json({ success: true })
  })

  app.use('/api/configs', r)
}

module.exports = { mount }
