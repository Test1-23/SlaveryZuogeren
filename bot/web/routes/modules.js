/**
 * 模块列表路由
 */

const { Router } = require('express')

function mount (app, { moduleLoader }) {
  const r = Router()
  r.get('/', (_req, res) => res.json(moduleLoader.listModules()))
  app.use('/api/modules', r)
}

module.exports = { mount }
