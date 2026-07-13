/**
 * 系统设置路由
 */

const { Router } = require('express')
const systemConfig = require('../../systemConfig')

function mount (app) {
  const r = Router()

  r.get('/', (_req, res) => {
    res.json(systemConfig.getAll())
  })

  r.put('/', (req, res) => {
    try {
      const updated = systemConfig.update(req.body)
      res.json(updated)
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  app.use('/api/settings', r)
}

module.exports = { mount }
