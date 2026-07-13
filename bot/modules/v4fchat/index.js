/**
 * v4fchat 模块 — DeepSeek V4 Flash 自动聊天回复
 *
 * 依赖 chat 模块（自动加载）。
 * API Key 通过 Web UI 设置 → 持久化到 data/systemConfig.json。
 *
 * 注入后监听 chatMessage 事件，调用 DeepSeek API 生成回复。
 */

const https = require('https')

module.exports = {
  name: 'v4fchat',
  version: '1.0.0',
  dependencies: ['chat'],

  inject (bot, options) {
    const systemConfig = require('../../systemConfig')

    bot._v4fchat_onMsg = async (msg) => {
      // 忽略系统消息、actionBar 和 bot 自己的消息
      if (msg.type !== 'player' && msg.type !== 'whisper') return
      if (msg.username === bot.username) return

      const apiKey = systemConfig.get('deepseekApiKey')
      if (!apiKey) return // 未配置 API Key 时静默

      const model = systemConfig.get('deepseekModel') || 'deepseek-v4-flash'

      try {
        const reply = await _callDeepSeek(apiKey, model, msg.username, msg.message)
        if (reply) bot.sendChat(reply)
      } catch (err) {
        console.error('[v4fchat] API 调用失败:', err.message)
      }
    }

    bot.on('chatMessage', bot._v4fchat_onMsg)
    console.log('[v4fchat] 模块已注入 (依赖 chat)')
  },

  unload (bot) {
    bot.removeListener('chatMessage', bot._v4fchat_onMsg)
    delete bot._v4fchat_onMsg
    console.log('[v4fchat] 模块已卸载')
  }
}

/**
 * 调用 DeepSeek API (OpenAI 兼容接口)
 */
function _callDeepSeek (apiKey, model, username, message) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: `你是一个 Minecraft 机器人。玩家们在游戏内聊天，你用中文简短回复（1-2句话）。你的名字是 Bot。说话风格像普通玩家。` },
        { role: 'user', content: `${username}: ${message}` }
      ],
      max_tokens: 200,
      temperature: 0.8
    })

    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 15000
    }, (res) => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          const text = json.choices?.[0]?.message?.content
          resolve(text?.trim() || null)
        } catch (e) {
          reject(new Error('解析 API 响应失败'))
        }
      })
    })

    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('API 超时')) })
    req.write(body)
    req.end()
  })
}
