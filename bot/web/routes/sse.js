/**
 * SSE 实时推送路由
 */

function mount (app, { manager }) {
  app.get('/api/events', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)
    let pending = false
    const onUpdate = () => {
      if (pending) return
      pending = true
      setImmediate(() => { pending = false; send({ type: 'update', bots: manager.getBots() }) })
    }
    manager.on('update', onUpdate)
    send({ type: 'update', bots: manager.getBots() })
    req.on('close', () => manager.off('update', onUpdate))
  })
}

module.exports = { mount }
