/**
 * Bot 配置文件
 * 所有可配置项集中管理，可通过环境变量覆盖
 */

module.exports = {
  // 服务器连接配置
  server: {
    host: process.env.MC_HOST || 'localhost',
    port: parseInt(process.env.MC_PORT) || 25565,
    version: process.env.MC_VERSION || false, // false = 自动检测
    auth: process.env.MC_AUTH || 'offline' // 'microsoft' | 'offline'
  },

  // Bot 身份
  bot: {
    username: process.env.MC_USERNAME || 'Bot',
    brand: 'vanilla'
  },

  // 行为选项
  options: {
    hideErrors: false,
    logErrors: true,
    physicsEnabled: true,
    chat: 'enabled', // 'enabled' | 'commandsOnly' | 'disabled'
    viewDistance: 'far', // 'far' | 'normal' | 'short' | 'tiny'
    respawn: true, // 死亡后自动重生
    loadInternalPlugins: true // 是否加载 mineflayer 内置插件
  },

  // 要加载的模块列表 (modules/ 目录下的文件夹名)
  modules: [
    // 'pathfinder',  // 示例：后续添加
    // 'attack',      // 示例：后续添加
    // 'guard',       // 示例：后续添加
    // 'autoEat'      // 示例：后续添加
  ]
}
