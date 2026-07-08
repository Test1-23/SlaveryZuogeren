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
    const listener = function (username, message) {
      if (username === bot.username) return
      if (message.startsWith('echo ')) {
        bot.chat(`[Echo] ${username}: ${message.slice(5)}`)
      }
    }
    bot.on('chat', listener)
    // 闭包持有 listener，unload 时通过 bot 取回
    bot._echoListener = listener
    console.log('[Echo] 模块已注入')
  },

  unload (bot) {
    if (bot._echoListener) {
      bot.removeListener('chat', bot._echoListener)
      delete bot._echoListener
    }
    console.log('[Echo] 模块已卸载')
  }
}
