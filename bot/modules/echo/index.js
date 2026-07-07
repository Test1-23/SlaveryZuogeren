/**
 * 示例模块: echo
 *
 * 简单的聊天回显模块 — 当有人发送 "echo <msg>" 时，bot 回复相同内容。
 * 用作文档和测试模块接口的参考实现。
 *
 * 模块必须导出的字段:
 *   name: string          - 唯一标识名
 *   version: string       - 语义化版本
 *   dependencies: string[] - 依赖的其他模块名 (可选, 默认 [])
 *   inject(bot, options)  - 初始化函数
 *   unload(bot)           - 清理函数 (可选)
 */

module.exports = {
  name: 'echo',
  version: '1.0.0',
  dependencies: [],

  inject (bot, options) {
    // 在 bot 上注册命令
    bot.echoListener = function (username, message) {
      if (username === bot.username) return
      if (message.startsWith('echo ')) {
        const echoMsg = message.slice(5)
        bot.chat(`[Echo] ${username}: ${echoMsg}`)
      }
    }
    bot.on('chat', bot.echoListener)
    console.log('[Echo] 模块已注入')
  },

  unload (bot) {
    bot.removeListener('chat', bot.echoListener)
    delete bot.echoListener
    console.log('[Echo] 模块已卸载')
  }
}
