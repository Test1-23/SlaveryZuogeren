/**
 * Web 服务器 — 装配路由并启动 Express
 *
 * 依赖注入: createServer({ manager, database, moduleLoader, port? })
 */

const express = require('express')
const path = require('path')
const bots = require('./routes/bots')
const configs = require('./routes/configs')
const modules = require('./routes/modules')
const sse = require('./routes/sse')

function createServer ({ manager, database, moduleLoader, port = 3000 }) {
  const app = express()
  app.use(express.json())
  app.use(express.static(path.join(__dirname, 'public')))

  // 装配路由
  const deps = { manager, database, moduleLoader }
  bots.mount(app, deps)
  configs.mount(app, deps)
  modules.mount(app, deps)
  sse.mount(app, deps)

  function start () {
    return new Promise(resolve => app.listen(port, () => { console.log(`[Web] http://localhost:${port}`); resolve() }))
  }

  return { app, start }
}

module.exports = { createServer }
