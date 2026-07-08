/**
 * CLI 入口 — node bot/cli.js 启动 Web 控制面板
 *
 * 用法:
 *   node bot/cli.js
 *   WEB_PORT=8080 node bot/cli.js
 */

const { startServer } = require('./index')

startServer()
  .then(() => console.log('[CLI] 控制面板已就绪'))
  .catch(err => { console.error('[CLI] 启动失败:', err.message); process.exit(1) })
