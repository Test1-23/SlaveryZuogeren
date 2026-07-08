/**
 * Bot 默认配置 — 扁平结构，与数据库 schema 一致
 * 所有值可通过环境变量覆盖
 */

module.exports = {
  host: process.env.MC_HOST || 'localhost',
  port: parseInt(process.env.MC_PORT) || 25565,
  version: process.env.MC_VERSION || '',
  auth: process.env.MC_AUTH || 'offline',
  username: process.env.MC_USERNAME || 'Bot',
  brand: 'vanilla',
  modules: [],
  options: {
    hideErrors: false,
    logErrors: true,
    physicsEnabled: true,
    chat: 'enabled',
    viewDistance: 'far',
    respawn: true,
    loadInternalPlugins: true
  }
}
