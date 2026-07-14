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

  // 系统资源
  app.get('/api/system', (_req, res) => {
    const mem = process.memoryUsage()
    const cpu = process.cpuUsage()
    const uptime = process.uptime()
    res.json({
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),           // MB
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024) // MB
      },
      cpu: {
        user: Math.round(cpu.user / 1000),   // ms
        system: Math.round(cpu.system / 1000) // ms
      },
      uptime: Math.round(uptime),
      pid: process.pid
    })
  })
}

module.exports = { mount }
