/**
 * Chat 模块 — 捕获所有聊天消息并提供发送接口
 *
 * 注入后:
 *   bot.chatMessages    — 消息历史 (最近 N 条)
 *   bot.sendChat(msg)   — 发送聊天消息 (同 bot.chat, 统一命名)
 *
 * 消息格式: { timestamp, username, message, type }
 *   type: 'player' | 'system' | 'whisper' | 'actionbar'
 */

const MAX_MESSAGES = 500

module.exports = {
  name: 'chat',
  version: '1.0.0',
  dependencies: [],

  inject (bot, options) {
    bot.chatMessages = []

    function push (msg) {
      bot.chatMessages.push(msg)
      if (bot.chatMessages.length > MAX_MESSAGES) {
        bot.chatMessages.splice(0, bot.chatMessages.length - MAX_MESSAGES)
      }
      bot.emit('chatMessage', msg)
    }

    // 玩家聊天
    bot._chat_onChat = (username, message, translate, jsonMsg, matches) => {
      push({ timestamp: Date.now(), username, message, type: 'player' })
    }

    // 系统消息
    bot._chat_onMessage = (jsonMsg, position) => {
      const text = jsonMsg?.toString?.() || jsonMsg?.text || ''
      if (text) push({ timestamp: Date.now(), username: '', message: text, type: 'system' })
    }

    // 私聊
    bot._chat_onWhisper = (username, message, translate, jsonMsg, matches) => {
      push({ timestamp: Date.now(), username, message, type: 'whisper' })
    }

    // Action bar
    bot._chat_onActionBar = (jsonMsg) => {
      const text = jsonMsg?.toString?.() || jsonMsg?.text || ''
      if (text) push({ timestamp: Date.now(), username: '', message: text, type: 'actionbar' })
    }

    // 死亡消息 (通过 messagestr 事件捕获)
    bot._chat_onMessagestr = (message, position, jsonMsg) => {
      // 只捕获 chat 位置的消息 (避免重复)
      if (position === 'chat') return
      push({ timestamp: Date.now(), username: '', message, type: 'system' })
    }

    bot.on('chat', bot._chat_onChat)
    bot.on('whisper', bot._chat_onWhisper)
    bot.on('message', bot._chat_onMessage)
    bot.on('actionBar', bot._chat_onActionBar)
    bot.on('messagestr', bot._chat_onMessagestr)

    // 发送消息的便捷方法
    bot.sendChat = (msg) => bot.chat(msg)

    console.log('[Chat] 模块已注入')
  },

  unload (bot) {
    bot.removeListener('chat', bot._chat_onChat)
    bot.removeListener('whisper', bot._chat_onWhisper)
    bot.removeListener('message', bot._chat_onMessage)
    bot.removeListener('actionBar', bot._chat_onActionBar)
    bot.removeListener('messagestr', bot._chat_onMessagestr)
    delete bot.sendChat
    delete bot.chatMessages
    console.log('[Chat] 模块已卸载')
  }
}
