/**
 * CLI 入口 — node bot/cli.js 启动 Web 控制面板
 *
 * 用法:
 *   node bot/cli.js
 *   WEB_PORT=8080 node bot/cli.js
 */

const log = require('./logger').createLogger('CLI')
const { startServer } = require('./index')

startServer()
  .then(() => log.info('控制面板已就绪'))
  .catch(err => { log.error('启动失败:', err.message); process.exit(1) })
